import type {
  AdminAccessV1,
  AdminHealthV1,
  AdminOverviewFiltersV1,
  AdminOverviewV1,
  AdminReadContextV1,
  Result,
} from "@lasoviet/contracts";
import {
  AdminOverviewFiltersV1Schema,
  AdminOverviewV1Schema,
} from "@lasoviet/contracts";

type AccountRecord = {
  id: string;
  emailVerified: boolean;
  isAnonymous: boolean;
  createdAt: Date;
};

export type AdminOverviewRepository = {
  readAccounts(filters: AdminOverviewFiltersV1): Promise<{
    total: number;
    verified: number;
    anonymous: number;
    records: AccountRecord[];
  }>;
  readPrivacy(): Promise<{ requested: number; purged: number }>;
  readOutbox(): Promise<{ pending: number; failed: number }>;
};

export type AdminHealthReader = { readHealth(): Promise<AdminHealthV1> };
export type AdminOverviewError =
  | "ADMIN_FILTER_INVALID"
  | "ADMIN_PROJECTION_UNAVAILABLE";

function error(code: AdminOverviewError): Result<never, AdminOverviewError> {
  return {
    ok: false,
    error: {
      code,
      messageKey: `admin.${code.toLowerCase()}`,
      retryable: false,
    },
  };
}

function module(
  id: AdminOverviewV1["modules"][number]["id"],
  capability: AdminAccessV1["capabilities"][number],
  access: AdminAccessV1,
  summary?: Record<string, number>,
) {
  if (!access.capabilities.includes(capability)) return undefined;
  return summary === undefined
    ? { id, status: "unavailable" as const }
    : { id, status: "available" as const, summary };
}

export function createAdminOverviewService(options: {
  repository: AdminOverviewRepository;
  health: AdminHealthReader;
}) {
  return {
    async readOverview(
      context: AdminReadContextV1,
      input: unknown,
    ): Promise<Result<AdminOverviewV1, AdminOverviewError>> {
      const filters = AdminOverviewFiltersV1Schema.safeParse(input);
      if (!filters.success) return error("ADMIN_FILTER_INVALID");

      try {
        const [health, accounts, privacy, outbox] = await Promise.all([
          options.health.readHealth(),
          context.access.capabilities.includes("admin.accounts.read")
            ? options.repository.readAccounts(filters.data)
            : undefined,
          context.access.capabilities.includes("admin.privacy.manage")
            ? options.repository.readPrivacy()
            : undefined,
          context.access.capabilities.includes("admin.workflow.retry")
            ? options.repository.readOutbox()
            : undefined,
        ]);
        const modules = [
          module("accounts", "admin.accounts.read", context.access, accounts && {
            total: accounts.total, verified: accounts.verified, anonymous: accounts.anonymous,
          }),
          module("commerce", "admin.commerce.read", context.access),
          module("reports", "admin.reports.read", context.access),
          module("outbox", "admin.workflow.retry", context.access, outbox),
          module("assets", "admin.storage.reconcile", context.access),
          module("delivery", "admin.support.manage", context.access),
          module("support", "admin.support.manage", context.access),
          module("privacy", "admin.privacy.manage", context.access, privacy),
          module("readiness", "admin.readiness.read", context.access, {}),
        ].filter((value) => value !== undefined);
        return {
          ok: true,
          value: AdminOverviewV1Schema.parse({
            version: 1,
            accountSummary: accounts === undefined ? null : {
              total: accounts.total,
              verified: accounts.verified,
              anonymous: accounts.anonymous,
            },
            accountPage: accounts === undefined ? null : {
              page: filters.data.page,
              pageSize: filters.data.pageSize,
              total: accounts.total,
              items: accounts.records.map((record) => ({
                id: record.id,
                verification: record.emailVerified ? "verified" : "unverified",
                ownership: record.isAnonymous ? "anonymous" : "account",
                createdAt: record.createdAt.toISOString(),
              })),
            },
            modules,
            health,
          }),
        };
      } catch {
        return error("ADMIN_PROJECTION_UNAVAILABLE");
      }
    },
  };
}
