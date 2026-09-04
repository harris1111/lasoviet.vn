import postgres from "postgres";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";

import * as auth from "./schema/auth.js";
import * as audit from "./schema/audit.js";
import * as adminAccess from "./schema/admin-access.js";
import * as birthProfile from "./schema/birth-profile.js";
import * as commerce from "./schema/commerce.js";
import * as knowledge from "./schema/knowledge.js";
import * as outbox from "./schema/outbox.js";
import * as privacy from "./schema/privacy.js";
import * as reports from "./schema/reports.js";

const schema = {
  ...auth,
  ...audit,
  ...adminAccess,
  ...birthProfile,
  ...commerce,
  ...knowledge,
  ...outbox,
  ...privacy,
  ...reports,
};

export type Database = PostgresJsDatabase<typeof schema>;

export function createDatabase(databaseUrl: string): Database {
  return drizzle(postgres(databaseUrl), { schema });
}
