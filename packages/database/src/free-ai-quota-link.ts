import { createHash } from "node:crypto";
import { and, countDistinct, eq, gt, inArray, sql } from "drizzle-orm";

import type { Database } from "./client.js";
import { freeAiAdmissions, freeAiQuotaAliases, freeAiQuotaSubjects } from "./schema/free-ai.js";

// The single definition of free-AI quota identity and locking. packages/backend imports these
// from here (packages/database must never import backend), so the alias hash and lock keys
// cannot diverge between admission, linking, fencing and deletion.
export const FREE_AI_COORDINATION_LOCK = "lasoviet:free-ai:coordination:v1";
export type FreeAiTransaction = Parameters<Parameters<Database["transaction"]>[0]>[0];
export type FreeAiSubjectKind = "guest" | "account";

export function freeAiQuotaAlias(kind: FreeAiSubjectKind, actorId: string): string {
  return createHash("sha256").update(JSON.stringify(["free-ai-quota-v1", kind, actorId])).digest("hex");
}

// Every free-AI writer takes this first, so a lock-ordering cycle is impossible.
export async function lockFreeAiCoordination(tx: FreeAiTransaction): Promise<void> {
  await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtextextended(${FREE_AI_COORDINATION_LOCK}, 0))`);
}

// Fresh wall clock after lock waits; a transaction-start now() can be a day stale.
export async function sampleFreeAiClock(tx: FreeAiTransaction): Promise<Date> {
  const result = await tx.execute<{ at: Date | string }>(sql`SELECT clock_timestamp() AS at`);
  const now = new Date(result[0]!.at);
  if (!Number.isFinite(now.getTime())) throw new Error("FREE_AI_CLOCK_INVALID");
  return now;
}

// Called only after taking the common transaction lock, also used by link/delete/fence.
export async function resolveLockedFreeAiSubject(tx: FreeAiTransaction, aliasKey: string, kind: FreeAiSubjectKind) {
  let [alias] = await tx.select().from(freeAiQuotaAliases).where(eq(freeAiQuotaAliases.aliasKey, aliasKey)).limit(1);
  if (!alias) {
    const [subject] = await tx.insert(freeAiQuotaSubjects).values({ kind }).returning();
    [alias] = await tx.insert(freeAiQuotaAliases).values({ aliasKey, subjectId: subject!.id }).returning();
  }
  let id = alias!.subjectId;
  const visited = new Set<string>();
  for (;;) {
    if (visited.has(id) || visited.size >= 64) throw new Error("FREE_AI_QUOTA_LINEAGE_INVALID");
    visited.add(id);
    const [subject] = await tx.select().from(freeAiQuotaSubjects).where(eq(freeAiQuotaSubjects.id, id)).limit(1);
    if (!subject) throw new Error("FREE_AI_QUOTA_LINEAGE_INVALID");
    if (subject.mergedIntoSubjectId) { id = subject.mergedIntoSubjectId; continue; }
    for (const subjectId of [...visited].sort()) {
      await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtextextended(${"free-ai:subject:" + subjectId}, 0))`);
    }
    return { id, kind: subject.kind as FreeAiSubjectKind };
  }
}

export async function readLockedFreeAiQuota(tx: FreeAiTransaction, subject: { id: string; kind: FreeAiSubjectKind }, now: Date): Promise<boolean> {
  const [row] = await tx.select({ count: countDistinct(freeAiAdmissions.requestId) }).from(freeAiAdmissions)
    .where(and(eq(freeAiAdmissions.subjectId, subject.id), gt(freeAiAdmissions.admittedAt, new Date(now.getTime() - 86400000))));
  return Number(row!.count) < (subject.kind === "guest" ? 1 : 3);
}

// Unions a guest's quota history into the account's inside the caller's linking transaction.
// Must run before the anonymous auth row is deleted. History lives on subjects with no auth
// foreign key, so it survives that deletion. Idempotent; never resets and never duplicates:
// one admission row exists per request, and the rolling count is distinct per request.
export async function mergeFreeAiQuotaHistory(tx: FreeAiTransaction, anonymousActorId: string, userId: string): Promise<{ merged: boolean }> {
  await lockFreeAiCoordination(tx);
  const guestKey = freeAiQuotaAlias("guest", anonymousActorId);
  // Re-resolved under the lock: a stale hint without a stored history must not create an empty one.
  const [guestAlias] = await tx.select({ key: freeAiQuotaAliases.aliasKey }).from(freeAiQuotaAliases).where(eq(freeAiQuotaAliases.aliasKey, guestKey)).limit(1);
  if (!guestAlias) return { merged: false };
  const guest = await resolveLockedFreeAiSubject(tx, guestKey, "guest");
  const account = await resolveLockedFreeAiSubject(tx, freeAiQuotaAlias("account", userId), "account");
  if (guest.id === account.id || guest.kind !== "guest") return { merged: false };
  await tx.update(freeAiQuotaSubjects).set({ mergedIntoSubjectId: account.id }).where(eq(freeAiQuotaSubjects.mergedIntoSubjectId, guest.id));
  await tx.update(freeAiQuotaSubjects).set({ mergedIntoSubjectId: account.id }).where(eq(freeAiQuotaSubjects.id, guest.id));
  const merged = await tx.select({ id: freeAiQuotaSubjects.id }).from(freeAiQuotaSubjects).where(eq(freeAiQuotaSubjects.mergedIntoSubjectId, account.id));
  await tx.update(freeAiAdmissions).set({ subjectId: account.id }).where(inArray(freeAiAdmissions.subjectId, merged.map((row) => row.id)));
  return { merged: true };
}
