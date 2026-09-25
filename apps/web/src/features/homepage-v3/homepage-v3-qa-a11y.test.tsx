import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";

import { HomepageV3Hero } from "./homepage-v3-hero";
import { HomepageV3Compare } from "./homepage-v3-compare";
import { HomepageV3Usp } from "./homepage-v3-static-sections";
import { HomepageV3Faq } from "./homepage-v3-faq";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: any) =>
    createElement("a", { href, ...props }, children),
}));

vi.mock("next-intl", () => {
  const viMessages = JSON.parse(
    fs.readFileSync(
      path.resolve(__dirname, "../../../messages/vi/homepage-v3.json"),
      "utf8",
    ),
  );

  return {
    useTranslations: (ns: string) => {
      const section = ns.replace("homepage-v3.", "");
      const msgs = viMessages[section] ?? {};

      const t = (key: string, values?: Record<string, unknown>) => {
        const parts = key.split(".");
        let current: any = msgs;
        for (const p of parts) {
          current = current?.[p];
        }
        let val = typeof current === "string" ? current : key;
        if (values) {
          for (const [k, v] of Object.entries(values)) {
            val = val.replace(new RegExp(`\\{${k}\\}`, "g"), String(v));
          }
        }
        return val;
      };

      t.has = (key: string) => {
        const parts = key.split(".");
        let current: any = msgs;
        for (const p of parts) {
          if (current == null) return false;
          current = current[p];
        }
        return current !== undefined;
      };

      return t;
    },
  };
});

describe("Task #45: Homepage QA on real devices & accessibility verification", () => {
  it("Requirement 1: HH/MM and date inputs have numeric keypad triggers (inputMode and pattern) for mobile Safari and Android", () => {
    const html = renderToStaticMarkup(createElement(HomepageV3Hero, { locale: "vi" }));

    // Date inputs
    expect(html).toContain('id="hv3-day"');
    expect(html).toContain('pattern="[0-9]*"');
    expect(html).toContain('inputMode="numeric"');

    // HH/MM inputs
    expect(html).toContain('id="hv3-hour"');
    expect(html).toContain('id="hv3-minute"');
    expect(html).toContain('placeholder="HH"');
    expect(html).toContain('placeholder="MM"');
  });

  it("Requirement 2: Keyboard and ARIA state in FAQ, comparison tabs, and theme toggle controls", () => {
    const compareHtml = renderToStaticMarkup(createElement(HomepageV3Compare));
    expect(compareHtml).toContain('role="group"');
    expect(compareHtml).toContain('aria-pressed="true"');
    expect(compareHtml).toContain('aria-pressed="false"');

    const faqHtml = renderToStaticMarkup(createElement(HomepageV3Faq, { locale: "vi" }));
    expect(faqHtml).toContain('aria-expanded="true"');
    expect(faqHtml).toContain('aria-controls="hv3-faq-q1"');
  });

  it("Requirement 3: VoiceOver and TalkBack semantics — live region, table semantics, hero art group, and USP cards", () => {
    // 3a. Hero art group and atomic live region for time
    const heroHtml = renderToStaticMarkup(createElement(HomepageV3Hero, { locale: "vi" }));
    expect(heroHtml).toContain('role="group" aria-label="Mệnh thư tương tác cùng thông tin ngày giờ sinh"');
    expect(heroHtml).toContain('class="hv3-folio-detail" aria-live="polite" aria-atomic="true"');

    // 3b. Comparison table semantics on desktop
    const compareHtml = renderToStaticMarkup(createElement(HomepageV3Compare));
    expect(compareHtml).toContain('<table class="hv3-compare-table" role="table">');
    expect(compareHtml).toContain('<thead role="rowgroup">');
    expect(compareHtml).toContain('<tbody role="rowgroup">');
    expect(compareHtml).toContain('<tfoot role="rowgroup">');
    expect(compareHtml).toContain('role="columnheader"');
    expect(compareHtml).toContain('role="rowheader"');
    expect(compareHtml).toContain('role="cell"');

    // 3c. Four USP cards with region and labelledby
    const uspHtml = renderToStaticMarkup(createElement(HomepageV3Usp));
    expect(uspHtml).toContain('role="region"');
    expect(uspHtml).toContain('aria-labelledby="hv3-usp-n1-title"');
    expect(uspHtml).toContain('aria-labelledby="hv3-usp-n2-title"');
    expect(uspHtml).toContain('aria-labelledby="hv3-usp-n3-title"');
    expect(uspHtml).toContain('aria-labelledby="hv3-usp-n4-title"');
    expect(uspHtml).toContain('id="hv3-usp-n1-title"');
    expect(uspHtml).toContain('id="hv3-usp-n2-title"');
    expect(uspHtml).toContain('id="hv3-usp-n3-title"');
    expect(uspHtml).toContain('id="hv3-usp-n4-title"');
  });

  it("Requirement 4 & 5: CSS rules ensure WCAG AA contrast scrims, 320px responsive containment, focus rings, and reduced motion", () => {
    const cssPath = path.resolve(__dirname, "../../styles/homepage-v3.css");
    const css = fs.readFileSync(cssPath, "utf8");

    // 4. Contrast overlays
    expect(css).toContain(".hv3-usp-dark .hv3-usp-scrim");
    expect(css).toContain("rgba(16, 14, 11, 0.94)"); // High opacity dark scrim for WCAG AA
    expect(css).toContain(".hv3-usp-paper .hv3-usp-scrim");
    expect(css).toContain("rgba(242, 227, 203, 0.96)"); // High opacity paper scrim for WCAG AA
    expect(css).toContain("rgba(15, 13, 10, 0.96) 0%, rgba(15, 13, 10, 0.92) 48%"); // Story backdrop
    expect(css).toContain("rgba(246, 240, 228, 0.98)"); // About backdrop

    // Focus rings
    expect(css).toContain(".site-header a:focus-visible");
    expect(css).toContain(".hv3-folio-lenses button:focus-visible");
    expect(css).toContain(".hv3-story-panel :focus-visible");
    expect(css).toContain(".hv3-about-panel :focus-visible");

    // 1 & 5. 320px containment and reduced motion
    expect(css).toContain("@media (max-width: 767px)");
    expect(css).toContain(".hv3-folio-lenses button { flex: 1 1 0; min-width: 0; min-height: 38px; font-size: clamp(9px, 2.6vw, 12px)");
    expect(css).toContain("@media (prefers-reduced-motion: reduce)");
    expect(css).toContain(".hv3-ticker { animation: none;");
  });
});
