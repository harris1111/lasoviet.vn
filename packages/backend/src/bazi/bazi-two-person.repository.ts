import { createHash } from "node:crypto";
import { eq, inArray } from "drizzle-orm";
import { BaziTwoPersonSourceV1Schema, type CurrentActor, type NormalizedBaziChartV1,
  type BaziTwoPersonSourceV1 } from "@lasoviet/contracts";
import { authAnonymousActors, baziSources, birthProfiles, type Database } from "@lasoviet/database";
import { baziCalculationKey, baziTenGod } from "@lasoviet/engine-adapters";
import { createDatabaseBaziSourceRepository } from "./bazi-source.repository.js";

const denied = () => ({ok: false as const, error: {code: "BAZI_TWO_PERSON_UNAVAILABLE" as const}});
function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value !== null && typeof value === "object") {
    const r = value as Record<string, unknown>;
    return `{${Object.keys(r).sort().map(k => `${JSON.stringify(k)}:${canonical(r[k])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}
function crossReadings(referenceRole: "primary" | "counterpart", reference: NormalizedBaziChartV1, relative: NormalizedBaziChartV1) {
  const other = referenceRole === "primary" ? "counterpart" : "primary";
  return reference.facts.pillars.day.flatMap((day, dayVariant) => {
    const dayEvidence = reference.facts.evidence.find(e => e.pillar === "day" && e.variant === dayVariant)!;
    return (["year", "month", "day", "hour"] as const).flatMap(pillar => {
      const candidates = pillar === "hour" ? relative.facts.pillars.hour ? [relative.facts.pillars.hour] : [] : relative.facts.pillars[pillar];
      return candidates.map((candidate, variant) => {
        const evidence = relative.facts.evidence.find(e => e.pillar === pillar && e.variant === variant)!;
        return {referenceRole, dayVariant, dayMasterStemId: day.stemId, relativePillar: pillar, relativeVariant: variant,
          stemId: candidate.stemId, branchId: candidate.branchId, stemTenGod: baziTenGod(day.stemId, candidate.stemId),
          hiddenStems: candidate.hiddenStemIds.map(stemId => ({stemId, tenGod: baziTenGod(day.stemId, stemId)})),
          evidenceKeys: [`${referenceRole}.${dayEvidence.key}`, `${other}.${evidence.key}`] as [string, string]};
      });
    });
  });
}

/** Server-only preparation; source IDs never authorize access by themselves. */
export function createDatabaseBaziTwoPersonRepository(database: Database, options: {clock?: () => Date} = {}) {
  const clock = options.clock ?? (() => new Date());
  return {
    async prepare(actor: CurrentActor, input: {primarySourceId: string; counterpartSourceId: string}) {
      if (!input || typeof input.primarySourceId !== "string" || typeof input.counterpartSourceId !== "string" ||
          !input.primarySourceId.trim() || !input.counterpartSourceId.trim() || input.primarySourceId.length > 255 ||
          input.counterpartSourceId.length > 255 || input.primarySourceId === input.counterpartSourceId) return denied();
      return database.transaction(async tx => {
        // Nested reads use savepoints on this same PostgreSQL transaction. Their
        // coordinator/owner/profile locks remain held until both sources are bound.
        const sources = createDatabaseBaziSourceRepository(tx as Database, {clock});
        const primary = await sources.read(actor, input.primarySourceId);
        if (!primary.ok) return denied();
        const counterpart = await sources.read(actor, input.counterpartSourceId);
        if (!counterpart.ok || counterpart.value.chart.timePrecision !== "unknown") return denied();
        const profiles = await tx.select({sourceId: baziSources.id, profileId: birthProfiles.id,
          deletedAt: birthProfiles.deletedAt, expiresAt: birthProfiles.anonymousExpiresAt})
          .from(baziSources).innerJoin(birthProfiles, eq(birthProfiles.id, baziSources.profileId))
          .where(inArray(baziSources.id, [input.primarySourceId, input.counterpartSourceId])).orderBy(baziSources.id).for("update");
        const finalNow = clock();
        if (!Number.isFinite(finalNow.getTime()) || profiles.length !== 2 || new Set(profiles.map(p => p.profileId)).size !== 2 ||
            profiles.some(p => p.deletedAt !== null)) return denied();
        if (actor.kind === "anonymous") {
          const [owner] = await tx.select({expiresAt: authAnonymousActors.expiresAt}).from(authAnonymousActors)
            .where(eq(authAnonymousActors.id, actor.anonymousActorId));
          if (!owner || owner.expiresAt <= finalNow || new Date(actor.expiresAt) <= finalNow ||
              profiles.some(p => !p.expiresAt || p.expiresAt <= finalNow)) return denied();
        }
        const one = {sourceId: primary.value.sourceId, calculationKey: baziCalculationKey(primary.value.chart), chart: primary.value.chart};
        const two = {sourceId: counterpart.value.sourceId, calculationKey: baziCalculationKey(counterpart.value.chart), chart: counterpart.value.chart};
        const value = {version: 1 as const, sourceVersion: "bazi.two-person.structural.source.v1" as const,
          status: "draft_source" as const, manualAccepted: false as const, primary: one, counterpart: two,
          relations: [...crossReadings("primary", one.chart, two.chart), ...crossReadings("counterpart", two.chart, one.chart)]};
        const parsed: BaziTwoPersonSourceV1 = BaziTwoPersonSourceV1Schema.parse({...value,
          sourceHash: createHash("sha256").update(canonical(value)).digest("hex")});
        return {ok: true as const, value: parsed};
      });
    },
  };
}
