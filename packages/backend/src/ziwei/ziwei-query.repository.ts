import { and, desc, eq, gt, isNull, notExists } from "drizzle-orm";

import type { CurrentActor, TopConcernV1 } from "@lasoviet/contracts";
import {
  birthProfileReadingContextRevisions,
  birthProfileReadingContexts,
  birthProfileRevisions,
  birthProfiles,
  deletionRequests,
  evidenceItems,
  evidenceSets,
  type Database,
  ziweiChartVersions,
  ziweiCharts,
} from "@lasoviet/database";

export type AuthorizedZiweiChartRecord = {
  chartId: string;
  chartVersionId: string;
  normalizedOutput: Record<string, unknown>;
  freeOverviewCache?: Record<string, unknown> | null;
  originalInput: Record<string, unknown>;
  normalizedInput: Record<string, unknown> | null;
  topConcern?: TopConcernV1 | null;
  evidenceSetId: string | null;
  capabilityId: string | null;
  ruleVersion: string | null;
  items: Array<{ id: string; payload: Record<string, unknown> }>;
};

export type ZiweiQueryRepository = {
  readAuthorizedChart(
    actor: CurrentActor,
    chartId: string,
    now: Date,
    transaction?: Pick<Database, "select">,
  ): Promise<AuthorizedZiweiChartRecord | null>;
  readEvidenceItem(
    evidenceSetId: string,
    evidenceId: string,
  ): Promise<{ id: string; payload: Record<string, unknown> } | null>;
};

function ownerFilter(actor: CurrentActor, now: Date, database: Pick<Database, "select">) {
  return actor.kind === "account"
    ? and(
        eq(birthProfiles.userId, actor.userId),
        // Purge closes access before the asynchronous outbox removes the profile rows.
        notExists(database.select({ id: deletionRequests.id }).from(deletionRequests).where(
          and(eq(deletionRequests.userId, actor.userId), eq(deletionRequests.status, "purged")),
        )),
      )
    : and(
        eq(birthProfiles.anonymousActorId, actor.anonymousActorId),
        gt(birthProfiles.anonymousExpiresAt, now),
      );
}

export function createDatabaseZiweiQueryRepository(
  database: Database,
): ZiweiQueryRepository {
  return {
    async readAuthorizedChart(actor, chartId, now, transaction) {
      const sourceDatabase = transaction ?? database;
      const [record] = await sourceDatabase
        .select({
          chartId: ziweiCharts.id,
          chartVersionId: ziweiChartVersions.id,
          normalizedOutput: ziweiChartVersions.normalizedOutput,
          freeOverviewCache: ziweiChartVersions.freeOverviewCache,
          originalInput: birthProfileRevisions.originalInput,
          normalizedInput: birthProfileRevisions.normalizedInput,
          topConcern: birthProfileReadingContextRevisions.topConcern,
        })
        .from(ziweiCharts)
        .innerJoin(birthProfiles, eq(birthProfiles.id, ziweiCharts.profileId))
        .innerJoin(
          birthProfileRevisions,
          eq(birthProfileRevisions.id, ziweiCharts.profileRevisionId),
        )
        .innerJoin(
          ziweiChartVersions,
          eq(ziweiChartVersions.chartId, ziweiCharts.id),
        )
        .leftJoin(
          birthProfileReadingContexts,
          eq(birthProfileReadingContexts.profileId, ziweiCharts.profileId),
        )
        .leftJoin(
          birthProfileReadingContextRevisions,
          eq(
            birthProfileReadingContextRevisions.id,
            birthProfileReadingContexts.currentRevisionId,
          ),
        )
        .where(
          and(
            eq(ziweiCharts.id, chartId),
            ownerFilter(actor, now, sourceDatabase),
            isNull(birthProfiles.deletedAt),
          ),
        )
        .orderBy(desc(ziweiChartVersions.createdAt), desc(ziweiChartVersions.id))
        .limit(1);
      if (record === undefined) {
        return null;
      }
      const [evidenceSet] = await sourceDatabase
        .select({
          evidenceSetId: evidenceSets.id,
          capabilityId: evidenceSets.capabilityId,
          ruleVersion: evidenceSets.ruleVersion,
        })
        .from(evidenceSets)
        .where(
          and(
            eq(evidenceSets.chartVersionId, record.chartVersionId),
            eq(evidenceSets.capabilityId, "ziwei.identity.p0"),
            eq(evidenceSets.ruleVersion, "ziwei.identity.v1"),
          ),
        )
        .limit(1);
      const topConcern = (record.topConcern ?? undefined) as TopConcernV1 | undefined;
      if (evidenceSet === undefined) {
        return {
          ...record,
          topConcern,
          evidenceSetId: null,
          capabilityId: null,
          ruleVersion: null,
          items: [],
        };
      }
      const items = await sourceDatabase
        .select({ id: evidenceItems.id, payload: evidenceItems.payload })
        .from(evidenceItems)
        .where(eq(evidenceItems.evidenceSetId, evidenceSet.evidenceSetId))
        .orderBy(evidenceItems.evidenceKey);
      return { ...record, topConcern, ...evidenceSet, items };
    },

    async readEvidenceItem(evidenceSetId, evidenceId) {
      const [item] = await database
        .select({ id: evidenceItems.id, payload: evidenceItems.payload })
        .from(evidenceItems)
        .where(
          and(
            eq(evidenceItems.evidenceSetId, evidenceSetId),
            eq(evidenceItems.evidenceKey, evidenceId),
          ),
        )
        .limit(1);
      return item ?? null;
    },
  };
}
