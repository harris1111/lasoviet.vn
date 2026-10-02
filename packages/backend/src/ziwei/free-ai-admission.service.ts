import { createHash } from "node:crypto";
import { and, countDistinct, eq, gt, sql } from "drizzle-orm";
import { freeAiAdmissions, freeAiQuotaAliases, freeAiQuotaSubjects, type Database } from "@lasoviet/database";

export const FREE_AI_COORDINATION_LOCK = "lasoviet:free-ai:coordination:v1";
export type FreeAiTransaction = Parameters<Parameters<Database["transaction"]>[0]>[0];
export type FreeAiSubjectKind = "guest" | "account";
export function freeAiQuotaAlias(kind: FreeAiSubjectKind, actorId: string): string {
  return createHash("sha256").update(JSON.stringify(["free-ai-quota-v1", kind, actorId])).digest("hex");
}
export function checkFreeAiQuota(kind: FreeAiSubjectKind, admissions: ReadonlyArray<{ requestId: string; admittedAt: Date }>, now: Date): boolean {
  if (!Number.isFinite(now.getTime())) return false;
  const cutoff = now.getTime() - 86400000;
  const ids = new Set(admissions.filter((a) => a.admittedAt.getTime() > cutoff).map((a) => a.requestId));
  return ids.size < (kind === "guest" ? 1 : 3);
}
export async function lockFreeAiCoordination(tx: FreeAiTransaction): Promise<void> {
  await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtextextended(${FREE_AI_COORDINATION_LOCK}, 0))`);
}
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
      await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtextextended(${'free-ai:subject:' + subjectId}, 0))`);
    }
    return { id, kind: subject.kind as FreeAiSubjectKind };
  }
}
export async function readLockedFreeAiQuota(tx: FreeAiTransaction, subject: { id: string; kind: FreeAiSubjectKind }, now: Date): Promise<boolean> {
  const [row] = await tx.select({ count: countDistinct(freeAiAdmissions.requestId) }).from(freeAiAdmissions)
    .where(and(eq(freeAiAdmissions.subjectId, subject.id), gt(freeAiAdmissions.admittedAt, new Date(now.getTime() - 86400000))));
  return Number(row!.count) < (subject.kind === "guest" ? 1 : 3);
}
