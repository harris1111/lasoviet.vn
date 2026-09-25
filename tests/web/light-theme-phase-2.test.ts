import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

function sRGBtoLin(c: number): number {
  const v = c / 255;
  return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
}

function luminance(rgb: [number, number, number]): number {
  const [r, g, b] = rgb.map(sRGBtoLin);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrastRatio(hex1: string, hex2: string): number {
  const l1 = luminance(hexToRgb(hex1));
  const l2 = luminance(hexToRgb(hex2));
  const brighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (brighter + 0.05) / (darker + 0.05);
}

describe("Light Theme Phase 2 Contract (FD-088, FD-102, Task #48)", () => {
  it("defines the 14 previously missing tokens and semantic layers in tokens.css", async () => {
    const tokens = await readFile("apps/web/src/styles/tokens.css", "utf8");

    const requiredTokens = [
      "--paper-50",
      "--paper-100",
      "--paper-200",
      "--paper-300",
      "--control-border",
      "--ink-900",
      "--ink-800",
      "--ink-600",
      "--ink-400",
      "--gold-800",
      "--cinnabar-700",
      "--discipline-jade",
      "--discipline-bronze",
      "--discipline-mineral",
      "--discipline-indigo",
    ];

    for (const token of requiredTokens) {
      expect(tokens).toContain(token);
    }

    // Verify theme selector overrides
    expect(tokens).toContain('html[data-theme="light"]');
    expect(tokens).toMatch(/--surface-canvas:\s*var\(--paper-100\)/);
    expect(tokens).toMatch(/--text-body:\s*var\(--ink-800\)/);
  });

  it("marks all required page families with data-light-ready", async () => {
    const filesToCheck = [
      "apps/web/src/app/[locale]/tao-la-so/tu-vi/page.tsx",
      "apps/web/src/app/[locale]/la-so/[chartId]/page.tsx",
      "apps/web/src/app/[locale]/la-so/[chartId]/chon-luan-giai/page.tsx",
      "apps/web/src/app/[locale]/thanh-toan/[orderId]/page.tsx",
      "apps/web/src/app/[locale]/nap-la/page.tsx",
      "apps/web/src/features/reports/report-reader.tsx",
      "apps/web/src/features/reports/report-progress.tsx",
      "apps/web/src/app/[locale]/tai-khoan/layout.tsx",
      "apps/web/src/features/content/public-content-page.tsx",
      "apps/web/src/features/discipline-pages/discipline-page-shell.tsx",
      "apps/web/src/features/free-tools/free-tools-hub.tsx",
      "apps/web/src/features/content/sample-report-page.tsx",
    ];

    for (const filePath of filesToCheck) {
      const content = await readFile(filePath, "utf8");
      expect(content, `Expected ${filePath} to contain data-light-ready`).toContain("data-light-ready");
    }
  });

  it("passes WCAG 2.2 AA contrast standards for all light theme tokens", () => {
    const backgrounds = {
      canvas: "#F6F0E4",
      card: "#FCF8F0",
      subtle: "#EDE4D0",
    };

    const textColors = {
      "ink-900": "#14263D",
      "ink-800": "#1F334A",
      "ink-600": "#4B617A",
      "gold-800": "#755718",
      "cinnabar-700": "#8F3423",
      "discipline-jade": "#2F5446",
      "discipline-bronze": "#5C4A2E",
      "discipline-lapis": "#33566B",
      "discipline-indigo": "#454B63",
    };

    for (const [bgName, bgHex] of Object.entries(backgrounds)) {
      for (const [fgName, fgHex] of Object.entries(textColors)) {
        const ratio = contrastRatio(bgHex, fgHex);
        expect(
          ratio,
          `Expected contrast ratio between ${fgName} (${fgHex}) and ${bgName} (${bgHex}) to be >= 4.5:1, got ${ratio.toFixed(2)}`
        ).toBeGreaterThanOrEqual(4.5);
      }
    }
  });
});
