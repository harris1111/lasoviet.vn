import { and, inArray, sql } from "drizzle-orm";
import { notificationDeliveries, type Database } from "@lasoviet/database";

type Transaction = Parameters<Parameters<Database["transaction"]>[0]>[0];

/** Caller holds recovery coordination. All statuses consume the shared chart cap. */
export async function recoveryChartHasCapacity(transaction: Transaction, chartId: string): Promise<boolean> {
  const [row] = await transaction.select({ count: sql<number>`count(*)::integer` }).from(notificationDeliveries)
    .where(and(inArray(notificationDeliveries.kind, ["recovery_pending_topup", "recovery_free_chart"]),
      sql`${notificationDeliveries.requestPayload}->>'chartId' = ${chartId}`));
  return (row?.count ?? 0) < 2;
}
