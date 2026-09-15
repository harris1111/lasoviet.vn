import { describe, expect, it } from "vitest";

import {
  analyticsConfig,
  analyticsEventSchema,
  canonicalFunnel,
} from "./analytics-events.js";

describe("analytics-events config and schema", () => {
  const canonicalEvents = [
    "landing",
    "wizard_start",
    "wizard_step_complete",
    "chart_success",
    "offer_view",
    "locked_preview_view",
    "topup_view",
    "pack_selected",
    "checkout_created",
    "payment_confirmed",
    "la_spent",
    "report_opened",
    "report_section_read",
    "upgrade_view",
    "upgrade_purchased",
    "return_visit",
  ] as const;

  it("preserves exact canonical funnel and matches canonical event names", () => {
    expect(canonicalFunnel).toEqual(canonicalEvents);
    expect(analyticsConfig.canonical_funnel).toEqual(canonicalEvents);
    expect(analyticsConfig.events.map((e) => e.name)).toEqual(canonicalEvents);
  });

  it("validates each canonical event with only its allowlisted properties", () => {
    for (const eventDef of analyticsConfig.events) {
      const validProps: Record<string, unknown> = {};
      for (const prop of eventDef.properties) {
        validProps[prop] = "valid_sample_value";
      }
      expect(
        analyticsEventSchema.parse({
          name: eventDef.name,
          properties: validProps,
        }),
      ).toBeDefined();
    }
  });

  it("fails closed on legacy event names", () => {
    const legacyNames = [
      "landing_view",
      "method_selected",
      "birth_form_started",
      "birth_form_error",
      "chart_created",
      "free_summary_viewed",
      "evidence_opened",
      "paid_topic_selected",
      "paywall_viewed",
      "checkout_started",
      "payment_completed",
      "payment_failed",
      "report_generation_completed",
      "report_downloaded",
      "report_feedback_submitted",
      "support_requested",
      "profile_deleted",
    ];

    for (const legacy of legacyNames) {
      expect(() =>
        analyticsEventSchema.parse({
          name: legacy,
          properties: {},
        }),
      ).toThrow(/ANALYTICS_EVENT_INVALID/);
    }
  });

  it("fails closed on forbidden, sensitive, and internal identity property keys", () => {
    const forbiddenKeys = [
      "name",
      "email",
      "birth_date",
      "birth_time",
      "birth_place",
      "birth_year",
      "birth_day",
      "birth_month",
      "chart_id",
      "chartId",
      "profile_id",
      "profileId",
      "visitor_id",
      "visitorId",
      "user_id",
      "userId",
      "account_id",
      "accountId",
      "free_text",
      "question",
      "report_content",
      "evidence_text",
      "evidence_content",
    ];

    for (const key of forbiddenKeys) {
      expect(() =>
        analyticsEventSchema.parse({
          name: "landing",
          properties: { [key]: "sensitive_data" },
        }),
      ).toThrow(/ANALYTICS_EVENT_INVALID/);
    }
  });

  it("fails closed on unknown or mixed-case property keys", () => {
    expect(() =>
      analyticsEventSchema.parse({
        name: "landing",
        properties: { unknown_extra: "val" },
      }),
    ).toThrow(/ANALYTICS_EVENT_INVALID/);

    expect(() =>
      analyticsEventSchema.parse({
        name: "landing",
        properties: { LANDING_PAGE: "/" },
      }),
    ).toThrow(/ANALYTICS_EVENT_INVALID/);

    expect(() =>
      analyticsEventSchema.parse({
        name: "wizard_start",
        properties: { Locale: "vi" },
      }),
    ).toThrow(/ANALYTICS_EVENT_INVALID/);

    expect(() =>
      analyticsEventSchema.parse({
        name: "chart_success",
        properties: { cHaRt_Id: "test" },
      }),
    ).toThrow(/ANALYTICS_EVENT_INVALID/);
  });
});
