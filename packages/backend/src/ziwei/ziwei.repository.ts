import { randomUUID } from "node:crypto";

import { and, eq, gt, isNull } from "drizzle-orm";

import type {
  BirthProfileV1,
  CurrentActor,
  NormalizedBirthProfileV1,
  NormalizedZiweiChartV1,
} from "@lasoviet/contracts";
import {
  birthProfileRevisions,
  birthProfiles,
  calculationRuns,
  type Database,
  ziweiChartVersions,
  ziweiCharts,
} from "@lasoviet/database";

export type AuthorizedZiweiRevision = {
  profileId: string;
  revisionId: string;
  normalized: NormalizedBirthProfileV1;
};

export type CreateZiweiCalculationInput = {
  profileId: string;
  revisionId: string;
  idempotencyKey: string;
  chart: NormalizedZiweiChartV1;
  rawSnapshot: Record<string, unknown>;
  now: Date;
};

export type ZiweiCalculationRepository = {
  readAuthorizedRevision(
    actor: CurrentActor,
    revisionId: string,
    now: Date,
  ): Promise<AuthorizedZiweiRevision | null>;
  create(
    input: CreateZiweiCalculationInput,
  ): Promise<{ chartId: string; chartVersionId: string; reused: boolean }>;
};

function ownerFilter(actor: CurrentActor, now: Date) {
  return actor.kind === "account"
    ? eq(birthProfiles.userId, actor.userId)
    : and(
        eq(birthProfiles.anonymousActorId, actor.anonymousActorId),
        gt(birthProfiles.anonymousExpiresAt, now),
      );
}

async function existing(
  database: Database,
  idempotencyKey: string,
  revisionId: string,
) {
  const [record] = await database
    .select({
      chartId: ziweiCharts.id,
      chartVersionId: ziweiChartVersions.id,
    })
    .from(calculationRuns)
    .innerJoin(
      ziweiChartVersions,
      eq(ziweiChartVersions.calculationRunId, calculationRuns.id),
    )
    .innerJoin(ziweiCharts, eq(ziweiCharts.id, ziweiChartVersions.chartId))
    .where(
      and(
        eq(calculationRuns.idempotencyKey, idempotencyKey),
        eq(calculationRuns.profileRevisionId, revisionId),
      ),
    )
    .limit(1);
  return record;
}

export function createDatabaseZiweiCalculationRepository(
  database: Database,
): ZiweiCalculationRepository {
  return {
    async readAuthorizedRevision(actor, revisionId, now) {
      const [record] = await database
        .select({
          profileId: birthProfiles.id,
          revisionId: birthProfileRevisions.id,
          originalInput: birthProfileRevisions.originalInput,
          normalizedInput: birthProfileRevisions.normalizedInput,
          normalizationWarnings: birthProfileRevisions.normalizationWarnings,
          limitations: birthProfileRevisions.limitations,
        })
        .from(birthProfileRevisions)
        .innerJoin(
          birthProfiles,
          eq(birthProfiles.id, birthProfileRevisions.profileId),
        )
        .where(
          and(
            eq(birthProfileRevisions.id, revisionId),
            ownerFilter(actor, now),
            isNull(birthProfiles.deletedAt),
          ),
        )
        .limit(1);
      if (record === undefined || record.normalizedInput === null) {
        return null;
      }
      return {
        profileId: record.profileId,
        revisionId: record.revisionId,
        normalized: {
          ...(record.normalizedInput as Omit<
            NormalizedBirthProfileV1,
            "originalInput"
          >),
          originalInput: record.originalInput as BirthProfileV1,
        },
      };
    },

    async create(input) {
      return database.transaction(async (transaction) => {
        const prior = await existing(
          transaction,
          input.idempotencyKey,
          input.revisionId,
        );
        if (prior !== undefined) {
          return { ...prior, reused: true };
        }
        const runId = randomUUID();
        const inserted = await transaction
          .insert(calculationRuns)
          .values({
            id: runId,
            profileId: input.profileId,
            profileRevisionId: input.revisionId,
            idempotencyKey: input.idempotencyKey,
            engineId: input.chart.provenance.engineId,
            engineVersion: input.chart.provenance.engineVersion,
            adapterId: input.chart.provenance.adapterId,
            adapterVersion: input.chart.provenance.adapterVersion,
            schemaId: input.chart.provenance.schemaId,
            ruleSetId: input.chart.provenance.ruleSetId,
            inputHash: input.chart.provenance.inputHash,
            configHash: input.chart.provenance.configHash,
            rawSnapshotHash: input.chart.provenance.rawSnapshotHash,
            createdAt: input.now,
          })
          .onConflictDoNothing()
          .returning({ id: calculationRuns.id });
        if (inserted[0] === undefined) {
          const concurrent = await existing(
            transaction,
            input.idempotencyKey,
            input.revisionId,
          );
          if (concurrent === undefined) {
            throw new Error("ZIWEI_IDEMPOTENCY_LOOKUP_FAILED");
          }
          return { ...concurrent, reused: true };
        }
        await transaction
          .insert(ziweiCharts)
          .values({
            id: randomUUID(),
            profileId: input.profileId,
            profileRevisionId: input.revisionId,
            createdAt: input.now,
          })
          .onConflictDoNothing();
        const [chart] = await transaction
          .select({ id: ziweiCharts.id })
          .from(ziweiCharts)
          .where(eq(ziweiCharts.profileRevisionId, input.revisionId))
          .limit(1);
        if (chart === undefined) {
          throw new Error("ZIWEI_CHART_MISSING");
        }
        const chartVersionId = randomUUID();
        await transaction.insert(ziweiChartVersions).values({
          id: chartVersionId,
          chartId: chart.id,
          calculationRunId: runId,
          normalizedOutput: input.chart,
          privateRawSnapshot: input.rawSnapshot,
          warnings: input.chart.warnings.map((warning) => warning.code),
          provenance: input.chart.provenance,
          createdAt: input.now,
        });
        return { chartId: chart.id, chartVersionId, reused: false };
      });
    },
  };
}
