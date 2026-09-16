import { readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

const tokensPath = "apps/web/src/styles/tokens.css";
const corePath = "apps/web/src/styles/ui-core.css";

describe("UI core token contract", () => {
  it("defines the approved semantic primitive tokens", async () => {
    const tokens = await readFile(tokensPath, "utf8");

    for (const token of [
      "--jade-500",
      "--radius-card: 8px",
      "--radius-field: 8px",
      "--radius-pill: 9999px",
      "--control-height: 44px",
      "--control-height-primary: 48px",
      "--field-height: 56px",
      "--reading-width: 720px",
      "--section-space-desktop: 88px",
      "--section-space-mobile: 56px",
      "--surface-shadow",
    ]) {
      expect(tokens).toContain(token);
    }
  });

  it("uses semantic variables instead of raw colors in UI core", async () => {
    const core = await readFile(corePath, "utf8");

    expect(core).not.toMatch(/#[0-9a-f]{3,8}\b/i);
    expect(core).not.toMatch(/\brgba?\(/i);
    expect(core).toContain("var(--font-ui)");
    expect(core).toContain("var(--font-display)");
  });

  it("keeps all default primitive text at 14px or above", async () => {
    const core = await readFile(corePath, "utf8");
    const fontSizes = [...core.matchAll(/font:\s*(?:\d+\s+)?(\d+)px\//g)]
      .map((match) => Number(match[1]));

    expect(fontSizes.length).toBeGreaterThan(0);
    expect(Math.min(...fontSizes)).toBeGreaterThanOrEqual(14);
  });
});
