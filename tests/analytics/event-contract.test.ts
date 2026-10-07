import { describe, expect, it } from "vitest";

import {
  analyticsConfig,
  analyticsEventSchema,
  canonicalFunnel,
} from "../../packages/config/src/analytics-events.js";

describe("analytics event contract", () => {
  it("accepts known events and preserves the canonical funnel order", () => {
    expect(
      analyticsEventSchema.parse({
        name: "payment_confirmed",
        properties: {},
      }),
    ).toBeDefined();
    expect(canonicalFunnel).toEqual(analyticsConfig.canonical_funnel);
  });

  it("validates all canonical events and their allowlisted properties", () => {
    const expectedEvents = [
      "landing",
      "chart_form_submit",
      "wizard_start",
      "wizard_step_complete",
      "chart_success",
      "offer_view",
      "locked_preview_view",
      "topup_view",
      "pack_selected",
      "checkout_created",
      "payment_confirmed",
      "unlock_confirm_view",
      "unlock_error",
      "unlock_confirmed",
      "la_spent",
      "welcome_grant",
      "report_opened",
      "report_section_read",
      "part_feedback",
      "guarantee_claimed",
      "upgrade_view",
      "upgrade_purchased",
      "return_visit",
      "free_result_interaction",
      "free_read_depth",
      "locked_preview_open",
    ];

    expect(canonicalFunnel).toEqual(expectedEvents);

    for (const eventDef of analyticsConfig.events) {
      const validProps: Record<string, unknown> = {};
      for (const prop of eventDef.properties) {
        validProps[prop] = "test_value";
      }
      expect(
        analyticsEventSchema.parse({
          name: eventDef.name,
          properties: validProps,
        }),
      ).toBeDefined();
    }
  });

  it("validates new FD-105 events specifically", () => {
    // unlock_confirm_view
    expect(
      analyticsEventSchema.parse({
        name: "unlock_confirm_view",
        properties: {
          sku: "ZIWEI-NATAL-EXCERPT-P0",
          price_la: 240,
          amount: 240,
          balance: 300,
          balance_after: 60,
          placement: "wallet_unlock_dialog",
        },
      }),
    ).toBeDefined();

    // unlock_confirmed
    expect(
      analyticsEventSchema.parse({
        name: "unlock_confirmed",
        properties: {
          sku: "ZIWEI-NATAL-EXCERPT-P0",
          amount: 240,
          price_la: 240,
          balance_after: 60,
        },
      }),
    ).toBeDefined();

    // welcome_grant
    expect(
      analyticsEventSchema.parse({
        name: "welcome_grant",
        properties: {
          amount: 60,
          balance_after: 60,
          grant_type: "welcome_verified_account",
        },
      }),
    ).toBeDefined();

    // part_feedback
    expect(
      analyticsEventSchema.parse({
        name: "part_feedback",
        properties: {
          section_id: "insight_1",
          feedback: "accurate",
          rating: 5,
          sku: "ZIWEI-NATAL-EXCERPT-P0",
          is_free: true,
        },
      }),
    ).toBeDefined();

    // guarantee_claimed
    expect(
      analyticsEventSchema.parse({
        name: "guarantee_claimed",
        properties: {
          sku: "ZIWEI-NATAL-EXCERPT-P0",
          amount: 240,
          amount_restored: 240,
          reason: "inaccurate",
          section_id: "palace_1",
        },
      }),
    ).toBeDefined();
  });

  it("explicitly rejects legacy event names such as payment_completed and landing_view", () => {
    expect(() =>
      analyticsEventSchema.parse({
        name: "payment_completed",
        properties: {},
      }),
    ).toThrow(/ANALYTICS_EVENT_INVALID/);

    expect(() =>
      analyticsEventSchema.parse({
        name: "landing_view",
        properties: {},
      }),
    ).toThrow(/ANALYTICS_EVENT_INVALID/);
  });

  it("strictly enforces FD-053/FD-080/FD-081 privacy boundaries: rejects forbidden data across all events", () => {
    const forbiddenProps = [
      { chart_id: "ch_123" },
      { chartId: "ch_123" },
      { birth_date: "1990-01-01" },
      { birth_time: "12:00" },
      { birth_place: "Hanoi" },
      { birth_year: 1990 },
      { user_id: "usr_123" },
      { userId: "usr_123" },
      { visitor_id: "vis_123" },
      { account_id: "acc_123" },
      { email: "user@example.com" },
      { name: "Nguyen Van A" },
      { report_content: "Sensitive text" },
      { evidence_text: "Sensitive evidence" },
      { question: "Free text" },
      { free_text: "Free text note" },
    ];

    const testEvents = [
      "topup_view",
      "pack_selected",
      "la_spent",
      "unlock_confirm_view",
      "unlock_confirmed",
      "welcome_grant",
      "part_feedback",
      "guarantee_claimed",
      "upgrade_view",
      "upgrade_purchased",
      "return_visit",
      "free_result_interaction",
      "free_read_depth",
      "locked_preview_open",
    ];

    for (const eventName of testEvents) {
      for (const forbidden of forbiddenProps) {
        expect(() =>
          analyticsEventSchema.parse({
            name: eventName,
            properties: forbidden,
          }),
        ).toThrow(/ANALYTICS_EVENT_INVALID/);
      }
    }
  });

  it("rejects unknown properties against canonical events", () => {
    expect(() =>
      analyticsEventSchema.parse({
        name: "payment_confirmed",
        properties: { unknown_property: "value" },
      }),
    ).toThrow(/ANALYTICS_EVENT_INVALID/);

    expect(() =>
      analyticsEventSchema.parse({
        name: "unlock_confirm_view",
        properties: { hack_property: "injection" },
      }),
    ).toThrow(/ANALYTICS_EVENT_INVALID/);
  });
});
