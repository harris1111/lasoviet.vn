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
  it("renders authorized empty state and a safe unavailable error", () => {
    expect(renderToStaticMarkup(
      createElement(AdminOverviewTable, { overview, filters: { page: 1, pageSize: 25 } }),
    )).toContain("No account records.");
    expect(renderToStaticMarkup(
      createElement(AdminOverviewTable, { error: "invalid_filters" }),
    )).toContain("Overview filter is invalid.");
  });
});
