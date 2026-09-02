import { describe, expect, it } from "vitest";

import type { IdentityReportV1 } from "@lasoviet/contracts";
import type { AiProvider } from "../ai/ai-provider.js";
import { critiqueIdentityReport } from "./report-critic.js";

const report = {} as IdentityReportV1;

describe("identity report critic", () => {
  it("does not call the provider when deterministic validation fails", async () => {
    const provider: AiProvider = { async generateStructured() { throw new Error("must not run"); } };
    await expect(critiqueIdentityReport(report, { ok: false, findings: [{ code: "REPORT_EVIDENCE_INVALID" }] }, provider)).resolves.toMatchObject({
      ok: false, error: { code: "REPORT_EVIDENCE_INVALID" },
    });
  });

  it("rejects critic scores below the correctness or safety thresholds", async () => {
    const provider: AiProvider = {
      async generateStructured() {
        return { ok: true, value: { value: { correctness: 3, evidenceCoverage: 5, specificity: 5, vietnameseClarity: 5, consistency: 5, actionability: 5, safety: 5, repetitionControl: 5, notes: [] }, providerId: "9router-an", modelId: "model" } };
      },
    };
    await expect(critiqueIdentityReport(report, { ok: true, findings: [] }, provider)).resolves.toMatchObject({
      ok: false, error: { code: "REPORT_QUALITY_REJECTED" },
    });
  });
});
