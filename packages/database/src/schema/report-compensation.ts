import {sql} from "drizzle-orm";
import {check, index, integer, pgTable, text, timestamp, uniqueIndex, uuid} from "drizzle-orm/pg-core";
import {authUsers} from "./auth.js";
import {reportReservations} from "./reports.js";
import {walletTransactions} from "./wallet-commerce.js";

/** Durable financial failure proof; zero-charge revocation never invents a restoration. */
export const reportWalletCompensations = pgTable("report_wallet_compensations", {
  id: uuid("id").defaultRandom().primaryKey(),
  ownerId: text("owner_id").notNull().references(() => authUsers.id, {onDelete: "restrict"}),
  reservationId: uuid("reservation_id").notNull().references(() => reportReservations.id, {onDelete: "restrict"}),
  terminalStateVersion: integer("terminal_state_version").notNull(),
  failureEventId: uuid("failure_event_id").notNull(),
  spendTransactionId: uuid("spend_transaction_id").notNull().references(() => walletTransactions.id, {onDelete: "restrict"}),
  restorationTransactionId: uuid("restoration_transaction_id").references(() => walletTransactions.id, {onDelete: "restrict"}),
  amountLa: integer("amount_la").notNull(),
  recordedAt: timestamp("recorded_at", {withTimezone: true, mode: "date"}).notNull(),
}, table => [
  uniqueIndex("report_wallet_compensations_spend_unique").on(table.spendTransactionId),
  index("report_wallet_compensations_owner_reservation_idx").on(table.ownerId, table.reservationId),
  check("report_wallet_compensations_financial_proof", sql`${table.terminalStateVersion} > 0 AND ((${table.amountLa} = 0 AND ${table.restorationTransactionId} IS NULL) OR (${table.amountLa} > 0 AND ${table.restorationTransactionId} IS NOT NULL))`),
]);
