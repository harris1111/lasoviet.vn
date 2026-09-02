import { fileURLToPath } from "node:url";

import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";

export type MigrationResult = {
  appliedMigrations: string[];
};

export class MigrationError extends Error {
  readonly code = "MIGRATION_FAILED" as const;

  constructor(cause: unknown) {
    super("MIGRATION_FAILED: database migrations could not be applied");
    this.name = "MigrationError";
    this.cause = cause;
  }
}

export async function runMigrations(
  databaseUrl: string,
): Promise<MigrationResult> {
  const client = postgres(databaseUrl);

  try {
    await migrate(drizzle(client), {
      migrationsFolder: fileURLToPath(new URL("../drizzle", import.meta.url)),
    });

    const rows = await client<{ hash: string }[]>`
      SELECT hash
      FROM drizzle.__drizzle_migrations
      ORDER BY id ASC
    `;

    return {
      appliedMigrations: rows.map((row) => row.hash),
    };
  } catch (cause) {
    throw new MigrationError(cause);
  } finally {
    await client.end();
  }
}
