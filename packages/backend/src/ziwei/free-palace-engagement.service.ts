import { and, eq, sql } from "drizzle-orm";
import type { CurrentActor } from "@lasoviet/contracts";
import { auditLogs, lockFreeAiCoordination, type Database } from "@lasoviet/database";
import type { FreePalaceLocale } from "./free-palace-labels.js";
import type { FreePalaceRequestService } from "./free-palace-request.service.js";
import type { ZiweiQueryRepository } from "./ziwei-query.repository.js";

// Owner decision (2026-10-03): a guest becomes trustworthy for the pilot by genuinely working the
// free reading — opening several of its tabs. The signal is recorded and counted on the SERVER; the
// browser only reports "this tab was opened" and the server decides.
export const FREE_PALACE_ENGAGEMENT_TABS = ["chart", "overview", "nam-nay", "palaces", "topics", "evidence"] as const;
export type FreePalaceEngagementTab = (typeof FREE_PALACE_ENGAGEMENT_TABS)[number];
export const FREE_PALACE_ENGAGEMENT_THRESHOLD = 3;
export const FREE_PALACE_ENGAGEMENT_ACTION = "free_palace.engagement";
export const FREE_PALACE_ENGAGEMENT_TARGET = "free_palace_engagement";

export type FreePalaceEngagementOutcome =
  | Readonly<{ kind: "ignored"; reason: string }>
  | Readonly<{ kind: "recorded"; distinctTabs: number }>
  | Readonly<{ kind: "requested"; distinctTabs: number; request: Awaited<ReturnType<FreePalaceRequestService["request"]>> }>;

export type FreePalaceEngagementServiceOptions = Readonly<{
  database: Database;
  sources: Pick<ZiweiQueryRepository, "readAuthorizedChart">;
  request: Pick<FreePalaceRequestService, "request">;
  flagEnabled: () => boolean;
  now?: () => Date;
}>;

// Records which tab of a chart an actor opened (once per tab) and, when the engagement is real, asks the
// shared request path for the gift. Initiated by an explicit user action through a POST; never by a
// render, a GET or a background effect. Never throws; every failure is a redacted `ignored`.
export function createFreePalaceEngagementService(options: FreePalaceEngagementServiceOptions) {
  const now = options.now ?? (() => new Date());
  return {
    async record(actor: CurrentActor, chartId: string, tab: string, locale: FreePalaceLocale): Promise<FreePalaceEngagementOutcome> {
      try {
        if (!options.flagEnabled()) return { kind: "ignored", reason: "flag_disabled" };
        if (!(FREE_PALACE_ENGAGEMENT_TABS as readonly string[]).includes(tab)) return { kind: "ignored", reason: "tab_invalid" };
        const engagement = await options.database.transaction(async (transaction) => {
          // Match deletion/link/admission lock order. Authorization and time are fresh after
          // the wait, and every marker query uses this transaction so deletion cannot interleave.
          await lockFreeAiCoordination(transaction);
          const source = await options.sources.readAuthorizedChart(actor, chartId, now(), transaction);
          if (!source) return null;
          const actorKey = actor.kind === "account" ? actor.userId : actor.anonymousActorId;
          const same = and(eq(auditLogs.action, FREE_PALACE_ENGAGEMENT_ACTION), eq(auditLogs.targetType, FREE_PALACE_ENGAGEMENT_TARGET),
            eq(auditLogs.targetId, source.chartVersionId), eq(auditLogs.actorId, actorKey));
          const [seen] = await transaction.select({ id: auditLogs.id }).from(auditLogs).where(and(same, sql`${auditLogs.metadata}->>'tab' = ${tab}`)).limit(1);
          const isNew = !seen;
          if (isNew) {
            await transaction.insert(auditLogs).values({
              actorId: actorKey, action: FREE_PALACE_ENGAGEMENT_ACTION, targetType: FREE_PALACE_ENGAGEMENT_TARGET,
              targetId: source.chartVersionId, requestId: actor.requestId, metadata: { tab },
            });
          }
          const [counted] = await transaction.select({ n: sql<number>`count(distinct ${auditLogs.metadata}->>'tab')::int` }).from(auditLogs).where(same);
          return { isNew, distinctTabs: Number(counted?.n ?? 0) };
        });
        if (!engagement) return { kind: "ignored", reason: "source_unavailable" };
        const { isNew, distinctTabs } = engagement;
        // Only a newly recorded tab can change the outcome, so repeats stay cheap.
        if (!isNew) return { kind: "recorded", distinctTabs };
        const engaged = distinctTabs >= FREE_PALACE_ENGAGEMENT_THRESHOLD;
        const verified = actor.kind === "account" && actor.emailVerified === true;
        if (!engaged && !verified) return { kind: "recorded", distinctTabs };
        // Admission takes the same coordination lock and rechecks the source. Invoke it only
        // after committing engagement, avoiding a nested transaction waiting on our own lock.
        return { kind: "requested", distinctTabs, request: await options.request.request(actor, chartId, locale, { guestEngaged: engaged }) };
      } catch {
        return { kind: "ignored", reason: "error" };
      }
    },
  };
}
export type FreePalaceEngagementService = ReturnType<typeof createFreePalaceEngagementService>;
