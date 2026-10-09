import { isDeepStrictEqual } from "node:util";
import { and, eq } from "drizzle-orm";
import { NormalizedBirthProfileV1Schema, NormalizedZiweiChartV1Schema,
  type CurrentActor, type ZiweiDecadalReadingSourceV1 } from "@lasoviet/contracts";
import { authUsers, birthProfiles, birthProfileRevisions, calculationRuns, deletionRequests,
  lockFreeAiCoordination, lockRecoveryCaptureCoordination, ziweiCharts, ziweiChartVersions,
  type Database } from "@lasoviet/database";
import { buildDecadalReadingSource } from "./decadal-reading-source.js";
import { deriveReportTimingLineage } from "./identity-report-config.js";

export type DecadalPurchaseSource = { source: ZiweiDecadalReadingSourceV1; periodKey: string; remainingYears: number };
export type DecadalPurchaseSourceResult = {ok: true; value: DecadalPurchaseSource}
  | {ok: false; error: {code: "DECADAL_PURCHASE_SOURCE_UNAVAILABLE"}};
const unavailable = (): DecadalPurchaseSourceResult => ({ok: false, error: {code: "DECADAL_PURCHASE_SOURCE_UNAVAILABLE"}});

/** Private identity for the actual selected lunar span; no financial authority. */
export function decadalPurchasePeriodKey(source: ZiweiDecadalReadingSourceV1): string {
  return `decade:${source.cycle.ordinal}:${source.cycle.startYear}:${source.cycle.endYear}`;
}

/** Authenticated server callers only. A prepared source never authorizes a debit.
 * Purchase integration must revalidate inside its own lifecycle transaction. */
export function createDatabaseDecadalPurchaseSourceRepository(database: Database, options: {clock?: () => Date} = {}) {
  const clock = options.clock ?? (() => new Date());
  return {
    async prepare(actor: CurrentActor, input: {chartId: string; chartVersionId: string;
      selection: "current" | "next"; expectedPeriodKey?: string}): Promise<DecadalPurchaseSourceResult> {
      if (actor.kind !== "account" || !input.chartId?.trim() || !input.chartVersionId?.trim() ||
          !["current", "next"].includes(input.selection)) return unavailable();
      return database.transaction(async tx => {
        // Match linking/purge/deletion's established lifecycle order; retain locks
        // until all actual-engine work and the final date check are complete.
        await lockFreeAiCoordination(tx);
        await lockRecoveryCaptureCoordination(tx);
        const [owner] = await tx.select().from(authUsers).where(eq(authUsers.id, actor.userId)).for("update");
        if (!owner || owner.isAnonymous || !owner.emailVerified) return unavailable();
        const [deletion] = await tx.select().from(deletionRequests).where(eq(deletionRequests.userId, actor.userId));
        if (deletion && deletion.status !== "cancelled") return unavailable();
        const [hint] = await tx.select({profileId: ziweiCharts.profileId}).from(ziweiCharts)
          .where(eq(ziweiCharts.id, input.chartId));
        if (!hint) return unavailable();
        const [profile] = await tx.select().from(birthProfiles)
          .where(and(eq(birthProfiles.id, hint.profileId), eq(birthProfiles.userId, actor.userId))).for("update");
        if (!profile || profile.deletedAt !== null || profile.anonymousActorId !== null) return unavailable();
        const [chart] = await tx.select().from(ziweiCharts).where(eq(ziweiCharts.id, input.chartId)).for("update");
        if (!chart || chart.profileId !== profile.id) return unavailable();
        const [revision] = await tx.select().from(birthProfileRevisions)
          .where(eq(birthProfileRevisions.id, chart.profileRevisionId)).for("update");
        if (!revision || revision.profileId !== profile.id || !revision.normalizedInput) return unavailable();
        const [version] = await tx.select().from(ziweiChartVersions)
          .where(and(eq(ziweiChartVersions.id, input.chartVersionId), eq(ziweiChartVersions.chartId, chart.id))).for("update");
        if (!version) return unavailable();
        const [run] = await tx.select().from(calculationRuns).where(eq(calculationRuns.id, version.calculationRunId)).for("update");
        if (!run || run.profileId !== profile.id || run.profileRevisionId !== revision.id) return unavailable();
        const parsed = NormalizedZiweiChartV1Schema.safeParse(version.normalizedOutput);
        const birth = NormalizedBirthProfileV1Schema.safeParse({...revision.normalizedInput, originalInput: revision.originalInput});
        if (!parsed.success || !birth.success || !isDeepStrictEqual(version.provenance, parsed.data.provenance)) return unavailable();
        for (const key of ["engineId", "engineVersion", "adapterId", "adapterVersion", "schemaId", "ruleSetId",
          "inputHash", "configHash", "rawSnapshotHash"] as const) if (run[key] !== parsed.data.provenance[key]) return unavailable();
        const provenance = parsed.data.provenance;
        if (run.idempotencyKey !== [provenance.inputHash, provenance.engineVersion, provenance.adapterVersion, provenance.configHash].join(":")) return unavailable();
        const now = clock();
        if (!Number.isFinite(now.getTime())) return unavailable();
        const {asOfDate} = deriveReportTimingLineage(now);
        try {
          const facts = {chartId: chart.id, chartVersionId: version.id, birthProfile: birth.data, storedChart: parsed.data, asOfDate};
          const current = await buildDecadalReadingSource({...facts, selection: "current"});
          // Approved BE-P1-6: k=year-start+1; R=10-k (future years remaining).
          const remainingYears = current.cycle.endYear - current.lunarYear;
          if (remainingYears < 0 || remainingYears > 9 || (input.selection === "next" && remainingYears > 2)) return unavailable();
          const source = input.selection === "current" ? current : await buildDecadalReadingSource({...facts, selection: "next"});
          const periodKey = decadalPurchasePeriodKey(source);
          if (input.expectedPeriodKey !== undefined && input.expectedPeriodKey !== periodKey) return unavailable();
          const finalNow = clock();
          if (!Number.isFinite(finalNow.getTime()) || deriveReportTimingLineage(finalNow).asOfDate !== asOfDate) return unavailable();
          return {ok: true, value: {source, periodKey, remainingYears}};
        } catch { return unavailable(); }
      });
    },
  };
}
