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

  it("ensures hero component loads only one theme image at a time with responsive srcset", () => {
    const heroCode = fs.readFileSync(
      path.resolve(process.cwd(), "apps/web/src/features/homepage-v3/homepage-v3-hero.tsx"),
      "utf8",
    );

    // Must NOT contain the old dual simultaneous img tags
    expect(heroCode).not.toContain('className="hv3-folio-img hv3-folio-dark"');
    expect(heroCode).not.toContain('className="hv3-folio-img hv3-folio-light"');

    // Must dynamically render active theme's image with key and srcset
    expect(heroCode).toContain("lsv-hero-open-${theme}.webp");
    expect(heroCode).toContain("lsv-hero-open-${theme}-700.webp 700w");
  });

  it("ensures layout preloads active theme hero image before paint", () => {
    const layoutCode = fs.readFileSync(
      path.resolve(process.cwd(), "apps/web/src/app/[locale]/layout.tsx"),
      "utf8",
    );

    expect(layoutCode).toContain('rel="preload"');
    expect(layoutCode).toContain('as="image"');
    expect(layoutCode).toContain("lsv-hero-open-light");
    expect(layoutCode).toContain("lsv-hero-open-dark");
  });

  it("ensures ticker has off-screen content-visibility optimization", () => {
    const cssCode = fs.readFileSync(
      path.resolve(process.cwd(), "apps/web/src/styles/homepage-v3.css"),
      "utf8",
    );

    expect(cssCode).toContain("content-visibility: auto;");
  });
});
