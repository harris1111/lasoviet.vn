import { createElement } from "react";

import type {
  AdminAuditPageV1,
  AdminAuditSearchFiltersV1,
} from "@lasoviet/contracts";

const h = createElement;

function queryString(filters: AdminAuditSearchFiltersV1, cursor: string): string {
  const values = new URLSearchParams();
  for (const [key, value] of Object.entries({ ...filters, cursor })) {
    if (value !== undefined && value !== "") values.set(key, String(value));
  }
  return values.toString();
}

export function AuditLogTable(props: {
  page?: AdminAuditPageV1;
  filters: AdminAuditSearchFiltersV1;
}) {
  if (props.page === undefined) {
    return h("p", { role: "alert" }, "Audit records are unavailable.");
  }
  const rows = props.page.items.length === 0
    ? [h("tr", { key: "empty" }, h("td", { colSpan: 5 }, "No audit records."))]
    : props.page.items.map((entry) => h("tr", { key: entry.id },
      h("td", null, entry.createdAt),
      h("td", null, entry.operation),
      h("td", null, `${entry.target.type}:${entry.target.id}`),
      h("td", null, entry.result),
      h("td", null, entry.traceId)));
  return h("section", { "aria-labelledby": "audit-log-heading" },
    h("h2", { id: "audit-log-heading" }, "Audit log"),
    h("form", { className: "admin-audit-filter" },
      h("label", null, "From", h("input", { name: "dateFrom", type: "text", maxLength: 35 })),
      h("label", null, "To", h("input", { name: "dateTo", type: "text", maxLength: 35 })),
      h("label", null, "Actor ID", h("input", { name: "actorId", maxLength: 128 })),
      h("label", null, "Operation", h("input", { name: "operation", maxLength: 96 })),
      h("label", null, "Target type", h("input", { name: "targetType", maxLength: 64 })),
      h("label", null, "Target ID", h("input", { name: "targetId", maxLength: 128 })),
      h("label", null, "Trace ID", h("input", { name: "traceId", maxLength: 128 })),
      h("label", null, "Result", h("select", { name: "result", defaultValue: "" },
        h("option", { value: "" }, "All"),
        h("option", { value: "allowed" }, "Allowed"),
        h("option", { value: "denied" }, "Denied"))),
      h("input", { name: "pageSize", type: "hidden", value: String(props.filters.pageSize) }),
      h("button", { type: "submit" }, "Filter")),
    h("div", { className: "admin-table-wrap" },
      h("table", { className: "admin-table" },
        h("thead", null, h("tr", null,
          ["Time", "Operation", "Target", "Result", "Trace"].map((label) =>
            h("th", { key: label }, label)))),
        h("tbody", null, rows))),
    props.page.nextCursor === undefined || props.page.nextCursor === null
      ? null
      : h("a", {
        href: `?${queryString(props.filters, props.page.nextCursor)}`,
      }, "Next"),
  );
}
