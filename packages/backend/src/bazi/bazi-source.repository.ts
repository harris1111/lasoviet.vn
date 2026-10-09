import { createHash, randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import type { CurrentActor, NormalizedBaziChartV1 } from "@lasoviet/contracts";
import { authAnonymousActors, authUsers, baziSources, birthProfileRevisions, birthProfiles,
  calculationRuns, deletionRequests, lockFreeAiCoordination, lockRecoveryCaptureCoordination,
  type Database } from "@lasoviet/database";
import { baziCalculationKey, calculateNormalizedBaziChart, resolveBaziBirthProfileInput,
  validateNormalizedBaziChart } from "@lasoviet/engine-adapters";

export const BAZI_PROFILE_MAPPING_VERSION = "lasoviet.bazi.birth-profile.v1";
type Transaction = Parameters<Parameters<Database["transaction"]>[0]>[0];
type Revision = typeof birthProfileRevisions.$inferSelect;
type Source = typeof baziSources.$inferSelect;
type Run = typeof calculationRuns.$inferSelect;
export type AuthorizedBaziSource = {sourceId: string; chart: NormalizedBaziChartV1; reused: boolean};
export type BaziSourceResult = {ok: true; value: AuthorizedBaziSource}
  | {ok: false; error: {code: string}};
const denied = (code = "BAZI_SOURCE_UNAVAILABLE"): BaziSourceResult => ({ok: false, error: {code}});

function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value !== null && typeof value === "object") {
    const r = value as Record<string, unknown>;
    return `{${Object.keys(r).sort().map(k => `${JSON.stringify(k)}:${canonical(r[k])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}
function revisionHash(r: Revision) {
  return createHash("sha256").update(canonical({...r, createdAt: r.createdAt.toISOString()})).digest("hex");
}
function mappedRevision(r: Revision) {
  if (r.normalizedInput === null) return null;
  return resolveBaziBirthProfileInput({...r.normalizedInput, originalInput: r.originalInput});
}

async function authorized(tx: Transaction, actor: CurrentActor, revisionId: string, clock: () => Date) {
  // Linking and guest purge take free-AI first; account deletion takes recovery first.
  await lockFreeAiCoordination(tx);
  await lockRecoveryCaptureCoordination(tx);
  if (actor.kind === "account") {
    const [owner] = await tx.select().from(authUsers).where(eq(authUsers.id, actor.userId)).for("update");
    if (!owner || owner.isAnonymous) return null;
  } else {
    const [owner] = await tx.select().from(authAnonymousActors)
      .where(eq(authAnonymousActors.id, actor.anonymousActorId)).for("update");
    if (!owner || owner.linkedUserId !== null || owner.deletedAt !== null) return null;
  }
  const [r] = await tx.select().from(birthProfileRevisions).where(eq(birthProfileRevisions.id, revisionId)).for("update");
  if (!r) return null;
  const [profile] = await tx.select().from(birthProfiles).where(eq(birthProfiles.id, r.profileId)).for("update");
  const now = clock(); // All lock waits precede the authoritative lifecycle clock.
  if (!Number.isFinite(now.getTime()) || !profile || profile.deletedAt !== null) return null;
  if (actor.kind === "account") {
    if (profile.userId !== actor.userId) return null;
    const [deletion] = await tx.select().from(deletionRequests).where(eq(deletionRequests.userId, actor.userId));
    if (deletion && deletion.status !== "cancelled") return null;
  } else {
    const [owner] = await tx.select().from(authAnonymousActors).where(eq(authAnonymousActors.id, actor.anonymousActorId));
    const actorExpiry = new Date(actor.expiresAt);
    if (!owner || profile.anonymousActorId !== actor.anonymousActorId || profile.userId !== null
      || !profile.anonymousExpiresAt || profile.anonymousExpiresAt <= now || owner.expiresAt <= now
      || !Number.isFinite(actorExpiry.getTime()) || actorExpiry <= now) return null;
  }
  return {revision: r, now};
}

function validated(source: Source, run: Run, revision: Revision): NormalizedBaziChartV1 {
  const mapped = mappedRevision(revision);
  if (!mapped?.ok || source.mappingVersion !== BAZI_PROFILE_MAPPING_VERSION
    || source.profileRevisionHash !== revisionHash(revision) || canonical(source.resolvedInput) !== canonical(mapped.value)
    || source.profileId !== revision.profileId || source.profileRevisionId !== revision.id
    || run.id !== source.calculationRunId || run.profileId !== revision.profileId || run.profileRevisionId !== revision.id)
    throw new Error("BAZI_SOURCE_INVALID");
  const stored = validateNormalizedBaziChart(source.normalizedOutput);
  const at = new Date(stored.provenance.calculatedAt);
  const recomputed = calculateNormalizedBaziChart(mapped.value, at);
  if (canonical(stored) !== canonical(recomputed) || source.createdAt.getTime() !== at.getTime()
    || run.createdAt.getTime() !== at.getTime() || run.idempotencyKey !== baziCalculationKey(recomputed))
    throw new Error("BAZI_SOURCE_INVALID");
  for (const key of ["engineId", "engineVersion", "adapterId", "adapterVersion", "schemaId", "ruleSetId",
    "inputHash", "configHash", "rawSnapshotHash"] as const)
    if (run[key] !== recomputed.provenance[key]) throw new Error("BAZI_SOURCE_INVALID");
  return stored;
}

/** Server-only repository: actor identity comes from authentication, never browser input. */
export function createDatabaseBaziSourceRepository(database: Database, options: {clock?: () => Date} = {}) {
  const clock = options.clock ?? (() => new Date());
  return {
    async calculate(actor: CurrentActor, revisionId: string): Promise<BaziSourceResult> {
      return database.transaction(async tx => {
        const auth = await authorized(tx, actor, revisionId, clock);
        if (!auth) return denied();
        const mapped = mappedRevision(auth.revision);
        if (!mapped) return denied("BAZI_PROFILE_INVALID");
        if (!mapped.ok) return denied(mapped.error.code);
        const chart = calculateNormalizedBaziChart(mapped.value, auth.now), key = baziCalculationKey(chart);
        const [prior] = await tx.select().from(calculationRuns)
          .where(and(eq(calculationRuns.profileRevisionId, revisionId), eq(calculationRuns.idempotencyKey, key)));
        if (prior) {
          const [source] = await tx.select().from(baziSources).where(eq(baziSources.calculationRunId, prior.id));
          if (!source) return denied("BAZI_SOURCE_INVALID");
          try { return {ok: true, value: {sourceId: source.id, chart: validated(source, prior, auth.revision), reused: true}}; }
          catch { return denied("BAZI_SOURCE_INVALID"); }
        }
        const runId = randomUUID(), sourceId = randomUUID();
        const p = chart.provenance;
        await tx.insert(calculationRuns).values({id: runId, profileId: auth.revision.profileId,
          profileRevisionId: revisionId, idempotencyKey: key, engineId: p.engineId, engineVersion: p.engineVersion,
          adapterId: p.adapterId, adapterVersion: p.adapterVersion, schemaId: p.schemaId, ruleSetId: p.ruleSetId,
          inputHash: p.inputHash, configHash: p.configHash, rawSnapshotHash: p.rawSnapshotHash, createdAt: auth.now});
        await tx.insert(baziSources).values({id: sourceId, profileId: auth.revision.profileId, profileRevisionId: revisionId,
          calculationRunId: runId, mappingVersion: BAZI_PROFILE_MAPPING_VERSION,
          profileRevisionHash: revisionHash(auth.revision), resolvedInput: mapped.value, normalizedOutput: chart, createdAt: auth.now});
        return {ok: true, value: {sourceId, chart, reused: false}};
      });
    },
    async read(actor: CurrentActor, sourceId: string): Promise<BaziSourceResult> {
      return database.transaction(async tx => {
        // The lookup locates a revision only; it grants no authorization or payload access.
        const [hint] = await tx.select({revisionId: baziSources.profileRevisionId}).from(baziSources).where(eq(baziSources.id, sourceId));
        if (!hint) return denied();
        const auth = await authorized(tx, actor, hint.revisionId, clock);
        if (!auth) return denied();
        const [source] = await tx.select().from(baziSources).where(eq(baziSources.id, sourceId));
        if (!source) return denied();
        const [run] = await tx.select().from(calculationRuns).where(eq(calculationRuns.id, source.calculationRunId));
        if (!run) return denied("BAZI_SOURCE_INVALID");
        try { return {ok: true, value: {sourceId, chart: validated(source, run, auth.revision), reused: true}}; }
        catch { return denied("BAZI_SOURCE_INVALID"); }
      });
    },
  };
}
