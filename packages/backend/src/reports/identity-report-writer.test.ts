import { describe, expect, it } from "vitest";

import type { AiProvider } from "../ai/ai-provider.js";
import { writeIdentityReportDraft } from "./identity-report-writer.js";

describe("identity report writer", () => {
  it("sends bounded evidence and knowledge only, then returns a non-persisted draft", async () => {
    let request: unknown;
    const provider: AiProvider = {
      async generateStructured(candidate) {
        request = candidate;
        return { ok: false, error: { code: "AI_PROVIDER_NOT_APPROVED", retryable: false } };
      },
    };
    await expect(writeIdentityReportDraft({
      chartVersionId: "chart-1",
      evidence: { version: 1, capabilityId: "ziwei.identity.p0", chartVersionId: "chart-1", ruleVersion: "ziwei.identity.v1", items: [] },
      knowledgePassages: [{ id: "knowledge-1", content: "Noi dung da duoc phe duyet." }],
      provenance: { evidenceVersion: 1, knowledgeVersion: "knowledge.vi.v1", promptVersion: "prompt.v1", templateVersion: "template.v1" },
      provider,
    })).resolves.toMatchObject({ ok: false, error: { code: "AI_PROVIDER_NOT_APPROVED" } });
    expect(JSON.stringify(request)).not.toMatch(/birth|email|order|persist|publish/i);
  });
});
