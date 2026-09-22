import {
  FreeIdentityPreviewV1Schema,
  type FreeIdentityPreviewV1,
} from "@lasoviet/contracts";

function projectEvidence(ev: unknown) {
  if (!ev || typeof ev !== "object") return undefined;
  const rec = ev as Record<string, unknown>;

  return {
    evidenceId: rec.evidenceId,
    factReferences: rec.factReferences,
    confidence: rec.confidence,
    interpretationBoundCodes: rec.interpretationBoundCodes,
    interpretationBounds: rec.interpretationBounds,
    limitations: rec.limitations,
  };
}

export function projectFreeIdentityPreview(
  rawPreview: unknown,
): FreeIdentityPreviewV1 | null {
  if (!rawPreview || typeof rawPreview !== "object") {
    return null;
  }

  const raw = rawPreview as Record<string, unknown>;

  const rawInsights = Array.isArray(raw.insights)
    ? raw.insights.map((insight) => {
        if (!insight || typeof insight !== "object") return undefined;
        const rec = insight as Record<string, unknown>;
        return {
          id: rec.id,
          evidence: projectEvidence(rec.evidence),
        };
      })
    : undefined;

  const rawStrengthEvidence = projectEvidence(
    (raw.strengthSignal as Record<string, unknown> | undefined)?.evidence,
  );

  const rawTensionEvidence = Array.isArray(
    (raw.tensionSignal as Record<string, unknown> | undefined)?.evidence,
  )
    ? ((raw.tensionSignal as Record<string, unknown>).evidence as unknown[]).map(
        projectEvidence,
      )
    : undefined;

  const rawPaidEvidence = Array.isArray(
    (raw.paidPreview as Record<string, unknown> | undefined)?.evidence,
  )
    ? ((raw.paidPreview as Record<string, unknown>).evidence as unknown[]).map(
        projectEvidence,
      )
    : undefined;

  const candidate = {
    version: raw.version,
    chartId: raw.chartId,
    chartVersionId: raw.chartVersionId,
    capabilityId: raw.capabilityId,
    summaryVersion: raw.summaryVersion,
    insights: rawInsights,
    strengthSignal:
      raw.strengthSignal && typeof raw.strengthSignal === "object"
        ? {
            id: (raw.strengthSignal as Record<string, unknown>).id,
            evidence: rawStrengthEvidence,
          }
        : undefined,
    tensionSignal:
      raw.tensionSignal && typeof raw.tensionSignal === "object"
        ? {
            id: (raw.tensionSignal as Record<string, unknown>).id,
            evidence: rawTensionEvidence,
          }
        : undefined,
    paidPreview:
      raw.paidPreview && typeof raw.paidPreview === "object"
        ? {
            sku: (raw.paidPreview as Record<string, unknown>).sku,
            sectionId: (raw.paidPreview as Record<string, unknown>).sectionId,
            coveragePercent: (raw.paidPreview as Record<string, unknown>).coveragePercent,
            evidence: rawPaidEvidence,
          }
        : undefined,
  };

  const parsed = FreeIdentityPreviewV1Schema.safeParse(candidate);
  if (!parsed.success) {
    return null;
  }

  return parsed.data;
}
