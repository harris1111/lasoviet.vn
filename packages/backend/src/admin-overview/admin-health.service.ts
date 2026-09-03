import {
  AdminHealthV1Schema,
  type AdminHealthV1,
} from "@lasoviet/contracts";
import type { Database } from "@lasoviet/database";
import { sql } from "drizzle-orm";

export type AdminHealthProbe = () => Promise<boolean>;

export type AdminHealthDependencies = {
  postgres: AdminHealthProbe;
  commerceWorkflow?: AdminHealthProbe;
  reportGeneration?: AdminHealthProbe;
  assetDelivery?: AdminHealthProbe;
  supportWorkflow?: AdminHealthProbe;
  privacyWorkflow?: AdminHealthProbe;
};

async function status(probe: AdminHealthProbe | undefined) {
  if (probe === undefined) return "unavailable" as const;
  try {
    return (await probe()) ? "ready" as const : "unready" as const;
  } catch {
    return "unready" as const;
  }
}

function checkedAt(): string {
  return new Date().toISOString().replace("Z", "+00:00");
}

export function createAdminHealthService(dependencies: AdminHealthDependencies) {
  return {
    async readHealth(): Promise<AdminHealthV1> {
      const entries = await Promise.all([{
        name: "postgres" as const, probe: dependencies.postgres,
      }, {
        name: "commerce_workflow" as const, probe: dependencies.commerceWorkflow,
      }, {
        name: "report_generation" as const, probe: dependencies.reportGeneration,
      }, {
        name: "asset_delivery" as const, probe: dependencies.assetDelivery,
      }, {
        name: "support_workflow" as const, probe: dependencies.supportWorkflow,
      }, {
        name: "privacy_workflow" as const, probe: dependencies.privacyWorkflow,
      }].map(async ({ name, probe }) => ({
        name,
        status: await status(probe),
      })));
      return AdminHealthV1Schema.parse({
        version: 1,
        status: entries.every((entry) => entry.status === "ready")
          ? "ready"
          : "unready",
        checkedAt: checkedAt(),
        dependencies: entries,
      });
    },
  };
}

export function createDatabaseAdminHealthService(database: Database) {
  return createAdminHealthService({
    postgres: async () => {
      await database.execute(sql`SELECT 1`);
      return true;
    },
  });
}
