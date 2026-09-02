import { describe, expect, it } from "vitest";

import { FrozenIdentityReportFactsV1Schema } from "./report-source-snapshot.js";

describe("frozen identity report facts", () => {
  it("requires a PII-free fact snapshot bound to one chart and evidence version", () => {
    const snapshot = {
      version: 1,
      capabilityId: "ziwei.identity.p0",
      chartVersionId: "chart-version-1",
      ruleVersion: "ziwei.identity.v1",
      evidenceVersion: 1,
      facts: {
        soulPalaceId: "ziwei.palace.life",
        "palaces.ziwei.palace.life.earthlyBranchId": "ziwei.branch.tiger",
      },
    };

    expect(FrozenIdentityReportFactsV1Schema.safeParse(snapshot).success).toBe(true);
    expect(FrozenIdentityReportFactsV1Schema.safeParse({
      ...snapshot,
      facts: { ...snapshot.facts, email: "person@example.test" },
    }).success).toBe(false);
  });
});
