import { AnalyticsEventV1Schema as BaseAnalyticsEventV1Schema } from "@lasoviet/contracts";
import { z } from "zod";

import rawAnalyticsConfig from "../../../config/analytics-events.json" with { type: "json" };

export const analyticsConfig = rawAnalyticsConfig;
export const canonicalFunnel = [...rawAnalyticsConfig.canonical_funnel] as const;

const eventNames = rawAnalyticsConfig.events.map((event) => event.name) as [
  string,
  ...string[],
];
const eventProperties = new Map(
  rawAnalyticsConfig.events.map((event) => [event.name, new Set(event.properties)]),
);
const forbiddenProperties = new Set([
  "name",
  "birth_date",
  "birth_time",
  "birth_place",
  "chart_json",
  "evidence_text",
  "report_content",
  "email",
  "payment_reference",
]);

export const analyticsEventSchema = BaseAnalyticsEventV1Schema.superRefine(
  (event, context) => {
    if (!eventNames.includes(event.name)) {
      context.addIssue({
        code: "custom",
        path: ["name"],
        message: "ANALYTICS_EVENT_INVALID",
      });
      return;
    }

    const allowed = eventProperties.get(event.name) ?? new Set<string>();
    for (const property of Object.keys(event.properties)) {
      const normalized = property.toLowerCase();
      if (
        !allowed.has(property) ||
        forbiddenProperties.has(normalized) ||
        normalized.startsWith("birth_") ||
        normalized.includes("report") ||
        normalized.includes("chart")
      ) {
        context.addIssue({
          code: "custom",
          path: ["properties", property],
          message: "ANALYTICS_EVENT_INVALID",
        });
      }
    }
  },
);

export const AnalyticsEventV1Schema = analyticsEventSchema;
export type AnalyticsEventV1 = z.infer<typeof analyticsEventSchema>;

const funnelSet = new Set(canonicalFunnel);
if (
  canonicalFunnel.length === 0 ||
  funnelSet.size !== canonicalFunnel.length ||
  canonicalFunnel.some((eventName) => !eventNames.includes(eventName))
) {
  throw new Error("ANALYTICS_FUNNEL_INVALID");
}
