import { sql } from "drizzle-orm";
import { check, index, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { authUsers } from "./auth.js";
import { walletTransactions } from "./wallet-commerce.js";

// Each explicit purchase appends an immutable, wallet-backed period. There is no automatic renewal.
export const membershipSubscriptions = pgTable("membership_subscriptions", {
  id: uuid("id").defaultRandom().primaryKey(),
  ownerId: text("owner_id").notNull().references(() => authUsers.id, { onDelete: "restrict" }),
  sku: text("sku").notNull(),
  ledgerSpendId: uuid("ledger_spend_id").notNull().references(() => walletTransactions.id, { onDelete: "restrict" }),
  startsAt: timestamp("starts_at", { withTimezone: true, mode: "date" }).notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true, mode: "date" }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull(),
}, (table) => [
  uniqueIndex("membership_subscriptions_spend_unique").on(table.ledgerSpendId),
  index("membership_subscriptions_owner_expiry_idx").on(table.ownerId, table.expiresAt),
  check("membership_subscriptions_terms_valid", sql`(${table.sku} = 'MEMBERSHIP-MONTHLY-P0' AND ${table.expiresAt} = ${table.startsAt} + interval '720 hours') OR (${table.sku} = 'MEMBERSHIP-YEARLY-P0' AND ${table.expiresAt} = ${table.startsAt} + interval '8760 hours')`),
]);
