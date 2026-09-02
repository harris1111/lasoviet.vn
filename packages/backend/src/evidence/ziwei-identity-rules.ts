import type {
  EvidenceItemV1,
  EvidenceSetV1,
  NormalizedZiweiChartV1,
  Result,
} from "@lasoviet/contracts";

export type ZiweiIdentityEvidenceError =
  | "EVIDENCE_RULE_UNSUPPORTED"
  | "EVIDENCE_FACT_MISSING";

function error(code: ZiweiIdentityEvidenceError): Result<never, ZiweiIdentityEvidenceError> {
  return { ok: false, error: { code, messageKey: `evidence.${code.toLowerCase()}`, retryable: false } };
}

function item(
  id: EvidenceItemV1["id"],
  factReferences: string[],
  limitations: string[],
): EvidenceItemV1 {
  return {
    id,
    factReferences,
    confidence: "moderate",
    interpretationBounds: [
      "Use only as a reflective identity signal, not a deterministic outcome.",
      "Do not infer health, legal, financial, or relationship outcomes.",
    ],
    interpretationBoundCodes: ["reflective_identity_only"],
    limitations,
    riskTags: ["identity", "determinism", "birth-time"],
    allowedActionCategories: ["reflect", "explore"],
  };
}

export function buildZiweiIdentityEvidence(
  chart: NormalizedZiweiChartV1,
  chartVersionId: string,
): Result<EvidenceSetV1, ZiweiIdentityEvidenceError> {
  if (chart.provenance.ruleSetId !== "ziwei.default") {
    return error("EVIDENCE_RULE_UNSUPPORTED");
  }
  const life = chart.palaces.find((palace) => palace.id === chart.soulPalaceId);
  const body = chart.palaces.find((palace) => palace.id === chart.bodyPalaceId);
  if (life === undefined || body === undefined || chart.transformations.length === 0) {
    return error("EVIDENCE_FACT_MISSING");
  }
  const limitations = [
    ...chart.provenance.limitations,
    ...chart.warnings.map((warning) => warning.code),
  ];
  return {
    ok: true,
    value: {
      version: 1,
      capabilityId: "ziwei.identity.p0",
      chartVersionId,
      ruleVersion: "ziwei.identity.v1",
      items: [
        item("ziwei.identity.life-palace", [
          `palaces.${life.id}.earthlyBranchId`,
          "soulPalaceId",
        ], limitations),
        item("ziwei.identity.body-palace", [
          `palaces.${body.id}.earthlyBranchId`,
          "bodyPalaceId",
        ], limitations),
        item("ziwei.identity.transformations", [
          "transformations",
          "provenance.ruleSetId",
        ], limitations),
      ],
    },
  };
}
