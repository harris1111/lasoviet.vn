import { describe, expect, it } from "vitest";

import { createAiProductionGate } from "../../packages/backend/src/ai/ai-provider.js";

describe("AI provider due-diligence gate", () => {
  it("permits only synthetic capability probes while the production decision is pending", () => {
    const gate = createAiProductionGate("pending");
    expect(gate.allows("synthetic_capability_probe")).toBe(true);
    expect(gate.allows("production_report_generation")).toBe(false);
  });
});
