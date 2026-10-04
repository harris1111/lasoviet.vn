import { sql } from "drizzle-orm";
import type { Database } from "./client.js";

type Transaction = Parameters<Parameters<Database["transaction"]>[0]>[0];
export const RECOVERY_CAPTURE_COORDINATION_LOCK = "lasoviet:recovery-capture:coordination:v1";

/** Capture/purge take the free-AI fence first; eligibility writers take only this
 * fence so deletion requests can still cancel a delivery holding the AI fence. */
export async function lockRecoveryCaptureCoordination(transaction: Transaction): Promise<void> {
  await transaction.execute(sql`SELECT pg_advisory_xact_lock(hashtextextended(${RECOVERY_CAPTURE_COORDINATION_LOCK}, 0))`);
}
