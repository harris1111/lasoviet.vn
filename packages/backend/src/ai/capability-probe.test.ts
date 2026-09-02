import { describe, expect, it } from "vitest";

import type { AiProvider } from "./ai-provider.js";
import { runAiCapabilityProbe } from "./capability-probe.js";

describe("AI capability probe", () => {
  it("uses a no-PII synthetic request and verifies sentinel/provider/model", async () => {
    let request: Parameters<AiProvider["generateStructured"]>[0] | undefined;
    const provider: AiProvider = {
      async generateStructured(candidate) {
        request = candidate;
        return { ok: true, value: { value: { sentinel: "LASOVIET_CAPABILITY_PROBE_V1", boundedValue: "ok" }, providerId: "9router-an", modelId: "synthetic-model" } };
      },
    };

    await expect(runAiCapabilityProbe(provider, "synthetic-model")).resolves.toEqual({
      ok: true,
      value: { providerId: "9router-an", modelId: "synthetic-model" },
    });
    expect(request).toMatchObject({ use: "synthetic_capability_probe" });
    expect(JSON.stringify(request)).not.toMatch(/birth|chart|order|report|email/i);
  });
});
