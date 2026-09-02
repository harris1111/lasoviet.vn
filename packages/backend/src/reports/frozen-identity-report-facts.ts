import {
  FrozenIdentityReportFactsV1Schema,
  type EvidenceSetV1,
  type NormalizedZiweiChartV1,
  type Result,
} from "@lasoviet/contracts";

export type FrozenIdentityReportFactsError =
  | "FROZEN_FACT_REFERENCE_UNSUPPORTED"
  | "FROZEN_FACT_MISSING";

function failure(
  code: FrozenIdentityReportFactsError,
): Result<never, FrozenIdentityReportFactsError> {
  return {
    ok: false,
    error: {
      code,
      messageKey: `reports.${code.toLowerCase()}`,
      retryable: false,
    },
  };
}

function resolveFact(
  chart: NormalizedZiweiChartV1,
  reference: string,
): unknown {
  if (reference === "soulPalaceId") return chart.soulPalaceId;
  if (reference === "bodyPalaceId") return chart.bodyPalaceId;
  if (reference === "transformations") return chart.transformations;
  if (reference === "provenance.ruleSetId") return chart.provenance.ruleSetId;

  const palace = reference.match(
    /^palaces\.(ziwei\.palace\.[a-z]+)\.earthlyBranchId$/,
  );
  if (palace === null) return undefined;
  return chart.palaces.find((item) => item.id === palace[1])?.earthlyBranchId;
}

export function buildFrozenIdentityReportFacts(
  chart: NormalizedZiweiChartV1,
  evidence: EvidenceSetV1,
): Result<
  ReturnType<typeof FrozenIdentityReportFactsV1Schema.parse>,
  FrozenIdentityReportFactsError
> {
  const facts: Record<string, unknown> = {};
  for (const reference of new Set(
    evidence.items.flatMap((item) => item.factReferences),
  )) {
    const value = resolveFact(chart, reference);
    if (value === undefined) {
      return failure(
        reference.startsWith("palaces.") || [
          "soulPalaceId",
          "bodyPalaceId",
          "transformations",
          "provenance.ruleSetId",
        ].includes(reference)
          ? "FROZEN_FACT_MISSING"
          : "FROZEN_FACT_REFERENCE_UNSUPPORTED",
      );
    }
    facts[reference] = value;
  }
  const snapshot = FrozenIdentityReportFactsV1Schema.safeParse({
    version: 1,
    capabilityId: evidence.capabilityId,
    chartVersionId: evidence.chartVersionId,
    ruleVersion: evidence.ruleVersion,
    evidenceVersion: 1,
    facts,
  });
  return snapshot.success
    ? { ok: true, value: snapshot.data }
    : failure("FROZEN_FACT_MISSING");
}
