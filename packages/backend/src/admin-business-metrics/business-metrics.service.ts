import type {
  AdminBusinessMetricsDayV1,
  AdminBusinessMetricsV1,
  AdminReadContextV1,
  Result,
} from "@lasoviet/contracts";
import {
  AdminBusinessMetricsV1Schema,
  DEFAULT_BUSINESS_METRICS_SOURCE_AVAILABILITY_V1,
  parseAdminBusinessMetricsFiltersV1,
} from "@lasoviet/contracts";

import type { AdminBusinessMetricsRepository } from "./business-metrics.repository.js";

export type AdminBusinessMetricsError =
  | "ADMIN_METRICS_FILTER_INVALID"
  | "ADMIN_PROJECTION_UNAVAILABLE";

export type AdminBusinessMetricsService = {
  readBusinessMetrics(
    context: AdminReadContextV1,
    query: { from?: unknown; to?: unknown },
  ): Promise<Result<AdminBusinessMetricsV1, AdminBusinessMetricsError>>;
};

function error(
  code: AdminBusinessMetricsError,
): Result<never, AdminBusinessMetricsError> {
  return {
    ok: false,
    error: {
      code,
      messageKey: `admin.${code.toLowerCase()}`,
      retryable: false,
    },
  };
}

export function createAdminBusinessMetricsService(options: {
  repository: AdminBusinessMetricsRepository;
  now?: () => Date;
}): AdminBusinessMetricsService {
  return {
    async readBusinessMetrics(_context, query) {
      const capturedNow = options.now ? options.now() : new Date();

      const filters = parseAdminBusinessMetricsFiltersV1(query, capturedNow);
      if (!filters.success) {
        return error("ADMIN_METRICS_FILTER_INVALID");
      }

      try {
        const days = await options.repository.readMetrics({
          fromDate: filters.data.fromDate,
          toDate: filters.data.toDate,
          now: capturedNow,
        });

        const rawResponse = {
          version: 1 as const,
          timezone: "Asia/Ho_Chi_Minh" as const,
          fromDate: filters.data.fromDate,
          toDate: filters.data.toDate,
          generatedAt: capturedNow.toISOString(),
          days,
          sourceAvailability: DEFAULT_BUSINESS_METRICS_SOURCE_AVAILABILITY_V1,
        };

        const validated = AdminBusinessMetricsV1Schema.parse(rawResponse);
        return { ok: true, value: validated };
      } catch {
        return error("ADMIN_PROJECTION_UNAVAILABLE");
      }
    },
  };
}
