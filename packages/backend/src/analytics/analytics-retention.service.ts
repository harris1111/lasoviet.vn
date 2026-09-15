import type { AnalyticsRepository } from "./analytics.repository.js";

export type AnalyticsRetentionSummary = {
  deletedUnlinkedEvents: number;
  deletedUnlinkedVisitors: number;
  scrubbedIpEvents: number;
  deletedFraudRecords: number;
};

export type AnalyticsRetentionService = {
  purgeExpired(now: Date, limit?: number): Promise<AnalyticsRetentionSummary>;
};

export function createAnalyticsRetentionService(options: {
  repository: AnalyticsRepository;
}): AnalyticsRetentionService {
  return {
    async purgeExpired(now: Date, limit = 100): Promise<AnalyticsRetentionSummary> {
      const deletedUnlinkedEvents = await options.repository.deleteExpiredUnlinkedEvents(now, limit);
      const deletedUnlinkedVisitors = await options.repository.deleteExpiredUnlinkedVisitors(now, limit);
      const scrubbedIpEvents = await options.repository.scrubExpiredIp(now, limit);
      const deletedFraudRecords = await options.repository.deleteExpiredFraudIp(now, limit);

      return {
        deletedUnlinkedEvents,
        deletedUnlinkedVisitors,
        scrubbedIpEvents,
        deletedFraudRecords,
      };
    },
  };
}
