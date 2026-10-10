import { and, eq, inArray, sql } from "drizzle-orm";
import { freeChartRecoverySources, lockFreeAiCoordination, lockRecoveryCaptureCoordination,
  notificationDeliveries, outbox, type Database } from "@lasoviet/database";
import { FREE_CHART_RECOVERY_CAPTURE_EVENT_TYPE } from "./free-chart-recovery-capture.js";

type Transaction = Parameters<Parameters<Database["transaction"]>[0]>[0];

/** Source and private captured body/receipt follow chart deletion, even without an AI budget. */
export async function purgeFreeChartRecoveryForVersions(transaction: Transaction, chartVersionIds: ReadonlyArray<string>): Promise<void> {
  await lockFreeAiCoordination(transaction);
  await lockRecoveryCaptureCoordination(transaction);
  if (!chartVersionIds.length) return;
  const ids = [...chartVersionIds];
  await transaction.delete(freeChartRecoverySources).where(inArray(freeChartRecoverySources.chartVersionId, ids));
  await transaction.delete(notificationDeliveries).where(and(eq(notificationDeliveries.kind, "recovery_free_chart"),
    inArray(sql<string>`${notificationDeliveries.requestPayload}->>'chartVersionId'`, ids)));
  await transaction.delete(outbox).where(and(eq(outbox.eventType, FREE_CHART_RECOVERY_CAPTURE_EVENT_TYPE),
    inArray(sql<string>`${outbox.payload}->>'chartVersionId'`, ids)));
}
