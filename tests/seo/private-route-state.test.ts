import { readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

import { routeRegistry } from "@lasoviet/config";

import {
  getSitemapIndexEntries,
} from "../../apps/web/src/seo/sitemap-registry";

describe("admin private route state", () => {
  it("registers implemented admin routes as private live_noindex and excludes them from every sitemap", () => {
    const adminRoute = routeRegistry.find((route) => route.id === "admin.overview");

    expect(adminRoute).toMatchObject({
      path: "/admin",
      status: "live_noindex",
      private: true,
      sitemap: false,
      robots: "noindex,nofollow",
    });
    expect(getSitemapIndexEntries().map((entry) => entry.url)).not.toContain(
      "https://lasoviet.vn/admin",
    );
    expect(getSitemapIndexEntries().map((entry) => entry.url)).not.toContain(
      "https://lasoviet.vn/en/admin",
    );
    const auditRoute = routeRegistry.find((route) => route.id === "admin.audit");
    expect(auditRoute).toMatchObject({
      path: "/admin/audit",
      status: "live_noindex",
      private: true,
      sitemap: false,
      robots: "noindex,nofollow",
    });
  });

  it("keeps the admin route out of public navigation", async () => {
    const header = await readFile(
      "apps/web/src/components/site-header.tsx",
      "utf8",
    );

    expect(header).not.toContain('"/admin"');
  });
});
