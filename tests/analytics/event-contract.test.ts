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
        name: "payment_completed",
        properties: {},
      }),
    ).toBeDefined();
    expect(canonicalFunnel).toEqual(analyticsConfig.canonical_funnel);
  });

  it("rejects unknown properties and forbidden private data", () => {
    expect(() =>
      analyticsEventSchema.parse({
        name: "payment_completed",
        properties: { unknown_property: "value" },
      }),
    ).toThrow(/ANALYTICS_EVENT_INVALID/);

    expect(() =>
      analyticsEventSchema.parse({
        name: "landing_view",
        properties: { name: "private person" },
      }),
    ).toThrow(/ANALYTICS_EVENT_INVALID/);
  });
});
