import postgres from "postgres";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";

import * as auth from "./schema/auth.js";
import * as audit from "./schema/audit.js";
import * as adminAccess from "./schema/admin-access.js";
import * as birthProfile from "./schema/birth-profile.js";
import * as commerce from "./schema/commerce.js";
import * as outbox from "./schema/outbox.js";
import * as privacy from "./schema/privacy.js";

const schema = {
  ...auth,
  ...audit,
  ...adminAccess,
  ...birthProfile,
  ...commerce,
  ...outbox,
  ...privacy,
};

export type Database = PostgresJsDatabase<typeof schema>;

export function createDatabase(databaseUrl: string): Database {
  return drizzle(postgres(databaseUrl), { schema });
}
