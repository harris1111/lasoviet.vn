import { AnalyticsEventV1Schema, type AnalyticsEventV1 } from "@lasoviet/config";
import type { Result } from "@lasoviet/contracts";

export type AnalyticsSink = {
  write(event: AnalyticsEventV1): Promise<void>;
};

export type AnalyticsService = {
  emit(event: unknown): Promise<Result<void, "ANALYTICS_EVENT_INVALID">>;
};

export function createAnalyticsService(options: {
  sink: AnalyticsSink;
}): AnalyticsService {
  return {
    async emit(event) {
      const parsed = AnalyticsEventV1Schema.safeParse(event);
      if (!parsed.success) {
        return {
          ok: false,
          error: {
            code: "ANALYTICS_EVENT_INVALID",
            messageKey: "analytics.event_invalid",
            retryable: false,
          },
        };
      }
      await options.sink.write(parsed.data);
      return { ok: true, value: undefined };
    },
  };
}
