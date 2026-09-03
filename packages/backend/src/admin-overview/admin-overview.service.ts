import type {
  AdminAccessV1,
  AdminHealthV1,
  AdminOverviewFiltersV1,
  AdminOverviewV1,
  AdminReadContextV1,
  AdminRole,
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

type ModuleId = AdminOverviewV1["modules"][number]["id"];

const moduleReaders = {
  accounts: ["super_admin", "operations", "support"],
  commerce: ["super_admin", "support"],
  reports: ["super_admin", "operations", "support", "read_only"],
  outbox: ["super_admin", "operations", "read_only"],
  assets: ["super_admin", "operations"],
  delivery: ["super_admin", "operations", "support"],
  support: ["super_admin"],
  privacy: ["super_admin", "operations", "support"],
  readiness: ["super_admin", "operations", "read_only"],
} satisfies Record<ModuleId, readonly AdminRole[]>;

const moduleReadCapabilities = {
  accounts: "admin.accounts.read",
  commerce: "admin.commerce.read",
  reports: "admin.reports.read",
  outbox: "admin.reports.read",
  assets: "admin.reports.read",
  delivery: "admin.reports.read",
  support: "admin.overview.read",
  privacy: "admin.accounts.read",
  readiness: "admin.readiness.read",
} satisfies Record<ModuleId, AdminAccessV1["capabilities"][number]>;

function canReadModule(access: AdminAccessV1, id: ModuleId): boolean {
  return (moduleReaders[id] as readonly AdminRole[]).includes(access.role)
    && access.capabilities.includes(moduleReadCapabilities[id]);
}

function readinessSummary(health: AdminHealthV1) {
  return health.dependencies.reduce(
    (summary, dependency) => ({
      ...summary,
      [dependency.status]: summary[dependency.status] + 1,
    }),
    { ready: 0, degraded: 0, unready: 0, unavailable: 0 },
  );
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
          canReadModule(context.access, "accounts")
            ? options.repository.readAccounts(filters.data)
            : undefined,
          canReadModule(context.access, "privacy")
            ? options.repository.readPrivacy()
            : undefined,
          canReadModule(context.access, "outbox")
            ? options.repository.readOutbox()
            : undefined,
        ]);
        const modules: AdminOverviewV1["modules"] = [];
        if (canReadModule(context.access, "accounts")) {
          if (accounts === undefined) {
            modules.push({ id: "accounts", status: "unavailable" });
          } else {
            modules.push({
              id: "accounts",
              status: "available",
              summary: {
                total: accounts.total,
                verified: accounts.verified,
                anonymous: accounts.anonymous,
              },
            });
          }
        }
        for (const id of ["commerce", "reports", "assets", "delivery", "support"] as const) {
          if (canReadModule(context.access, id)) {
            modules.push({ id, status: "unavailable" });
          }
        }
        if (canReadModule(context.access, "outbox")) {
          modules.push(outbox === undefined
            ? { id: "outbox", status: "unavailable" }
            : { id: "outbox", status: "available", summary: outbox });
        }
        if (canReadModule(context.access, "privacy")) {
          modules.push(privacy === undefined
            ? { id: "privacy", status: "unavailable" }
            : { id: "privacy", status: "available", summary: privacy });
        }
        if (canReadModule(context.access, "readiness")) {
          modules.push({
            id: "readiness",
            status: "available",
            summary: readinessSummary(health),
          });
        }
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
