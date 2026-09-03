import {
  AdminAuditPageV1Schema,
  AdminAuditSearchFiltersV1Schema,
  type AdminAccessV1,
  type AdminAuditPageV1,
  type AdminAuditSearchFiltersV1,
  type Result,
} from "@lasoviet/contracts";

export type AuditQueryRepository = {
  search(filters: AdminAuditSearchFiltersV1): Promise<AdminAuditPageV1>;
};

function forbidden(): Result<never, "ADMIN_FORBIDDEN"> {
  return {
    ok: false,
    error: {
      code: "ADMIN_FORBIDDEN",
      messageKey: "admin.admin_forbidden",
      retryable: false,
    },
  };
}

function safeSummary(value: Record<string, unknown>) {
  const summary: Record<string, unknown> = {};
  if (value.role === "super_admin" || value.role === "operations"
    || value.role === "support" || value.role === "read_only") summary.role = value.role;
  if (value.outcome === "allowed" || value.outcome === "denied") {
    summary.outcome = value.outcome;
  }
  if (typeof value.code === "string" && /^[A-Z][A-Z0-9_]{1,127}$/.test(value.code)) {
    summary.code = value.code;
  }
  if (typeof value.count === "number" && Number.isInteger(value.count)
    && value.count >= 0 && value.count <= 100_000) summary.count = value.count;
  return summary;
}

function redactPage(page: AdminAuditPageV1): AdminAuditPageV1 {
  return AdminAuditPageV1Schema.parse({
    ...page,
    items: page.items.map((item) => ({
      ...item,
      resultSummary: safeSummary(item.resultSummary),
    })),
  });
}

function invalidFilter(): Result<never, "ADMIN_FILTER_INVALID"> {
  return {
    ok: false,
    error: {
      code: "ADMIN_FILTER_INVALID",
      messageKey: "admin.admin_filter_invalid",
      retryable: false,
    },
  };
}

export function createAuditQueryService(options: { repository: AuditQueryRepository }) {
  return {
    async search(
      access: AdminAccessV1,
      filtersInput: AdminAuditSearchFiltersV1,
    ): Promise<Result<AdminAuditPageV1, "ADMIN_FORBIDDEN" | "ADMIN_FILTER_INVALID">> {
      if (!access.capabilities.includes("admin.audit.read")) return forbidden();
      const filters = AdminAuditSearchFiltersV1Schema.safeParse(filtersInput);
      if (!filters.success || (
        filters.data.dateFrom !== undefined
        && filters.data.dateTo !== undefined
        && new Date(filters.data.dateFrom).getTime() > new Date(filters.data.dateTo).getTime()
      )) {
        return {
          ok: false,
          error: {
            code: "ADMIN_FILTER_INVALID",
            messageKey: "admin.admin_filter_invalid",
            retryable: false,
          },
        };
      }
      try {
        return { ok: true, value: redactPage(await options.repository.search(filters.data)) };
      } catch (error) {
        if (error instanceof Error && error.message === "ADMIN_FILTER_INVALID") {
          return invalidFilter();
        }
        throw error;
      }
    },
  };
}
