import { describe, expect, it } from "vitest";
import {
  getSitemapIndexEntries,
  getSitemapSectionUrls,
  sitemapSections,
} from "./sitemap-registry";

describe("sitemap registry exclusions", () => {
  it("never includes /thong-bao/huy-dang-ky in sitemap index or any section", () => {
    const indexEntries = getSitemapIndexEntries();
    for (const entry of indexEntries) {
      expect(entry.url).not.toContain("/thong-bao/huy-dang-ky");
    }

    for (const section of sitemapSections) {
      const sectionUrls = getSitemapSectionUrls(section);
      for (const entry of sectionUrls) {
        expect(entry.url).not.toContain("/thong-bao/huy-dang-ky");
      }
    }
  });
});
