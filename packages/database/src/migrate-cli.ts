import { runMigrations } from "./migrate.js";

async function main(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL;
  if (databaseUrl === undefined || databaseUrl.trim() === "") {
    throw new Error("DATABASE_URL is required for migrations");
  }

  const result = await runMigrations(databaseUrl);
  console.info("MIGRATIONS_APPLIED", { count: result.appliedMigrations.length });
}

void main();
