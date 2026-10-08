import type { Database } from "@lasoviet/database";
import type { EmailProvider } from "./email-provider.js";
import { createPendingTopUpRecoveryRunner } from "./pending-topup-recovery-runner.js";

export function createRecoveryOutboundMaintenance(options: {
  enabled?: string; smtpEnabled: boolean; database: Database; provider: EmailProvider;
  tokenSecret: string; orderTtlSeconds: number; capture: { scanAndCapture(limit: number): Promise<number> };
  now?: () => Date;
}) {
  if (options.enabled !== undefined && options.enabled !== "false" && options.enabled !== "true") throw new Error("RECOVERY_OUTBOUND_CONFIG_INVALID");
  const enabled = options.enabled === "true";
  if (enabled && !options.smtpEnabled) throw new Error("RECOVERY_OUTBOUND_SMTP_REQUIRED");
  const runner = enabled ? createPendingTopUpRecoveryRunner({...options, mode: "prepare"}) : null;
  return {
    async runOnce(limit: number) {
      if (!Number.isSafeInteger(limit) || limit < 1 || limit > 100) throw new Error("RECOVERY_LIMIT_INVALID");
      if (!runner) return { captured: await options.capture.scanAndCapture(limit), queued: 0, sent: 0 };
      const queued = await runner.enqueueFresh(limit);
      let sent = 0;
      for (let n = 0; n < Math.min(limit, 5); n++) {
        const claim = await runner.claimNext();
        if (!claim) break;
        if (await runner.deliverClaimed(claim) === "sent") sent++;
      }
      return { captured: 0, queued, sent };
    },
  };
}
