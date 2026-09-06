import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { AdminOverviewTable } from "./admin-overview-table";

const overview = {
  version: 1 as const,
  accountSummary: { total: 0, verified: 0, anonymous: 0 },
  accountPage: { page: 1, pageSize: 25, total: 0, items: [] },
  modules: [{ id: "outbox" as const, status: "available" as const, summary: { pending: 1, failed: 0 } }],
  health: {
    version: 1 as const,
    status: "degraded" as const,
    checkedAt: "2026-09-03T00:00:00+00:00",
    dependencies: [
      { name: "postgres" as const, status: "ready" as const },
      { name: "commerce_workflow" as const, status: "unavailable" as const },
      { name: "report_generation" as const, status: "unavailable" as const },
      { name: "asset_delivery" as const, status: "unavailable" as const },
      { name: "support_workflow" as const, status: "unavailable" as const },
      { name: "privacy_workflow" as const, status: "unavailable" as const },
    ],
  },
};

describe("admin overview table", () => {
  it("renders populated masked values and pagination without forbidden fields", () => {
    const populated = {
      ...overview,
      accountPage: {
        page: 2, pageSize: 25, total: 60,
        items: [{
          id: "acct_opaque_7f3",
          verification: "verified" as const,
          ownership: "account" as const,
          createdAt: "2026-09-03T00:00:00+00:00",
        }],
      },
    };
    const rendered = renderToStaticMarkup(
      createElement(AdminOverviewTable, { overview: populated, filters: { page: 2, pageSize: 25 } }),
    );

    expect(rendered).toContain("acct_opaque_7f3");
    expect(rendered).toContain("?page=1&amp;pageSize=25");
    expect(rendered).toContain("?page=3&amp;pageSize=25");
    expect(rendered).not.toContain("private@example.test");
    expect(rendered).not.toContain("secret-token");
    expect(rendered).not.toContain("report body");
  });

  it("renders authorized empty and all safe error states", () => {
    expect(renderToStaticMarkup(
      createElement(AdminOverviewTable, { overview, filters: { page: 1, pageSize: 25 } }),
    )).toContain("No account records.");
    expect(renderToStaticMarkup(
      createElement(AdminOverviewTable, { error: "invalid_filters" }),
    )).toContain("Overview filter is invalid.");
    expect(renderToStaticMarkup(
      createElement(AdminOverviewTable, {}),
    )).toContain("Overview unavailable.");
  });

  it("removes the readiness header and dependency states when health is absent", () => {
    const rendered = renderToStaticMarkup(
      createElement(AdminOverviewTable, {
        overview: { ...overview, health: null },
        filters: { page: 1, pageSize: 25 },
      }),
    );

    expect(rendered).not.toContain("Readiness");
    expect(rendered).not.toContain("postgres");
    expect(rendered).not.toContain("degraded");
  });
});
