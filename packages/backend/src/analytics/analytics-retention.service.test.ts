import { describe, expect, it, vi } from "vitest";
import { createAnalyticsRetentionService } from "./analytics-retention.service.js";
import type { AnalyticsRepository } from "./analytics.repository.js";

describe("analytics-retention.service", () => {
  it("orchestrates purges and scrubs in bounded calls using injected clock", async () => {
    const mockRepo: Partial<AnalyticsRepository> = {
      deleteExpiredUnlinkedEvents: vi.fn().mockResolvedValue(15),
      deleteExpiredUnlinkedVisitors: vi.fn().mockResolvedValue(5),
      scrubExpiredIp: vi.fn().mockResolvedValue(8),
      deleteExpiredFraudIp: vi.fn().mockResolvedValue(2),
    };

    const service = createAnalyticsRetentionService({
      repository: mockRepo as AnalyticsRepository,
    });

    const testTime = new Date("2026-09-14T12:00:00Z");
    const summary = await service.purgeExpired(testTime, 50);

    expect(mockRepo.deleteExpiredUnlinkedEvents).toHaveBeenCalledWith(testTime, 50);
    expect(mockRepo.deleteExpiredUnlinkedVisitors).toHaveBeenCalledWith(testTime, 50);
    expect(mockRepo.scrubExpiredIp).toHaveBeenCalledWith(testTime, 50);
    expect(mockRepo.deleteExpiredFraudIp).toHaveBeenCalledWith(testTime, 50);

    expect(summary).toEqual({
      deletedUnlinkedEvents: 15,
      deletedUnlinkedVisitors: 5,
      scrubbedIpEvents: 8,
      deletedFraudRecords: 2,
    });
  });
});
