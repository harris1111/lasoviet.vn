import { describe, expect, it } from "vitest";
import { loadEnvironment } from "./load-environment.js";

describe("free palace generation environment", () => {
  it("defaults off without requiring provider credentials", () => {
    const result = loadEnvironment({ SEPAY_ENV: "disabled" });
    expect(result.ok && result.value.freePalaceGenerationEnabled).toBe(false);
  });
  it.each(["TRUE", "1", "yes", "", "true"])("fails closed for %j without approved AI", (value) => {
    expect(loadEnvironment({ SEPAY_ENV: "disabled", FREE_PALACE_GENERATION_ENABLED: value }).ok).toBe(false);
  });
});
