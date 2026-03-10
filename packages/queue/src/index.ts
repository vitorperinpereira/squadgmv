import { randomUUID } from "node:crypto";
import {
  PgBoss,
  type JobWithMetadata,
  type Queue as PgBossQueue,
  type WorkOptions
} from "pg-boss";

export type QueueJobContext<T = unknown> = {
  id: string;
  name: string;
  data: T;
  attempt: number;
  retryCount: number;
  retryLimit: number;
  deadLetterQueue?: string | null;
};

export type QueueHandler<T = unknown> = (
  job: QueueJobContext<T>
) => Promise<void>;

export interface QueueRegistrationOptions {
  retryLimit?: number;
  retryDelay?: number;
  retryBackoff?: boolean;
  retryDelayMax?: number;
  expireInSeconds?: number;
  deleteAfterSeconds?: number;
  retentionSeconds?: number;
  heartbeatSeconds?: number;
  deadLetter?: string;
  workerOptions?: WorkOptions;
}

export interface QueuePublishResult {
  jobId: string;
  queueName: string;
}

export interface QueueSnapshot {
  name: string;
  deadLetter?: string | null;
  retryLimit?: number;
  queuedCount: number;
  activeCount: number;
  deferredCount: number;
  totalCount: number;
}

export interface QueueFailedJob {
  id: string;
  queueName: string;
  sourceQueueName?: string;
  state: string;
  payload: unknown;
  retryCount: number;
  retryLimit: number;
  attempt: number;
  deadLetterQueue?: string | null;
  errorSummary?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface QueueDriver {
  driverName: "inline" | "pg-boss";
  start(): Promise<void>;
  stop(): Promise<void>;
  publish<T extends object>(
    jobName: string,
    payload: T
  ): Promise<QueuePublishResult>;
  register<T>(
    jobName: string,
    handler: QueueHandler<T> | null,
    options?: QueueRegistrationOptions
  ): Promise<void>;
  getStats(): Promise<{
    driverName: QueueDriver["driverName"];
    queues: QueueSnapshot[];
  }>;
  listFailed(jobName?: string): Promise<QueueFailedJob[]>;
  retry(jobName: string, jobId: string | string[]): Promise<{
    retried: number;
  }>;
}

export interface PgBossConnectionOptions {
  connectionString: string;
  ssl?: unknown;
}

type QueueDefinition = {
  name: string;
  handler: QueueHandler<unknown> | null;
  options: QueueRegistrationOptions;
  workerId?: string;
};

type InlineJobRecord = {
  id: string;
  queueName: string;
  sourceQueueName?: string;
  state: "created" | "retry" | "active" | "completed" | "failed";
  payload: unknown;
  retryCount: number;
  retryLimit: number;
  attempt: number;
  deadLetterQueue?: string | null;
  errorSummary?: string | null;
  createdAt: string;
  updatedAt: string;
};

export class InlineQueueDriver implements QueueDriver {
  public readonly driverName = "inline" as const;
  private readonly definitions = new Map<string, QueueDefinition>();
  private readonly jobs = new Map<string, InlineJobRecord>();

  async start(): Promise<void> {}

  async stop(): Promise<void> {}

  async publish<T extends object>(
    jobName: string,
    payload: T
  ): Promise<QueuePublishResult> {
    const definition = this.definitions.get(jobName);
    const jobId = randomUUID();
    const now = new Date().toISOString();
    const job: InlineJobRecord = {
      id: jobId,
      queueName: jobName,
      state: "created",
      payload,
      retryCount: 0,
      retryLimit: definition?.options.retryLimit ?? 0,
      attempt: 1,
      deadLetterQueue: definition?.options.deadLetter ?? null,
      errorSummary: null,
      createdAt: now,
      updatedAt: now
    };

    this.jobs.set(jobId, job);

    if (definition?.handler) {
      await this.executeInlineJob(definition, job, 1);
    }

    return {
      jobId,
      queueName: jobName
    };
  }

  async register<T>(
    jobName: string,
    handler: QueueHandler<T> | null,
    options?: QueueRegistrationOptions
  ): Promise<void> {
    this.definitions.set(jobName, {
      name: jobName,
      handler: handler as QueueHandler<unknown> | null,
      options: options ?? {}
    });
  }

  async getStats(): Promise<{
    driverName: QueueDriver["driverName"];
    queues: QueueSnapshot[];
  }> {
    const queueNames = new Set<string>([
      ...this.definitions.keys(),
      ...Array.from(this.definitions.values())
        .map((definition) => definition.options.deadLetter)
        .filter((value): value is string => Boolean(value))
    ]);

    const queues = Array.from(queueNames).map((name) =>
      this.buildInlineQueueSnapshot(name)
    );

    return {
      driverName: this.driverName,
      queues
    };
  }

  async listFailed(jobName?: string): Promise<QueueFailedJob[]> {
    const names = new Set<string>();

    if (jobName) {
      names.add(jobName);
      const sourceDefinition = this.definitions.get(jobName);

      if (sourceDefinition?.options.deadLetter) {
        names.add(sourceDefinition.options.deadLetter);
      }

      const sourceFromDeadLetter = this.findSourceQueueByDeadLetter(jobName);
      if (sourceFromDeadLetter) {
        names.add(sourceFromDeadLetter);
      }
    } else {
      for (const definition of this.definitions.values()) {
        names.add(definition.name);
        if (definition.options.deadLetter) {
          names.add(definition.options.deadLetter);
        }
      }
    }

    return Array.from(this.jobs.values())
      .filter((job) => {
        if (names.size > 0 && !names.has(job.queueName)) {
          return false;
        }

        const isPrimaryFailure = job.state === "failed";
        const isDeadLetterJob = Boolean(job.sourceQueueName);
        return isPrimaryFailure || isDeadLetterJob;
      })
      .map((job) => ({
        id: job.id,
        queueName: job.queueName,
        sourceQueueName: job.sourceQueueName,
        state: job.state,
        payload: job.payload,
        retryCount: job.retryCount,
        retryLimit: job.retryLimit,
        attempt: job.attempt,
        deadLetterQueue: job.deadLetterQueue ?? null,
        errorSummary: job.errorSummary ?? null,
        createdAt: job.createdAt,
        updatedAt: job.updatedAt
      }))
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  }

  async retry(jobName: string, jobId: string | string[]): Promise<{
    retried: number;
  }> {
    const ids = Array.isArray(jobId) ? jobId : [jobId];
    let retried = 0;

    for (const id of ids) {
      const job = this.jobs.get(id);
      if (!job || job.queueName !== jobName) {
        continue;
      }

      if (job.sourceQueueName) {
        await this.publish(job.sourceQueueName, job.payload as Record<string, unknown>);
        this.jobs.delete(id);
        retried += 1;
        continue;
      }

      const definition = this.definitions.get(jobName);
      if (!definition?.handler || job.state !== "failed") {
        continue;
      }

      job.retryCount = 0;
      job.attempt = 1;
      job.errorSummary = null;
      job.updatedAt = new Date().toISOString();
      await this.executeInlineJob(definition, job, 1);
      retried += 1;
    }

    return { retried };
  }

  private async executeInlineJob(
    definition: QueueDefinition,
    job: InlineJobRecord,
    attempt: number
  ): Promise<void> {
    if (!definition.handler) {
      return;
    }

    job.state = "active";
    job.attempt = attempt;
    job.retryCount = Math.max(0, attempt - 1);
    job.updatedAt = new Date().toISOString();

    try {
      await definition.handler({
        id: job.id,
        name: definition.name,
        data: job.payload,
        attempt,
        retryCount: job.retryCount,
        retryLimit: job.retryLimit,
        deadLetterQueue: job.deadLetterQueue ?? null
      });

      job.state = "completed";
      job.errorSummary = null;
      job.updatedAt = new Date().toISOString();
    } catch (error) {
      const errorSummary =
        error instanceof Error ? error.message : "Unknown queue error";
      const shouldRetry = attempt <= job.retryLimit;

      if (shouldRetry) {
        job.state = "retry";
        job.errorSummary = errorSummary;
        job.updatedAt = new Date().toISOString();
        await this.executeInlineJob(definition, job, attempt + 1);
        return;
      }

      job.state = "failed";
      job.errorSummary = errorSummary;
      job.updatedAt = new Date().toISOString();

      if (job.deadLetterQueue) {
        const now = new Date().toISOString();
        const deadLetterId = randomUUID();
        this.jobs.set(deadLetterId, {
          id: deadLetterId,
          queueName: job.deadLetterQueue,
          sourceQueueName: definition.name,
          state: "created",
          payload: job.payload,
          retryCount: job.retryCount,
          retryLimit: 0,
          attempt: job.attempt,
          deadLetterQueue: null,
          errorSummary,
          createdAt: now,
          updatedAt: now
        });
      }
    }
  }

  private buildInlineQueueSnapshot(name: string): QueueSnapshot {
    const definition =
      this.definitions.get(name) ??
      (this.findSourceQueueByDeadLetter(name)
        ? this.definitions.get(this.findSourceQueueByDeadLetter(name)!)
        : undefined);
    const jobs = Array.from(this.jobs.values()).filter((job) => job.queueName === name);

    return {
      name,
      deadLetter:
        definition?.name === name
          ? definition.options.deadLetter ?? null
          : null,
      retryLimit: definition?.options.retryLimit ?? 0,
      queuedCount: jobs.filter(
        (job) => job.state === "created" || job.state === "retry"
      ).length,
      activeCount: jobs.filter((job) => job.state === "active").length,
      deferredCount: 0,
      totalCount: jobs.length
    };
  }

  private findSourceQueueByDeadLetter(deadLetterQueue: string): string | undefined {
    return Array.from(this.definitions.values()).find(
      (definition) => definition.options.deadLetter === deadLetterQueue
    )?.name;
  }
}

export class PgBossQueueDriver implements QueueDriver {
  public readonly driverName = "pg-boss" as const;
  private readonly definitions = new Map<string, QueueDefinition>();
  private readonly boss: PgBoss;
  private started = false;

  constructor(connection: PgBossConnectionOptions) {
    this.boss = new PgBoss(resolvePgBossConnectionOptions(connection));
  }

  async start(): Promise<void> {
    if (this.started) {
      return;
    }

    await this.boss.start();

    for (const definition of this.definitions.values()) {
      await this.ensureQueues(definition);
      await this.attachWorker(definition);
    }

    this.started = true;
  }

  async stop(): Promise<void> {
    if (!this.started) {
      return;
    }

    await this.boss.stop();
    this.started = false;
  }

  async publish<T extends object>(
    jobName: string,
    payload: T
  ): Promise<QueuePublishResult> {
    const definition = this.definitions.get(jobName);
    const jobId = await this.boss.send(jobName, payload, toSendOptions(definition?.options));

    return {
      jobId: String(jobId),
      queueName: jobName
    };
  }

  async register<T>(
    jobName: string,
    handler: QueueHandler<T> | null,
    options?: QueueRegistrationOptions
  ): Promise<void> {
    const definition: QueueDefinition = {
      name: jobName,
      handler: handler as QueueHandler<unknown> | null,
      options: options ?? {}
    };

    this.definitions.set(jobName, definition);

    if (this.started) {
      await this.ensureQueues(definition);
      await this.attachWorker(definition);
    }
  }

  async getStats(): Promise<{
    driverName: QueueDriver["driverName"];
    queues: QueueSnapshot[];
  }> {
    const names = collectQueueNames(this.definitions);
    const queues = await this.boss.getQueues(names);

    return {
      driverName: this.driverName,
      queues: queues.map((queue) => ({
        name: queue.name,
        deadLetter: queue.deadLetter ?? null,
        retryLimit: queue.retryLimit,
        queuedCount: queue.queuedCount,
        activeCount: queue.activeCount,
        deferredCount: queue.deferredCount,
        totalCount: queue.totalCount
      }))
    };
  }

  async listFailed(jobName?: string): Promise<QueueFailedJob[]> {
    const targetDefinitions = jobName
      ? Array.from(this.definitions.values()).filter(
          (definition) =>
            definition.name === jobName || definition.options.deadLetter === jobName
        )
      : Array.from(this.definitions.values());

    const failedJobs: QueueFailedJob[] = [];

    for (const definition of targetDefinitions) {
      const primaryJobs = await this.boss.findJobs(definition.name);
      for (const job of primaryJobs.filter((candidate) => candidate.state === "failed")) {
        failedJobs.push(mapPgBossJob(job, definition.name, undefined));
      }

      if (definition.options.deadLetter) {
        const deadLetterJobs = await this.boss.findJobs(definition.options.deadLetter);
        for (const job of deadLetterJobs) {
          failedJobs.push(
            mapPgBossJob(job, definition.options.deadLetter, definition.name)
          );
        }
      }
    }

    return failedJobs.sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  }

  async retry(jobName: string, jobId: string | string[]): Promise<{
    retried: number;
  }> {
    const ids = Array.isArray(jobId) ? jobId : [jobId];
    const sourceQueue = Array.from(this.definitions.values()).find(
      (definition) => definition.options.deadLetter === jobName
    );

    if (sourceQueue) {
      let retried = 0;

      for (const id of ids) {
        const job = await this.boss.getJobById<Record<string, unknown>>(jobName, id);
        if (!job) {
          continue;
        }

        const publishResult = await this.publish(
          sourceQueue.name,
          (job.data ?? {}) as Record<string, unknown>
        );

        if (publishResult.jobId) {
          await this.boss.deleteJob(jobName, id);
          retried += 1;
        }
      }

      return { retried };
    }

    await this.boss.retry(jobName, ids);
    return { retried: ids.length };
  }

  private async ensureQueues(definition: QueueDefinition): Promise<void> {
    if (definition.options.deadLetter) {
      await this.upsertQueue(definition.options.deadLetter, {
        retryLimit: 0,
        deleteAfterSeconds: definition.options.deleteAfterSeconds,
        retentionSeconds: definition.options.retentionSeconds,
        expireInSeconds: definition.options.expireInSeconds,
        heartbeatSeconds: definition.options.heartbeatSeconds
      });
    }

    await this.upsertQueue(definition.name, {
      ...toQueueOptions(definition.options),
      deadLetter: definition.options.deadLetter
    });
  }

  private async upsertQueue(
    name: string,
    options: Omit<PgBossQueue, "name">
  ): Promise<void> {
    const sanitizedOptions = stripUndefined(options);
    const existing = await this.boss.getQueue(name);

    if (!existing) {
      await this.boss.createQueue(name, sanitizedOptions);
      return;
    }

    await this.boss.updateQueue(name, sanitizedOptions);
  }

  private async attachWorker(definition: QueueDefinition): Promise<void> {
    if (!definition.handler || definition.workerId) {
      return;
    }

    definition.workerId = await this.boss.work(
      definition.name,
      {
        ...(definition.options.workerOptions ?? {}),
        includeMetadata: true
      },
      async (jobs: JobWithMetadata<unknown>[]) => {
        for (const job of jobs) {
          await definition.handler?.({
            id: job.id,
            name: definition.name,
            data: job.data,
            attempt: job.retryCount + 1,
            retryCount: job.retryCount,
            retryLimit: job.retryLimit,
            deadLetterQueue: job.deadLetter ?? null
          });
        }
      }
    );
  }
}

export function createQueueDriver(options: {
  connectionString?: string;
  ssl?: unknown;
  driver: "inline" | "pg-boss";
}): QueueDriver {
  if (options.driver === "pg-boss") {
    if (!options.connectionString) {
      throw new Error(
        "QUEUE_DRIVER=pg-boss requires DATABASE_URL so the managed queue can persist jobs."
      );
    }

    return new PgBossQueueDriver({
      connectionString: options.connectionString,
      ssl: options.ssl
    });
  }

  return new InlineQueueDriver();
}

export function resolvePgBossConnectionOptions(
  options: PgBossConnectionOptions
): PgBossConnectionOptions {
  if (options.ssl !== undefined) {
    return {
      ...options,
      connectionString: stripSslMode(options.connectionString)
    };
  }

  try {
    const hostname = new URL(options.connectionString).hostname;

    if (hostname.endsWith(".supabase.co")) {
      return {
        ...options,
        connectionString: stripSslMode(options.connectionString),
        ssl: {
          rejectUnauthorized: false
        }
      };
    }
  } catch {
    return options;
  }

  return options;
}

function stripSslMode(connectionString: string): string {
  try {
    const parsed = new URL(connectionString);
    parsed.searchParams.delete("sslmode");
    parsed.searchParams.delete("uselibpqcompat");
    return parsed.toString();
  } catch {
    return connectionString;
  }
}

function collectQueueNames(definitions: Map<string, QueueDefinition>): string[] {
  return Array.from(
    new Set(
      Array.from(definitions.values()).flatMap((definition) =>
        definition.options.deadLetter
          ? [definition.name, definition.options.deadLetter]
          : [definition.name]
      )
    )
  );
}

function toQueueOptions(
  options: QueueRegistrationOptions = {}
): Omit<PgBossQueue, "name"> {
  return stripUndefined({
    retryLimit: options.retryLimit,
    retryDelay: options.retryDelay,
    retryBackoff: options.retryBackoff,
    retryDelayMax: options.retryDelayMax,
    expireInSeconds: options.expireInSeconds,
    deleteAfterSeconds: options.deleteAfterSeconds,
    retentionSeconds: options.retentionSeconds,
    heartbeatSeconds: options.heartbeatSeconds,
    deadLetter: options.deadLetter
  });
}

function toSendOptions(options?: QueueRegistrationOptions) {
  if (!options) {
    return undefined;
  }

  return stripUndefined({
    retryLimit: options.retryLimit,
    retryDelay: options.retryDelay,
    retryBackoff: options.retryBackoff,
    retryDelayMax: options.retryDelayMax,
    expireInSeconds: options.expireInSeconds,
    deleteAfterSeconds: options.deleteAfterSeconds,
    retentionSeconds: options.retentionSeconds,
    heartbeatSeconds: options.heartbeatSeconds,
    deadLetter: options.deadLetter
  });
}

function stripUndefined<T extends Record<string, unknown>>(value: T): T {
  return Object.fromEntries(
    Object.entries(value).filter(([, candidate]) => candidate !== undefined)
  ) as T;
}

function mapPgBossJob(
  job: JobWithMetadata<unknown>,
  queueName: string,
  sourceQueueName?: string
): QueueFailedJob {
  const createdAt = job.createdOn.toISOString();
  const updatedAt =
    job.completedOn?.toISOString() ??
    job.startedOn?.toISOString() ??
    createdAt;

  return {
    id: job.id,
    queueName,
    sourceQueueName,
    state: job.state,
    payload: job.data,
    retryCount: job.retryCount,
    retryLimit: job.retryLimit,
    attempt: job.retryCount + 1,
    deadLetterQueue: job.deadLetter ?? null,
    errorSummary:
      job.output &&
      typeof job.output === "object" &&
      "error" in job.output
        ? String(job.output.error)
        : null,
    createdAt,
    updatedAt
  };
}
