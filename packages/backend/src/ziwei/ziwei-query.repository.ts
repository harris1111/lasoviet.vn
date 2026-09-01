import { and, desc, eq, gt, isNull } from "drizzle-orm";

import type { CurrentActor } from "@lasoviet/contracts";
import {
  birthProfiles,
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
  ): Promise<AuthorizedZiweiChartRecord | null>;
  readEvidenceItem(
    evidenceSetId: string,
    evidenceId: string,
  ): Promise<{ id: string; payload: Record<string, unknown> } | null>;
};

function ownerFilter(actor: CurrentActor, now: Date) {
  return actor.kind === "account"
    ? eq(birthProfiles.userId, actor.userId)
    : and(
        eq(birthProfiles.anonymousActorId, actor.anonymousActorId),
        gt(birthProfiles.anonymousExpiresAt, now),
      );
}

export function createDatabaseZiweiQueryRepository(
  database: Database,
): ZiweiQueryRepository {
  return {
    async readAuthorizedChart(actor, chartId, now) {
      const [record] = await database
        .select({
          chartId: ziweiCharts.id,
          chartVersionId: ziweiChartVersions.id,
          normalizedOutput: ziweiChartVersions.normalizedOutput,
        })
        .from(ziweiCharts)
        .innerJoin(birthProfiles, eq(birthProfiles.id, ziweiCharts.profileId))
        .innerJoin(
          ziweiChartVersions,
          eq(ziweiChartVersions.chartId, ziweiCharts.id),
        )
        .where(
          and(
            eq(ziweiCharts.id, chartId),
            ownerFilter(actor, now),
            isNull(birthProfiles.deletedAt),
          ),
        )
        .orderBy(desc(ziweiChartVersions.createdAt), desc(ziweiChartVersions.id))
        .limit(1);
      if (record === undefined) {
        return null;
      }
      const [evidenceSet] = await database
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
      if (evidenceSet === undefined) {
        return {
          ...record,
          evidenceSetId: null,
          capabilityId: null,
          ruleVersion: null,
          items: [],
        };
      }
      const items = await database
        .select({ id: evidenceItems.id, payload: evidenceItems.payload })
        .from(evidenceItems)
        .where(eq(evidenceItems.evidenceSetId, evidenceSet.evidenceSetId))
        .orderBy(evidenceItems.evidenceKey);
      return { ...record, ...evidenceSet, items };
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
