import { z } from "zod";

import { AdminAccessV1Schema } from "./admin-auth.js";

const timestamp = z.iso.datetime({ offset: true });
const count = z.number().int().min(0).max(100_000);

export const AdminOverviewFiltersV1Schema = z.object({
  page: z.number().int().min(1).max(100_000),
  pageSize: z.number().int().min(1).max(50),
}).strict();
export type AdminOverviewFiltersV1 = z.infer<typeof AdminOverviewFiltersV1Schema>;

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
    items: z.array(item),
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

export const AdminHealthV1Schema = z.object({
  version: z.literal(1),
  status: z.enum(["ready", "unready"]),
  checkedAt: timestamp,
  dependencies: z.array(z.object({
    name: z.enum([
      "postgres",
      "commerce_workflow",
      "report_generation",
      "asset_delivery",
      "support_workflow",
      "privacy_workflow",
    ]),
    status: z.enum(["ready", "unready", "unavailable"]),
  })),
});
export type AdminHealthV1 = z.infer<typeof AdminHealthV1Schema>;

export const AdminOverviewModuleV1Schema = z.object({
  id: z.enum([
    "accounts",
    "commerce",
    "reports",
    "outbox",
    "assets",
    "delivery",
    "support",
    "privacy",
    "readiness",
  ]),
  status: z.enum(["available", "unavailable"]),
  summary: z.record(z.string(), count).optional(),
});

export const AdminOverviewV1Schema = z.object({
  version: z.literal(1),
  accountSummary: z.object({
    total: count,
    verified: count,
    anonymous: count,
  }).nullable(),
  accountPage: AdminListPageV1Schema.nullable(),
  modules: z.array(AdminOverviewModuleV1Schema),
  health: AdminHealthV1Schema,
});
export type AdminOverviewV1 = z.infer<typeof AdminOverviewV1Schema>;
