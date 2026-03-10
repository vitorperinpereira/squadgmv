import type { RuntimeContext } from "./bootstrap.js";

export type ExecutiveReportScheduler = {
  enabled: boolean;
  intervalMs: number;
  runNow: (reason?: string) => Promise<void>;
  stop: () => void;
};

export function createExecutiveReportScheduler(
  context: RuntimeContext
): ExecutiveReportScheduler {
  const intervalMinutes = context.config.EXECUTIVE_REPORT_INTERVAL_MINUTES;
  const intervalMs = Math.max(0, intervalMinutes) * 60_000;
  let timer: NodeJS.Timeout | null = null;

  const runNow = async (
    reason = `Configured recurring interval: ${intervalMinutes} minute(s).`
  ) => {
    const queued = await context.reportingService.enqueueExecutiveReport({
      trigger: "scheduled",
      reason
    });

    context.logger.info(
      {
        queueJobId: queued.jobId,
        correlationId: queued.correlationId,
        intervalMinutes
      },
      "Scheduled executive report generation queued."
    );
  };

  return {
    enabled: intervalMs > 0,
    intervalMs,
    runNow,
    stop: () => {
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
    }
  };
}

export function startExecutiveReportScheduler(
  context: RuntimeContext
): ExecutiveReportScheduler {
  const scheduler = createExecutiveReportScheduler(context);

  if (!scheduler.enabled) {
    return scheduler;
  }

  const intervalMs = scheduler.intervalMs;
  const timer = setInterval(() => {
    void scheduler.runNow().catch((error) => {
      context.logger.error(
        { err: error, intervalMs },
        "Scheduled executive report generation failed."
      );
    });
  }, intervalMs);

  context.logger.info(
    {
      intervalMinutes: context.config.EXECUTIVE_REPORT_INTERVAL_MINUTES
    },
    "Executive report scheduler is active."
  );

  return {
    ...scheduler,
    stop: () => {
      clearInterval(timer);
    }
  };
}
