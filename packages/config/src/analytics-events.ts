import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  AnalyticsEventV1Schema as BaseAnalyticsEventV1Schema,
  CANONICAL_ANALYTICS_EVENT_NAMES,
} from "@lasoviet/contracts";
import { z } from "zod";

function runtimeConfigFile(name: string): string {
  const workingDirectoryFile = resolve(process.cwd(), "config", name);
  if (existsSync(workingDirectoryFile)) {
    return workingDirectoryFile;
  }
  return resolve(process.cwd(), "..", "..", "config", name);
}

const rawAnalyticsConfig = JSON.parse(
  readFileSync(runtimeConfigFile("analytics-events.json"), "utf8"),
) as {
  canonical_funnel: string[];
  events: Array<{ name: string; properties: string[] }>;
};

export const analyticsConfig = rawAnalyticsConfig;
export const canonicalFunnel = [...rawAnalyticsConfig.canonical_funnel] as const;

const eventNames = rawAnalyticsConfig.events.map((event) => event.name) as [
  string,
  ...string[],
];
const eventProperties = new Map(
  rawAnalyticsConfig.events.map((event) => [
    event.name,
    new Set(event.properties),
  ]),
);

const forbiddenExact = new Set([
  "name",
  "email",
  "birth_date",
  "birth_time",
  "birth_place",
  "birth_day",
  "birth_month",
  "birth_year",
  "birth_hour",
  "birth_minute",
  "payment_reference",
  "report_content",
  "chart_id",
  "chartid",
  "profile_id",
  "profileid",
  "visitor_id",
  "visitorid",
  "user_id",
  "userid",
  "account_id",
  "accountid",
  "free_text",
  "question",
  "evidence_text",
]);

function isForbiddenPropertyKey(property: string): boolean {
  const lower = property.trim().toLowerCase();
  if (forbiddenExact.has(lower)) {
    return true;
  }
  const compact = lower.replace(/[-_\s]/g, "");
  if (
    compact === "name" ||
    (compact.endsWith("name") && !compact.endsWith("stepname")) ||
    compact.includes("email") ||
    compact.includes("birth") ||
    compact.includes("chart") ||
    compact.includes("profile") ||
    compact.includes("visitor") ||
    compact.includes("account") ||
    compact.includes("userid") ||
    compact.includes("freetext") ||
    compact.includes("question") ||
    compact.includes("reportcontent") ||
    compact.includes("evidence")
  ) {
    return true;
  }
  return false;
}

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
      if (
        isForbiddenPropertyKey(property) ||
        !allowed.has(property) ||
        property !== property.trim()
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
