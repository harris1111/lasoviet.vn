import { randomUUID } from "node:crypto";

import { and, eq } from "drizzle-orm";

import type { EvidenceSetV1, NormalizedZiweiChartV1, Result } from "@lasoviet/contracts";
import { evidenceItems, evidenceSets, type Database } from "@lasoviet/database";

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
    async buildAndPersist(chartVersionId: string, chart: NormalizedZiweiChartV1) {
      const capability = getCapability("ziwei.identity.p0");
      if (capability === undefined || !capability.technicalAvailable) {
        return error("CAPABILITY_UNAVAILABLE");
      }
      const built = buildZiweiIdentityEvidence(chart, chartVersionId);
      if (!built.ok) {
        return built;
      }
      const record = await database.transaction(async (transaction) => {
        const [existing] = await transaction.select({ id: evidenceSets.id })
          .from(evidenceSets)
          .where(and(
            eq(evidenceSets.chartVersionId, chartVersionId),
            eq(evidenceSets.ruleVersion, built.value.ruleVersion),
          ))
          .limit(1);
        if (existing !== undefined) {
          return { evidenceSetId: existing.id, reused: true };
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
          return { evidenceSetId: concurrent.id, reused: true };
        }
        await transaction.insert(evidenceItems).values(
          built.value.items.map((item) => ({
            id: randomUUID(),
            evidenceSetId,
            evidenceKey: item.id,
            payload: item,
          })),
        );
        return { evidenceSetId, reused: false };
      });
      return { ok: true as const, value: { ...record, evidence: built.value } };
    },
  };
}
