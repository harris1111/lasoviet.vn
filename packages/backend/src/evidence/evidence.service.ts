import { randomUUID } from "node:crypto";

import { and, eq } from "drizzle-orm";

import {
  EvidenceItemV1Schema,
  EvidenceSetV1Schema,
  NormalizedZiweiChartV1Schema,
  type EvidenceSetV1,
  type Result,
} from "@lasoviet/contracts";
import {
  evidenceItems,
  evidenceSets,
  type Database,
  ziweiChartVersions,
} from "@lasoviet/database";

import { getCapability } from "../capabilities/capability.registry.js";
import {
  buildZiweiIdentityEvidence,
  type ZiweiIdentityEvidenceError,
} from "./ziwei-identity-rules.js";

export type EvidenceServiceError =
  | "CAPABILITY_UNAVAILABLE"
  | ZiweiIdentityEvidenceError;

function error(code: EvidenceServiceError): Result<never, EvidenceServiceError> {
  return { ok: false, error: { code, messageKey: `evidence.${code.toLowerCase()}`, retryable: false } };
}

export function createEvidenceService(database: Database) {
  return {
    async buildAndPersist(chartVersionId: string) {
      const capability = getCapability("ziwei.identity.p0");
      if (capability === undefined || !capability.technicalAvailable) {
        return error("CAPABILITY_UNAVAILABLE");
      }
      const record = await database.transaction(async (transaction) => {
        const [chartVersion] = await transaction
          .select({ normalizedOutput: ziweiChartVersions.normalizedOutput })
          .from(ziweiChartVersions)
          .where(eq(ziweiChartVersions.id, chartVersionId))
          .limit(1);
        if (chartVersion === undefined) {
          throw new Error("EVIDENCE_CHART_VERSION_NOT_FOUND");
        }
        const parsedChart = NormalizedZiweiChartV1Schema.safeParse(
          chartVersion.normalizedOutput,
        );
        if (!parsedChart.success) {
          throw new Error("EVIDENCE_NORMALIZED_OUTPUT_INVALID");
        }
        const built = buildZiweiIdentityEvidence(parsedChart.data, chartVersionId);
        if (!built.ok) {
          return built;
        }
        const [existing] = await transaction.select({ id: evidenceSets.id })
          .from(evidenceSets)
          .where(and(
            eq(evidenceSets.chartVersionId, chartVersionId),
            eq(evidenceSets.ruleVersion, built.value.ruleVersion),
          ))
          .limit(1);
        if (existing !== undefined) {
          return { ok: true as const, value: { evidenceSetId: existing.id, reused: true } };
        }
        const evidenceSetId = randomUUID();
        const inserted = await transaction.insert(evidenceSets).values({
          id: evidenceSetId,
          chartVersionId,
          capabilityId: built.value.capabilityId,
          ruleVersion: built.value.ruleVersion,
        }).onConflictDoNothing().returning({ id: evidenceSets.id });
        if (inserted[0] === undefined) {
          const [concurrent] = await transaction.select({ id: evidenceSets.id })
            .from(evidenceSets)
            .where(and(eq(evidenceSets.chartVersionId, chartVersionId), eq(evidenceSets.ruleVersion, built.value.ruleVersion)))
            .limit(1);
          if (concurrent === undefined) throw new Error("EVIDENCE_IDEMPOTENCY_LOOKUP_FAILED");
          return { ok: true as const, value: { evidenceSetId: concurrent.id, reused: true } };
        }
        await transaction.insert(evidenceItems).values(
          built.value.items.map((item) => ({
            id: randomUUID(),
            evidenceSetId,
            evidenceKey: item.id,
            payload: item,
          })),
        );
        return { ok: true as const, value: { evidenceSetId, reused: false } };
      });
      if (!record.ok) {
        return record;
      }
      const [persistedSet] = await database
        .select({
          capabilityId: evidenceSets.capabilityId,
          chartVersionId: evidenceSets.chartVersionId,
          ruleVersion: evidenceSets.ruleVersion,
        })
        .from(evidenceSets)
        .where(eq(evidenceSets.id, record.value.evidenceSetId))
        .limit(1);
      const persistedItems = await database
        .select({ payload: evidenceItems.payload })
        .from(evidenceItems)
        .where(eq(evidenceItems.evidenceSetId, record.value.evidenceSetId))
        .orderBy(evidenceItems.evidenceKey);
      const evidence = EvidenceSetV1Schema.safeParse({
        version: 1,
        ...persistedSet,
        items: persistedItems.map((item) => EvidenceItemV1Schema.parse(item.payload)),
      });
      if (!evidence.success) {
        throw new Error("EVIDENCE_PERSISTED_OUTPUT_INVALID");
      }
      return { ok: true as const, value: { ...record.value, evidence: evidence.data } };
    },
  };
}
