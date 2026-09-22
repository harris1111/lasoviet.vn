import { readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

const tokensPath = "apps/web/src/styles/tokens.css";
const corePath = "apps/web/src/styles/ui-core.css";

describe("UI core token contract", () => {
  it("defines the approved semantic primitive tokens", async () => {
    const tokens = await readFile(tokensPath, "utf8");

    for (const token of [
      "--jade-500",
      "--radius-card: 16px",
      "--radius-field: 12px",
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

  it("enforces touch target >= 44px across all wizard and hero controls", async () => {
    const wizardCss = await readFile("apps/web/src/styles/birth-profile-wizard.css", "utf8");
    const globalCss = await readFile("apps/web/src/styles/global.css", "utf8");

    // Wizard mode buttons (exact time vs branch)
    expect(wizardCss).toMatch(/\.wizard-mode-button\s*\{[^}]*min-height:\s*var\(--control-height,\s*44px\)/s);
    expect(wizardCss).toMatch(/\.wizard-mode-button\s*\{[^}]*min-width:\s*44px/s);

    // Wizard cache clear
    expect(wizardCss).toMatch(/\.wizard-cache-clear\s*\{[^}]*min-height:\s*var\(--control-height,\s*44px\)/s);
    expect(wizardCss).toMatch(/\.wizard-cache-clear\s*\{[^}]*min-width:\s*44px/s);

    // Hero cache clear
    expect(globalCss).toMatch(/\.hero-cache-clear\s*\{[^}]*min-height:\s*44px/s);
    expect(globalCss).toMatch(/\.hero-cache-clear\s*\{[^}]*min-width:\s*44px/s);

    // Hero time mode buttons
    expect(globalCss).toMatch(/\.hero-mode-btn\s*\{[^}]*min-height:\s*44px/s);
    expect(globalCss).toMatch(/\.hero-mode-btn\s*\{[^}]*min-width:\s*44px/s);

    // Calendar native trigger button
    expect(wizardCss).toMatch(/\.birth-date-calendar-button\s*\{[^}]*min-height:\s*44px/s);
    expect(wizardCss).toMatch(/\.birth-date-calendar-button\s*\{[^}]*min-width:\s*44px/s);

    // Context skip button
    expect(wizardCss).toMatch(/\.wizard-context-skip-btn\s*\{[^}]*min-height:\s*var\(--control-height,\s*44px\)/s);
    expect(wizardCss).toMatch(/\.wizard-context-skip-btn\s*\{[^}]*min-width:\s*44px/s);
  });
});
