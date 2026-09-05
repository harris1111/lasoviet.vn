import { describe, expect, it } from "vitest";

import { routeRegistry } from "@lasoviet/config";

describe("discipline route migration and redirects", () => {
  it("defines canonical routes and archived 301 redirect records for legacy paths", () => {
    const requiredCanonicalRoutes = [
      { id: "calculator.tu-vi", path: "/tu-vi", template: "calculator-landing", status: "live_indexable" },
      { id: "calculator.bat-tu", path: "/bat-tu", template: "discipline-flagship", status: "live_noindex" },
      { id: "calculator.kinh-dich", path: "/kinh-dich", template: "discipline-flagship", status: "live_noindex" },
      { id: "calculator.western-natal", path: "/chiem-tinh", template: "discipline-flagship", status: "live_noindex" },
      { id: "calculator.numerology", path: "/than-so-hoc", template: "discipline-flagship", status: "live_noindex" },
      { id: "utility.root", path: "/cong-cu-mien-phi", template: "free-tools-hub", status: "live_noindex" },
      { id: "utility.good-days", path: "/ngay-tot", template: "utility-preview", status: "live_noindex" },
      { id: "utility.zodiac", path: "/12-con-giap", template: "utility-preview", status: "live_noindex" },
      { id: "content.dream-symbols", path: "/giai-ma-giac-mo", template: "utility-preview", status: "live_noindex" },
      { id: "calculator.tarot", path: "/boi-bai", template: "utility-preview", status: "live_noindex" },
      { id: "utility.lunar-calendar", path: "/lich-am", template: "utility-preview", status: "live_noindex" },
      { id: "utility.feng-shui", path: "/phong-thuy/huong-nha", template: "gated-preview", status: "live_noindex" },
      { id: "utility.palmistry", path: "/xem-chi-tay", template: "gated-preview", status: "live_noindex" },
    ];

    for (const expected of requiredCanonicalRoutes) {
      const match = routeRegistry.find((r) => r.id === expected.id);
      expect(match).toBeDefined();
      expect(match).toMatchObject({
        path: expected.path,
        template: expected.template,
        status: expected.status,
        sitemap: expected.status === "live_indexable",
        private: false,
        purchasable: false,
      });
      if (expected.status === "live_noindex") {
        expect(match).toMatchObject({
          indexing: "noindex_follow",
          robots: "noindex,follow",
          content: "reviewed",
          reviewer: "content-team",
          localeOwners: ["vi", "en"],
        });
      }
    }

    const archivedRedirects = [
      { path: "/la-so-tu-vi", target: "/tu-vi" },
      { path: "/la-so-bat-tu", target: "/bat-tu" },
      { path: "/gieo-que-kinh-dich", target: "/kinh-dich" },
      { path: "/ban-do-sao", target: "/chiem-tinh" },
      { path: "/boi-bai/tarot", target: "/boi-bai" },
    ];

    for (const redirect of archivedRedirects) {
      const match = routeRegistry.find((r) => r.path === redirect.path);
      expect(match).toBeDefined();
      expect(match).toMatchObject({
        status: "archived",
        sitemap: false,
        redirect: {
          disposition: "301",
          target: redirect.target,
        },
      });
      expect(match?.intent).toBeDefined();
      expect(match?.intent).not.toBe("");
    }
  });
});
