import { describe, expect, it } from "vitest";

import type { AiProvider } from "./ai-provider.js";
import { runAiCapabilityProbe } from "./capability-probe.js";

describe("AI capability probe", () => {
  it("uses a no-PII synthetic request and verifies sentinel/provider/model", async () => {
    let request: Parameters<AiProvider["generateStructured"]>[0] | undefined;
    const provider: AiProvider = {
      async generateStructured(candidate) {
        request = candidate;
        return { ok: true, value: { value: { sentinel: "LASOVIET_CAPABILITY_PROBE_V1", boundedValue: "ok" }, providerId: "openrouter", modelId: "gpt-5.6-luna" } };
      },
    };

    await expect(runAiCapabilityProbe(provider)).resolves.toEqual({
      ok: true,
      value: { providerId: "openrouter", modelId: "gpt-5.6-luna" },
    });
    expect(request).toMatchObject({ use: "synthetic_capability_probe" });
    expect(JSON.stringify(request)).not.toMatch(/birth|chart|order|report|email/i);
  });

  it("rejects an empty provider ID while preserving other probe checks", async () => {
    const provider: AiProvider = {
      async generateStructured() {
        return {
          ok: true,
          value: {
            value: { sentinel: "LASOVIET_CAPABILITY_PROBE_V1", boundedValue: "ok" },
            providerId: " ",
            modelId: "deepseek/deepseek-v4.1-flash",
          },
        };
      },
    };

    await expect(runAiCapabilityProbe(provider)).resolves.toEqual({
      ok: false,
      error: { code: "AI_CAPABILITY_UNSUPPORTED", retryable: false },
    });
  });
});
