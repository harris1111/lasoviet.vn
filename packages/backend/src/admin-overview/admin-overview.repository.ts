import { count, desc, eq } from "drizzle-orm";

import {
  authUsers,
  deletionRequests,
  outbox,
  type Database,
} from "@lasoviet/database";

import type { AdminOverviewRepository } from "./admin-overview.service.js";

export function createDatabaseAdminOverviewRepository(
  database: Database,
): AdminOverviewRepository {
  return {
    async readAccounts(filters) {
      const offset = (filters.page - 1) * filters.pageSize;
      const [[totals], [verified], [anonymous], records] = await Promise.all([
        database.select({ value: count() }).from(authUsers),
        database.select({ value: count() }).from(authUsers)
          .where(eq(authUsers.emailVerified, true)),
        database.select({ value: count() }).from(authUsers)
          .where(eq(authUsers.isAnonymous, true)),
        database.select({
          id: authUsers.id,
          emailVerified: authUsers.emailVerified,
          isAnonymous: authUsers.isAnonymous,
          createdAt: authUsers.createdAt,
        }).from(authUsers)
          .orderBy(desc(authUsers.createdAt), desc(authUsers.id))
          .limit(filters.pageSize)
          .offset(offset),
      ]);
      return {
        total: totals?.value ?? 0,
        verified: verified?.value ?? 0,
        anonymous: anonymous?.value ?? 0,
        records,
      };
    },
    async readPrivacy() {
      const [[requested], [purged]] = await Promise.all([
        database.select({ value: count() }).from(deletionRequests)
          .where(eq(deletionRequests.status, "requested")),
        database.select({ value: count() }).from(deletionRequests)
          .where(eq(deletionRequests.status, "purged")),
      ]);
      return { requested: requested?.value ?? 0, purged: purged?.value ?? 0 };
    },
    async readOutbox() {
      const [[pending], [failed]] = await Promise.all([
        database.select({ value: count() }).from(outbox)
          .where(eq(outbox.status, "pending")),
        database.select({ value: count() }).from(outbox)
          .where(eq(outbox.status, "failed")),
      ]);
      return { pending: pending?.value ?? 0, failed: failed?.value ?? 0 };
    },
  };
}
