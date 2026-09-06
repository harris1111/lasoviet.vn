import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { AuditLogTable } from "./audit-log-table";

describe("audit log table", () => {
  it("renders a keyset next link that retains active filters", () => {
    const rendered = renderToStaticMarkup(createElement(AuditLogTable, {
      filters: { pageSize: 25, operation: "admin.role.assigned" },
      page: {
        pageSize: 25,
        nextCursor: "2026-09-03T00:00:00.000Z|00000000-0000-4000-8000-000000000001",
        items: [],
      },
    }));

    expect(rendered).toContain("cursor=2026-09-03T00%3A00%3A00.000Z%7C00000000-0000-4000-8000-000000000001");
    expect(rendered).toContain("operation=admin.role.assigned");
    expect(rendered).not.toContain("page=");
  });
});
