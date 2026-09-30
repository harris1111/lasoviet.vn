import { describe, expect, it } from "vitest";

import {
  createDeferredDelayedUnlockAdapter,
  DEFERRED_DELAYED_UNLOCK_DESCRIPTION,
} from "./delayed-unlock-notification.js";

describe("delayed-unlock-notification adapter", () => {
  it("explicitly defers unlock notification pending PR #51 and #52 data merge", async () => {
    const adapter = createDeferredDelayedUnlockAdapter();
    const result = await adapter.notifyUnlockCompleted({
      orderId: "order-1",
      userId: "user-1",
      sku: "ZIWEI-PALACE-CAREER",
    });

    expect(result.status).toBe("deferred");
    expect(result.reason).toBe("AWAITING_PR_51_52_UNLOCK_INTENT_MERGE");
    expect(result.description).toBe(DEFERRED_DELAYED_UNLOCK_DESCRIPTION);
    expect(result.description).toContain("Kaneo #51");
    expect(result.description).toContain("PR #204");
  });
});
