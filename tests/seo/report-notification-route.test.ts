import { describe, expect, it } from "vitest";
import { routeRegistry } from "@lasoviet/config";
import { getSitemapIndexEntries } from "../../apps/web/src/seo/sitemap-registry";
describe("report notification private routes", () => {
  it.each(["api.backend.report.notification", "api.web.report.notification"])("keeps %s private and out of every sitemap", id => {
    const route = routeRegistry.find(x => x.id === id);
    expect(route).toMatchObject({private: true,status: "live_noindex",sitemap: false,robots: "noindex,nofollow"});
    expect(getSitemapIndexEntries().some(x => x.url.includes("/notification"))).toBe(false);
  });
});
