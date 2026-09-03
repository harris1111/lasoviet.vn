import { createElement } from "react";

import type {
  AdminOverviewFiltersV1,
  AdminOverviewV1,
} from "@lasoviet/contracts";

type AdminOverviewTableProps = {
  overview?: AdminOverviewV1;
  filters?: AdminOverviewFiltersV1;
  error?: "invalid_filters";
};

const h = createElement;

function stateClass(status: string): string {
  return status === "ready" || status === "available"
    ? "admin-state admin-state-ready"
    : "admin-state admin-state-unready";
}

export function AdminOverviewTable({
  overview,
  filters,
  error,
}: AdminOverviewTableProps) {
  if (overview === undefined) {
    return h(
      "p",
      { className: "admin-overview-error", role: "alert" },
      error === "invalid_filters" ? "Overview filter is invalid." : "Overview unavailable.",
    );
  }

  const accountPage = overview.accountPage;
  const page = filters?.page ?? 1;
  const pageSize = filters?.pageSize ?? 25;
  const next = accountPage !== null && page * pageSize < accountPage.total ? page + 1 : page;
  const table = (headers: string[], rows: ReturnType<typeof h>[]) => h(
    "div",
    { className: "admin-table-wrap" },
    h("table", { className: "admin-table" },
      h("thead", null, h("tr", null, headers.map((header) => h("th", { key: header }, header)))),
      h("tbody", null, rows)),
  );

  const readiness = table(["Dependency", "Status"], overview.health.dependencies.map(
    (dependency) => h("tr", { key: dependency.name },
      h("td", null, dependency.name.replaceAll("_", " ")),
      h("td", null, h("span", { className: stateClass(dependency.status) }, dependency.status))),
  ));
  const modules = table(["Module", "Status", "Summary"], overview.modules.map(
    (module) => h("tr", { key: module.id },
      h("td", null, module.id),
      h("td", null, h("span", { className: stateClass(module.status) }, module.status)),
      h("td", null, module.status === "unavailable"
        ? "Unavailable"
        : Object.entries(module.summary).map(([key, value]) => `${key}: ${value}`).join(", "))),
  ));
  const accounts = accountPage === null ? null : h(
    "section",
    { "aria-labelledby": "admin-accounts-heading" },
    h("div", { className: "admin-table-heading" },
      h("h2", { id: "admin-accounts-heading" }, "Accounts"),
      h("form", null,
        h("input", { name: "page", type: "hidden", value: "1" }),
        h("label", null, "Rows",
          h("select", { "aria-label": "Rows per page", defaultValue: pageSize, name: "pageSize" },
            [10, 25, 50].map((value) => h("option", { key: value, value }, value))),
        h("button", { type: "submit" }, "Apply")))),
    table(["Account", "Verification", "Ownership", "Created"], accountPage.items.length === 0
      ? [h("tr", { key: "empty" }, h("td", { colSpan: 4 }, "No account records."))]
      : accountPage.items.map((account) => h("tr", { key: account.id },
        h("td", null, account.id), h("td", null, account.verification),
        h("td", null, account.ownership), h("td", null, account.createdAt)))),
    h("nav", { "aria-label": "Account pages", className: "admin-pagination" },
      h("a", {
        "aria-disabled": page === 1,
        href: `?page=${Math.max(1, page - 1)}&pageSize=${pageSize}`,
      }, "Previous"),
      h("span", null, `Page ${accountPage.page}`),
      h("a", {
        "aria-disabled": next === page,
        href: `?page=${next}&pageSize=${pageSize}`,
      }, "Next")),
  );

  return h("main", { className: "admin-overview container" },
    h("header", { className: "admin-overview-header" },
      h("div", null, h("p", { className: "eyebrow" }, "Private operations"),
        h("h1", null, "Operations overview")),
      h("p", { className: stateClass(overview.health.status), role: "status" }, overview.health.status)),
    h("section", { "aria-labelledby": "admin-readiness-heading" },
      h("h2", { id: "admin-readiness-heading" }, "Readiness"), readiness),
    h("section", { "aria-labelledby": "admin-modules-heading" },
      h("h2", { id: "admin-modules-heading" }, "Authorized modules"), modules),
    accounts);
}
