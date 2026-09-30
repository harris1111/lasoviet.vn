export type DeferredDelayedUnlockNotificationResult = {
  status: "deferred";
  reason: "AWAITING_PR_51_52_UNLOCK_INTENT_MERGE";
  description: string;
};

export const DEFERRED_DELAYED_UNLOCK_DESCRIPTION =
  "Delayed top-up unlock-completed email delivery is explicitly deferred until " +
  "Kaneo #51 (PR #204 - unlock confirm dialog) and #52 (saved intent auto-completion " +
  "upon top-up confirmation and customer presence tracking) data are merged into master. " +
  "Master currently only supports immediate top-up credit (PR #202) without stored " +
  "unlock intent auto-resolution.";

export interface DelayedUnlockNotificationHandler {
  notifyUnlockCompleted(input: {
    orderId: string;
    userId: string;
    sku: string;
  }): Promise<DeferredDelayedUnlockNotificationResult>;
}

export function createDeferredDelayedUnlockAdapter(): DelayedUnlockNotificationHandler {
  return {
    async notifyUnlockCompleted(): Promise<DeferredDelayedUnlockNotificationResult> {
      return {
        status: "deferred",
        reason: "AWAITING_PR_51_52_UNLOCK_INTENT_MERGE",
        description: DEFERRED_DELAYED_UNLOCK_DESCRIPTION,
      };
    },
  };
}
