import {
  FREE_AI_COORDINATION_LOCK, freeAiQuotaAlias, lockFreeAiCoordination, readLockedFreeAiQuota,
  resolveLockedFreeAiSubject, sampleFreeAiClock, type FreeAiSubjectKind, type FreeAiTransaction,
} from "@lasoviet/database";

// Quota identity and locking primitives live in @lasoviet/database so linking shares them.
export {
  FREE_AI_COORDINATION_LOCK, freeAiQuotaAlias, lockFreeAiCoordination, readLockedFreeAiQuota,
  resolveLockedFreeAiSubject, sampleFreeAiClock,
};
export type { FreeAiSubjectKind, FreeAiTransaction };
export function checkFreeAiQuota(kind: FreeAiSubjectKind, admissions: ReadonlyArray<{ requestId: string; admittedAt: Date }>, now: Date): boolean {
  if (!Number.isFinite(now.getTime())) return false;
  const cutoff = now.getTime() - 86400000;
  const ids = new Set(admissions.filter((a) => a.admittedAt.getTime() > cutoff).map((a) => a.requestId));
  return ids.size < (kind === "guest" ? 1 : 3);
}
