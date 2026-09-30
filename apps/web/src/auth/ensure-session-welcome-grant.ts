import "server-only";

import { randomUUID } from "node:crypto";
import { privateApiClient } from "../api/private-api-client";

/** The private API validates the persisted session and verified account. */
export async function ensureSessionWelcomeGrant(session: { id: string; userId: string }): Promise<void> {
  const requestId = randomUUID();
  try {
    await privateApiClient({ kind: "account", userId: session.userId, sessionId: session.id, requestId }, requestId)
      .request("/commerce/wallet/balance", { cache: "no-store", signal: AbortSignal.timeout(5000) });
  } catch {
    // Auth must remain available during wallet outages. The next balance read retries the idempotent grant.
  }
}
