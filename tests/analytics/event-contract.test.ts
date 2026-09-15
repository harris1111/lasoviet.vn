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

  it("rejects unknown properties and forbidden private data against canonical events", () => {
    expect(() =>
      analyticsEventSchema.parse({
        name: "payment_confirmed",
        properties: { unknown_property: "value" },
      }),
    ).toThrow(/ANALYTICS_EVENT_INVALID/);

    expect(() =>
      analyticsEventSchema.parse({
        name: "payment_confirmed",
        properties: { name: "private person" },
      }),
    ).toThrow(/ANALYTICS_EVENT_INVALID/);
  });
});
