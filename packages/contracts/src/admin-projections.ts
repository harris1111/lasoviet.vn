import { z } from "zod";

import { AdminAccessV1Schema } from "./admin-auth.js";

const timestamp = z.iso.datetime({ offset: true });
const count = z.number().int().min(0).max(100_000);
const dependencyNames = [
  "postgres",
  "commerce_workflow",
  "report_generation",
  "asset_delivery",
  "support_workflow",
  "privacy_workflow",
] as const;
const moduleIds = [
  "accounts", "commerce", "reports", "outbox", "assets",
  "delivery", "support", "privacy", "readiness",
] as const;

export const AdminOverviewFiltersV1Schema = z.object({
  page: z.number().int().min(1).max(100_000),
  pageSize: z.number().int().min(1).max(50),
}).strict();
export type AdminOverviewFiltersV1 = z.infer<typeof AdminOverviewFiltersV1Schema>;

function queryNumber(value: unknown, fallback: number): unknown {
  if (value === undefined) return fallback;
  return typeof value === "string" && /^\d{1,6}$/.test(value)
    ? Number(value)
    : value;
}

export function parseAdminOverviewFiltersV1(input: {
  page?: unknown;
  pageSize?: unknown;
}) {
  return AdminOverviewFiltersV1Schema.safeParse({
    page: queryNumber(input.page, 1),
    pageSize: queryNumber(input.pageSize, 25),
  });
}

export const AdminReadContextV1Schema = z.object({
  access: AdminAccessV1Schema,
  requestId: z.string().trim().min(1).max(128),
  traceId: z.string().trim().min(1).max(128),
}).strict();
export type AdminReadContextV1 = z.infer<typeof AdminReadContextV1Schema>;

export function createAdminListPageV1Schema<T extends z.ZodTypeAny>(item: T) {
  return z.object({
    page: z.number().int().min(1),
    pageSize: z.number().int().min(1).max(50),
    total: count,
    items: z.array(item).max(50),
  });
}

export const AdminAccountProjectionV1Schema = z.object({
  id: z.string().trim().min(1).max(128),
  verification: z.enum(["verified", "unverified"]),
  ownership: z.enum(["account", "anonymous"]),
  createdAt: timestamp,
});
export type AdminAccountProjectionV1 = z.infer<typeof AdminAccountProjectionV1Schema>;

export const AdminListPageV1Schema = createAdminListPageV1Schema(
  AdminAccountProjectionV1Schema,
);
export type AdminListPageV1<T> = Omit<
  z.infer<typeof AdminListPageV1Schema>,
  "items"
> & { items: T[] };

const AdminHealthDependencyV1Schema = z.object({
  name: z.enum(dependencyNames),
  status: z.enum(["ready", "degraded", "unready", "unavailable"]),
}).strict();

const AdminHealthDependenciesV1Schema = z.array(AdminHealthDependencyV1Schema)
  .length(dependencyNames.length)
  .superRefine((dependencies, context) => {
    const names = dependencies.map((dependency) => dependency.name);
    for (const name of dependencyNames) {
      if (names.filter((value) => value === name).length !== 1) {
        context.addIssue({
          code: "custom",
          message: `Dependency ${name} must appear exactly once`,
        });
      }
    }
  });

export const AdminHealthV1Schema = z.object({
  version: z.literal(1),
  status: z.enum(["ready", "degraded", "unready", "unavailable"]),
  checkedAt: timestamp,
  dependencies: AdminHealthDependenciesV1Schema,
}).strict();
export type AdminHealthV1 = z.infer<typeof AdminHealthV1Schema>;

const unavailableModule = z.object({
  id: z.enum(moduleIds),
  status: z.literal("unavailable"),
}).strict();
const accountsModule = z.object({
  id: z.literal("accounts"), status: z.literal("available"),
  summary: z.object({ total: count, verified: count, anonymous: count }).strict(),
}).strict();
const outboxModule = z.object({
  id: z.literal("outbox"), status: z.literal("available"),
  summary: z.object({ pending: count, failed: count }).strict(),
}).strict();
const privacyModule = z.object({
  id: z.literal("privacy"), status: z.literal("available"),
  summary: z.object({ requested: count, purged: count }).strict(),
}).strict();
const readinessModule = z.object({
  id: z.literal("readiness"), status: z.literal("available"),
  summary: z.object({
    ready: count, degraded: count, unready: count, unavailable: count,
  }).strict(),
}).strict();

export const AdminOverviewModuleV1Schema = z.union([
  unavailableModule, accountsModule, outboxModule, privacyModule, readinessModule,
]);

export const AdminOverviewV1Schema = z.object({
  version: z.literal(1),
  accountSummary: z.object({
    total: count,
    verified: count,
    anonymous: count,
  }).nullable(),
  accountPage: AdminListPageV1Schema.nullable(),
  modules: z.array(AdminOverviewModuleV1Schema).max(moduleIds.length)
    .superRefine((modules, context) => {
      const ids = modules.map((module) => module.id);
      if (new Set(ids).size !== ids.length) {
        context.addIssue({ code: "custom", message: "Module IDs must be unique" });
      }
    }),
  health: AdminHealthV1Schema,
}).strict();
export type AdminOverviewV1 = z.infer<typeof AdminOverviewV1Schema>;
