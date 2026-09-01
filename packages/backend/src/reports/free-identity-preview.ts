import {
  EvidenceItemV1Schema,
  FreeIdentityPreviewV1Schema,
  type FreeIdentityPreviewV1,
  type Result,
} from "@lasoviet/contracts";

const canonicalEvidenceIds = [
  "ziwei.identity.soul",
  "ziwei.identity.body",
  "ziwei.identity.configuration",
] as const;

export type FreeIdentityPreviewError = "INSUFFICIENT_EVIDENCE";

export type FreeIdentityPreviewInput = {
  chartId: string;
  chartVersionId: string;
  evidence: readonly unknown[];
};

function insufficientEvidence(): Result<never, FreeIdentityPreviewError> {
  return {
    ok: false,
    error: {
      code: "INSUFFICIENT_EVIDENCE",
      messageKey: "ziwei.insufficient_evidence",
      retryable: false,
    },
  };
}

function reference(item: ReturnType<typeof EvidenceItemV1Schema.parse>) {
  return {
    evidenceId: item.id,
    factReferences: item.factReferences,
    confidence: item.confidence,
    interpretationBounds: item.interpretationBounds,
    limitations: item.limitations,
  };
}

export function buildFreeIdentityPreview(
  input: FreeIdentityPreviewInput,
): Result<FreeIdentityPreviewV1, FreeIdentityPreviewError> {
  const evidence = input.evidence.map((item) => EvidenceItemV1Schema.safeParse(item));
  if (evidence.some((item) => !item.success)) {
    return insufficientEvidence();
  }
  const byId = new Map(
    evidence.map((item) => {
      if (!item.success) {
        throw new Error("UNREACHABLE");
      }
      return [item.data.id, item.data] as const;
    }),
  );
  if (
    evidence.length !== canonicalEvidenceIds.length ||
    byId.size !== canonicalEvidenceIds.length ||
    canonicalEvidenceIds.some((id) => !byId.has(id))
  ) {
    return insufficientEvidence();
  }
  const soul = reference(byId.get("ziwei.identity.soul")!);
  const body = reference(byId.get("ziwei.identity.body")!);
  const configuration = reference(byId.get("ziwei.identity.configuration")!);
  const preview = FreeIdentityPreviewV1Schema.safeParse({
    version: 1,
    chartId: input.chartId,
    chartVersionId: input.chartVersionId,
    capabilityId: "ziwei.identity.p0",
    summaryVersion: "ziwei.identity.free.v1",
    insights: [
      { id: "soul", evidence: soul },
      { id: "body", evidence: body },
      { id: "configuration", evidence: configuration },
    ],
    strengthSignal: { id: "soul-strength", evidence: soul },
    tensionSignal: {
      id: "body-configuration-tension",
      evidence: [body, configuration],
    },
    paidPreview: {
      sku: "ZIWEI-IDENTITY-P0",
      sectionId: "personal_summary",
      coveragePercent: 12,
      evidence: [soul],
    },
  });
  return preview.success
    ? { ok: true, value: preview.data }
    : insufficientEvidence();
}
