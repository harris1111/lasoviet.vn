import { describe, expect, it } from "vitest";
import { loadEnvironment } from "./load-environment.js";

describe("funnel recovery environment", () => {
  it("defaults disabled without requiring any vendor credentials", () => {
    const result = loadEnvironment({ SEPAY_ENV: "disabled" });
    expect(result.ok && result.value.funnelRecoveryMode).toBe("disabled");
  });
  it("accepts capture mode without enabling a delivery provider", () => {
    const result = loadEnvironment({ SEPAY_ENV: "disabled", FUNNEL_RECOVERY_MODE: "capture" });
    expect(result.ok && result.value.funnelRecoveryMode).toBe("capture");
    expect(result.ok && result.value.smtp.enabled).toBe(false);
    expect(result.ok && result.value.freePalaceGenerationEnabled).toBe(false);
  });
  it.each(["send", "true", "CAPTURE", "", "capture "])("rejects %j instead of enabling delivery", mode => {
    expect(loadEnvironment({ SEPAY_ENV: "disabled", FUNNEL_RECOVERY_MODE: mode }).ok).toBe(false);
  });
});
