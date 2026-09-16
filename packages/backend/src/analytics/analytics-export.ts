import { analyticsConfig } from "@lasoviet/config";
import type {
  AccountExportAnalyticsEventV1,
  CanonicalAnalyticsEventName,
} from "@lasoviet/contracts";

const allowedPropertiesByEvent = new Map<string, Set<string>>(
  analyticsConfig.events.map((event) => [
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
  "ip",
  "user_agent",
  "useragent",
  "referrer",
]);

export function isForbiddenExportKey(rawKey: string): boolean {
  const normalized = rawKey.normalize("NFKC").trim().toLowerCase();
  if (forbiddenExact.has(normalized)) {
    return true;
  }
  // Remove hyphens, underscores, and whitespace
  const compact = normalized.replace(/[-_\s]/g, "");
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
    compact.includes("evidence") ||
    compact.includes("useragent") ||
    compact === "ip" ||
    compact === "referrer"
  ) {
    return true;
  }
  return false;
}

export type ThirdPartyExportEvent = {
  name: CanonicalAnalyticsEventName;
  properties: Record<string, string | number | boolean | null>;
  occurredAt: string;
};

export type ProjectThirdPartyResult =
  | { ok: true; value: ThirdPartyExportEvent }
  | { ok: false; error: "UNAPPROVED_EVENT_NAME" | "FORBIDDEN_OR_UNKNOWN_PROPERTY" };

export function projectEventForThirdParty(event: {
  name: string;
  properties: unknown;
  occurredAt: Date;
}): ProjectThirdPartyResult {
  const allowedSet = allowedPropertiesByEvent.get(event.name);
  if (!allowedSet) {
    return { ok: false, error: "UNAPPROVED_EVENT_NAME" };
  }

  if (
    typeof event.properties !== "object" ||
    event.properties === null ||
    Array.isArray(event.properties)
  ) {
    return { ok: false, error: "FORBIDDEN_OR_UNKNOWN_PROPERTY" };
  }

  const rawProps = event.properties as Record<string, unknown>;
  const cleanProperties: Record<string, string | number | boolean | null> = {};

  for (const [key, value] of Object.entries(rawProps)) {
    if (isForbiddenExportKey(key)) {
      return { ok: false, error: "FORBIDDEN_OR_UNKNOWN_PROPERTY" };
    }
    if (!allowedSet.has(key)) {
      return { ok: false, error: "FORBIDDEN_OR_UNKNOWN_PROPERTY" };
    }

    if (
      typeof value === "string" ||
      typeof value === "number" ||
      typeof value === "boolean" ||
      value === null
    ) {
      cleanProperties[key] = value;
    } else {
      return { ok: false, error: "FORBIDDEN_OR_UNKNOWN_PROPERTY" };
    }
  }

  return {
    ok: true,
    value: {
      name: event.name as CanonicalAnalyticsEventName,
      properties: cleanProperties,
      occurredAt: event.occurredAt.toISOString(),
    },
  };
}

export type ProjectAccountExportResult =
  | { ok: true; value: AccountExportAnalyticsEventV1[] }
  | { ok: false; error: "ANALYTICS_EXPORT_CORRUPTED" };

export function projectEventsForAccountExport(
  events: Array<{
    id: string;
    name: string;
    properties: unknown;
    occurredAt: Date;
  }>,
): ProjectAccountExportResult {
  const result: AccountExportAnalyticsEventV1[] = [];

  for (const event of events) {
    if (typeof event.id !== "string" || !event.id.trim()) {
      return { ok: false, error: "ANALYTICS_EXPORT_CORRUPTED" };
    }

    if (!(event.occurredAt instanceof Date) || Number.isNaN(event.occurredAt.getTime())) {
      return { ok: false, error: "ANALYTICS_EXPORT_CORRUPTED" };
    }

    const allowedSet = allowedPropertiesByEvent.get(event.name);
    if (!allowedSet) {
      return { ok: false, error: "ANALYTICS_EXPORT_CORRUPTED" };
    }

    if (
      typeof event.properties !== "object" ||
      event.properties === null ||
      Array.isArray(event.properties)
    ) {
      return { ok: false, error: "ANALYTICS_EXPORT_CORRUPTED" };
    }

    const rawProps = event.properties as Record<string, unknown>;
    const cleanProperties: Record<string, string | number | boolean | null> = {};

    for (const [key, value] of Object.entries(rawProps)) {
      if (isForbiddenExportKey(key)) {
        return { ok: false, error: "ANALYTICS_EXPORT_CORRUPTED" };
      }
      if (!allowedSet.has(key)) {
        return { ok: false, error: "ANALYTICS_EXPORT_CORRUPTED" };
      }

      if (
        (typeof value === "string" && value.length <= 256) ||
        (typeof value === "number" && Number.isFinite(value)) ||
        typeof value === "boolean" ||
        value === null
      ) {
        cleanProperties[key] = value;
      } else {
        return { ok: false, error: "ANALYTICS_EXPORT_CORRUPTED" };
      }
    }

    result.push({
      id: event.id.trim(),
      name: event.name as CanonicalAnalyticsEventName,
      properties: cleanProperties,
      occurredAt: event.occurredAt.toISOString(),
    });
  }

  return { ok: true, value: result };
}
