import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

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
    expect(cssCode).toContain('html[data-theme="light"] .hv3-chart');
  });

  it("ensures layout preloads the active theme and viewport hero image before paint", () => {
    const layoutCode = fs.readFileSync(
      path.resolve(process.cwd(), "apps/web/src/app/[locale]/layout.tsx"),
      "utf8",
    );

    expect(layoutCode).toContain('rel="preload"');
    expect(layoutCode).toContain('as="image"');
    expect(layoutCode).toContain("/images/lasoviet/v10/la-so-tu-vi-tranh-son-hero-");
    expect(layoutCode).toContain('"-mobile":"-desktop"');
  });

  it("ensures ticker has off-screen content-visibility optimization", () => {
    const cssCode = fs.readFileSync(
      path.resolve(process.cwd(), "apps/web/src/styles/homepage-v3.css"),
      "utf8",
    );

    expect(cssCode).toContain("content-visibility: auto;");
  });
});
