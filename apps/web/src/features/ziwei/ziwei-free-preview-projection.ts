import type {
  FreeIdentityPreviewV1,
} from "@lasoviet/contracts";

type EvidenceReference = FreeIdentityPreviewV1["insights"][number]["evidence"];
type EvidenceInterpretationBoundCode = EvidenceReference["interpretationBoundCodes"][number];

function projectEvidence(
  ev: Partial<EvidenceReference> & Record<string, unknown>,
): EvidenceReference {
  const confidence = ev?.confidence === "moderate" ? "moderate" : "high";
  const interpretationBoundCodes: EvidenceInterpretationBoundCode[] =
    Array.isArray(ev?.interpretationBoundCodes) && ev.interpretationBoundCodes.length > 0
      ? (ev.interpretationBoundCodes.filter((code): code is EvidenceInterpretationBoundCode =>
          typeof code === "string",
        ))
      : ["reflective_identity_only"];

  return {
    evidenceId: String(ev?.evidenceId ?? ""),
    factReferences: Array.isArray(ev?.factReferences)
      ? ev.factReferences.map(String)
      : [],
    confidence,
    interpretationBoundCodes,
    interpretationBounds: Array.isArray(ev?.interpretationBounds)
      ? ev.interpretationBounds.map(String)
      : [],
    limitations: Array.isArray(ev?.limitations)
      ? ev.limitations.map(String)
      : [],
  };
}

export function projectFreeIdentityPreview(
  rawPreview: FreeIdentityPreviewV1,
): FreeIdentityPreviewV1 {
  const insights = Array.isArray(rawPreview?.insights)
    ? rawPreview.insights.map((insight) => ({
        id: String(insight?.id ?? ""),
        evidence: projectEvidence((insight?.evidence ?? {}) as Record<string, unknown>),
      }))
    : [];

  const paidEvidence = Array.isArray(rawPreview?.paidPreview?.evidence)
    ? rawPreview.paidPreview.evidence.map((ev) =>
        projectEvidence((ev ?? {}) as Record<string, unknown>),
      )
    : [];

  const tensionEvidence = Array.isArray(rawPreview?.tensionSignal?.evidence)
    ? rawPreview.tensionSignal.evidence.map((ev) =>
        projectEvidence((ev ?? {}) as Record<string, unknown>),
      )
    : [];

  return {
    version: 1,
    chartId: String(rawPreview?.chartId ?? ""),
    chartVersionId: String(rawPreview?.chartVersionId ?? ""),
    capabilityId: "ziwei.identity.p0",
    summaryVersion: "ziwei.identity.free.v1",
    insights: insights as FreeIdentityPreviewV1["insights"],
    strengthSignal: {
      id: String(rawPreview?.strengthSignal?.id ?? "strength"),
      evidence: projectEvidence(
        (rawPreview?.strengthSignal?.evidence ?? {}) as Record<string, unknown>,
      ),
    },
    tensionSignal: {
      id: String(rawPreview?.tensionSignal?.id ?? "tension"),
      evidence: tensionEvidence as [EvidenceReference, ...EvidenceReference[]],
    },
    paidPreview: {
      sku: "ZIWEI-IDENTITY-P0",
      sectionId: "personal_summary",
      coveragePercent: 12,
      evidence: paidEvidence as [EvidenceReference, ...EvidenceReference[]],
    },
  };
}
