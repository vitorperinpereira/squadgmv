import { randomUUID } from "node:crypto";
import type { MemoryCaptureInput, MemoryRecord } from "@gmv/contracts";
import { memoryRecordSchema } from "@gmv/contracts";

export interface MemoryRepository {
  save(record: MemoryRecord): Promise<MemoryRecord>;
  list(filter?: {
    domain?: MemoryRecord["domain"];
    missionId?: string;
    tag?: string;
  }): Promise<MemoryRecord[]>;
}

export class MemoryService {
  constructor(private readonly repository: MemoryRepository) {}

  async capture(record: MemoryRecord): Promise<MemoryRecord> {
    return this.repository.save(record);
  }

  async captureDecision(input: MemoryCaptureInput): Promise<MemoryRecord> {
    return this.capture(buildMemoryRecord(input));
  }

  async captureDelivery(input: MemoryCaptureInput): Promise<MemoryRecord> {
    return this.capture(buildMemoryRecord(input));
  }

  async list(filter?: {
    domain?: MemoryRecord["domain"];
    missionId?: string;
    tag?: string;
  }): Promise<MemoryRecord[]> {
    return this.repository.list(filter);
  }

  async listByDomain(domain: MemoryRecord["domain"]): Promise<MemoryRecord[]> {
    return this.list({ domain });
  }

  async searchMemory(input?: {
    domain?: MemoryRecord["domain"];
    missionId?: string;
    tag?: string;
    query?: string;
  }): Promise<MemoryRecord[]> {
    const records = await this.list({
      domain: input?.domain,
      missionId: input?.missionId,
      tag: input?.tag
    });

    if (!input?.query) {
      return records;
    }

    const query = input.query.toLowerCase();

    return records.filter((record) => {
      return (
        record.title.toLowerCase().includes(query) ||
        record.summary.toLowerCase().includes(query) ||
        record.tags.some((tag) => tag.toLowerCase().includes(query))
      );
    });
  }
}

function buildMemoryRecord(input: MemoryCaptureInput): MemoryRecord {
  return memoryRecordSchema.parse({
    id: randomUUID(),
    domain: input.domain,
    title: input.title,
    summary: input.summary,
    bodyRef: input.body_ref,
    tags: input.tags,
    sourceType: input.source_type,
    linkedPlanningItemId: input.linked_planning_item_id,
    linkedMissionId: input.linked_mission_id,
    createdAt: new Date().toISOString()
  });
}
