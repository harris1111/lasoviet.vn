import { describe, expect, it } from "vitest";
import {
  projectEventForThirdParty,
  projectEventsForAccountExport,
  isForbiddenExportKey,
} from "./analytics-export.js";
import { AccountExportAnalyticsEventV1Schema } from "@lasoviet/contracts";

describe("analytics-export", () => {
  it("projects valid canonical event with allowlisted properties", () => {
    const result = projectEventForThirdParty({
      name: "offer_view",
      properties: {
        offer_id: "starter_special",
        placement: "post_chart",
        sku: "ZIWEI_DEEP_REPORT",
      },
      occurredAt: new Date("2026-09-14T02:00:00Z"),
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toEqual({
      name: "offer_view",
      properties: {
        offer_id: "starter_special",
        placement: "post_chart",
        sku: "ZIWEI_DEEP_REPORT",
      },
      occurredAt: "2026-09-14T02:00:00.000Z",
    });
  });

  it("fails closed on unapproved event name", () => {
    const result = projectEventForThirdParty({
      name: "custom_unapproved_event",
      properties: {},
      occurredAt: new Date("2026-09-14T02:00:00Z"),
    });
    expect(result).toEqual({ ok: false, error: "UNAPPROVED_EVENT_NAME" });
  });

  it("fails closed on FD-053 forbidden property keys, including mixed-case, whitespace, and Unicode variants", () => {
    const forbiddenVariations = [
      "user_id",
      "USER_ID",
      "UserId",
      "user id",
      "USER ID",
      "user	id",
      "visitor_id",
      "visitor id",
      "chart_id",
      "CHART_ID",
      "chart id",
      "chart  id",
      "birth_time",
      "birth time",
      "birth_date",
      "birth date",
      "free_text",
      "free text",
      "report_content",
      "report content",
      "evidence_text",
      "evidence text",
      "email",
      "EMAIL",
      "e mail",
      "ip",
      "IP",
      "user_agent",
      "user agent",
      "referrer",
      "chartid", // unicode i
    ];

    for (const key of forbiddenVariations) {
      const isForbidden = isForbiddenExportKey(key);
      expect(isForbidden).toBe(true);

      const result = projectEventForThirdParty({
        name: "landing",
        properties: {
          landing_page: "/home",
          [key]: "leaked_sensitive_data",
        },
        occurredAt: new Date("2026-09-14T02:00:00Z"),
      });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toBe("FORBIDDEN_OR_UNKNOWN_PROPERTY");
      }
    }
  });

  it("fails closed on unknown properties not in the event allowlist", () => {
    const result = projectEventForThirdParty({
      name: "landing",
      properties: {
        landing_page: "/home",
        random_non_allowlisted_prop: "unexpected",
      },
      occurredAt: new Date("2026-09-14T02:00:00Z"),
    });
    expect(result).toEqual({
      ok: false,
      error: "FORBIDDEN_OR_UNKNOWN_PROPERTY",
    });
  });

  it("projects events for account export and conforms to AccountExportAnalyticsEventV1Schema", () => {
    const rawEvents = [
      {
        id: "evt_1",
        name: "topup_view",
        properties: { pack_id: "pack_100", placement: "banner" },
        occurredAt: new Date("2026-09-14T01:00:00Z"),
      },
      {
        id: "evt_3",
        name: "la_spent",
        properties: {
          sku: "REPORT",
          amount: 50,
          balance_after: 150,
          feature_id: "unlock_v2",
        },
        occurredAt: new Date("2026-09-14T03:00:00Z"),
      },
    ];

    const result = projectEventsForAccountExport(rawEvents);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toHaveLength(2);
    expect(result.value[0].id).toBe("evt_1");
    expect(result.value[1].id).toBe("evt_3");

    for (const item of result.value) {
      const parsed = AccountExportAnalyticsEventV1Schema.safeParse(item);
      expect(parsed.success).toBe(true);
    }
  });

  it("fails the entire account export with ANALYTICS_EXPORT_CORRUPTED if any event is invalid or corrupted (no partial success)", () => {
    const mixedEvents = [
      {
        id: "evt_valid",
        name: "topup_view",
        properties: { pack_id: "pack_100", placement: "banner" },
        occurredAt: new Date("2026-09-14T01:00:00Z"),
      },
      {
        id: "evt_corrupted",
        name: "invalid_unapproved_name",
        properties: {},
        occurredAt: new Date("2026-09-14T02:00:00Z"),
      },
    ];

    const result = projectEventsForAccountExport(mixedEvents);
    expect(result).toEqual({
      ok: false,
      error: "ANALYTICS_EXPORT_CORRUPTED",
    });

    const forbiddenPropEvents = [
      {
        id: "evt_forbidden",
        name: "landing",
        properties: { landing_page: "/home", ip: "198.51.100.1" },
        occurredAt: new Date("2026-09-14T01:00:00Z"),
      },
    ];
    expect(projectEventsForAccountExport(forbiddenPropEvents)).toEqual({
      ok: false,
      error: "ANALYTICS_EXPORT_CORRUPTED",
    });

    const unknownPropEvents = [
      {
        id: "evt_unknown",
        name: "landing",
        properties: { landing_page: "/home", unknown_field: "bad" },
        occurredAt: new Date("2026-09-14T01:00:00Z"),
      },
    ];
    expect(projectEventsForAccountExport(unknownPropEvents)).toEqual({
      ok: false,
      error: "ANALYTICS_EXPORT_CORRUPTED",
    });
  });
});
