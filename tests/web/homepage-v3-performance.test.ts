import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { SITE_THEME_BOOTSTRAP } from "../../apps/web/src/features/theme/site-theme-bootstrap";

describe("Homepage V3 Performance & Responsive Assets (Task #44)", () => {
  const imagesDir = path.resolve(process.cwd(), "apps/web/public/images/lasoviet/v3");

  it("provides responsive srcset images for hero, story, about, usp, and disciplines", () => {
    const requiredImages = [
      // Hero responsive versions
      "lsv-hero-open-dark.webp",
      "lsv-hero-open-dark-700.webp",
      "lsv-hero-open-light.webp",
      "lsv-hero-open-light-700.webp",
      // Story responsive versions
      "lsv-story-dusk.webp",
      "lsv-story-dusk-768.webp",
      // About responsive versions
      "lsv-archive-light.webp",
      "lsv-archive-light-768.webp",
      // USP responsive versions
      "lsv-usp-tang-thu.webp",
      "lsv-usp-tang-thu-768.webp",
      "lsv-usp-ca-nhan.webp",
      "lsv-usp-ca-nhan-768.webp",
      // Discipline responsive versions
      "lsv-discipline-tu-vi.webp",
      "lsv-discipline-tu-vi-560.webp",
      "lsv-discipline-bat-tu.webp",
      "lsv-discipline-bat-tu-560.webp",
      "lsv-discipline-kinh-dich.webp",
      "lsv-discipline-kinh-dich-560.webp",
      "lsv-discipline-chiem-tinh.webp",
      "lsv-discipline-chiem-tinh-560.webp",
      "lsv-discipline-than-so.webp",
      "lsv-discipline-than-so-560.webp",
    ];

    for (const img of requiredImages) {
      const fullPath = path.join(imagesDir, img);
      expect(fs.existsSync(fullPath), `Asset ${img} must exist`).toBe(true);
      const stats = fs.statSync(fullPath);
      expect(stats.size).toBeGreaterThan(0);
    }
  });

  it("paints the hero art from CSS so only the active theme and viewport image is requested", () => {
    const cssCode = fs.readFileSync(
      path.resolve(process.cwd(), "apps/web/src/styles/homepage-v3.css"),
      "utf8",
    );
    const chartCode = fs.readFileSync(
      path.resolve(process.cwd(), "apps/web/src/features/homepage-v3/homepage-v3-hero-chart.tsx"),
      "utf8",
    );

    // No <img> pair rendered from React state: hydration cannot leave the wrong theme's art in place.
    expect(chartCode).not.toContain("<img");
    for (const theme of ["dark", "light"]) {
      for (const viewport of ["desktop", "mobile"]) {
        expect(cssCode).toContain(`la-so-tu-vi-tranh-son-hero-${theme}-${viewport}.webp`);
      }
    }
    // 2026-10-02 hotfix (docs/qa/2026-10-02-homepage-light-theme-handoff.md §3.1):
    // this rule (and the other light-theme rules in homepage-v3.css/global.css)
    // must stay guarded on `:has([data-light-ready])`, or a saved light
    // preference repaints it on routes — starting with the Trời Nam homepage —
    // that have no light styling at all.
    expect(cssCode).toContain('html[data-theme="light"]:has([data-light-ready]) .hv3-chart');
  });

  it("does not preload the retired V10 hero image, and forces dark on routes without data-light-ready", () => {
    // 2026-10-02 hotfix: the V10 hero this used to preload belongs to the old
    // homepage; the live Trời Nam hero (troi-nam-hero.tsx) already renders
    // with fetchPriority="high" and needs no separate preload <link>. The
    // old unconditional "apply saved/OS theme on every route" bootstrap is
    // also what caused the saved-light bug — see
    // apps/web/src/app/[locale]/theme-bootstrap.test.ts for the full route
    // matrix regression test of its replacement.
    const layoutCode = fs.readFileSync(
      path.resolve(process.cwd(), "apps/web/src/app/[locale]/layout.tsx"),
      "utf8",
    );

    expect(layoutCode).not.toContain("/images/lasoviet/v10/la-so-tu-vi-tranh-son-hero-");
    const root = { dataset: {} as Record<string, string>, style: {} };
    const doc = Object.assign(new EventTarget(), { documentElement: root, querySelector: () => null, querySelectorAll: () => [], readyState: "loading" });
    const win = Object.assign(new EventTarget(), { document: doc, location: { pathname: "/en/dang-nhap" },
      matchMedia: () => Object.assign(new EventTarget(), { matches: true }), localStorage: { getItem: () => "light" },
      MutationObserver: class { observe() {} },
    });
    new Function("window", SITE_THEME_BOOTSTRAP)(win);
    expect(root.dataset.theme).toBe("dark");
  });

  it("ensures ticker has off-screen content-visibility optimization", () => {
    const cssCode = fs.readFileSync(
      path.resolve(process.cwd(), "apps/web/src/styles/homepage-v3.css"),
      "utf8",
    );

    expect(cssCode).toContain("content-visibility: auto;");
  });
  it("keeps homepage motion cheap and optional", () => {
    const motionCode = fs.readFileSync(
      path.resolve(process.cwd(), "apps/web/src/features/homepage-v3/homepage-v3-motion.tsx"),
      "utf8",
    );
    const motionCss = fs.readFileSync(
      path.resolve(process.cwd(), "apps/web/src/styles/homepage-v3-motion.css"),
      "utf8",
    );

    // One passive scroll listener, batched to animation frames.
    expect(motionCode).toContain('addEventListener("scroll", schedule, { passive: true })');
    expect(motionCode).toContain("requestAnimationFrame");
    // Reduced motion: the script only reveals content; CSS keeps every effect behind no-preference.
    expect(motionCode).toContain("prefers-reduced-motion: reduce");
    expect(motionCss).toContain("@media (prefers-reduced-motion: no-preference)");
    expect(motionCss).toContain("(hover: hover) and (pointer: fine)");
    // Title reveal must not use clip-path: it hides the heading from IntersectionObserver.
    expect(motionCss).not.toMatch(/data-reveal="title"\][^{]*\{[^}]*clip-path/);
  });
});
