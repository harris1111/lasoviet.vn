import {
  FreeIdentityPreviewV1Schema,
  type FreeIdentityPreviewV1,
  type InsightDetail,
  type PalaceTitleLine,
  type BanMenhPreview,
  type LockedPartPreview,
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

function projectLockedPreview(raw: unknown): LockedPartPreview | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const rec = raw as Record<string, unknown>;
  const clippedSentences = Array.isArray(rec.clippedSentences)
    ? rec.clippedSentences.map(String).filter((s) => s.trim().length > 0)
    : [];

  return {
    id: String(rec.id ?? "locked-part"),
    title: String(rec.title ?? ""),
    tagline: typeof rec.tagline === "string" ? rec.tagline : undefined,
    clippedSentences,
    counts: rec.counts && typeof rec.counts === "object"
      ? {
          points: typeof (rec.counts as Record<string, unknown>).points === "number" ? Number((rec.counts as Record<string, unknown>).points) : undefined,
          evidenceItems: typeof (rec.counts as Record<string, unknown>).evidenceItems === "number" ? Number((rec.counts as Record<string, unknown>).evidenceItems) : undefined,
          approximateWords: typeof (rec.counts as Record<string, unknown>).approximateWords === "number" ? Number((rec.counts as Record<string, unknown>).approximateWords) : undefined,
        }
      : undefined,
    lengthHint: typeof rec.lengthHint === "number" ? Number(rec.lengthHint) : 4,
    isLocked: true,
    priceLa: typeof rec.priceLa === "number" ? Number(rec.priceLa) : undefined,
  };
}

function projectInsightDetails(raw: unknown): InsightDetail[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const items: InsightDetail[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const rec = item as Record<string, unknown>;
    const isLocked = Boolean(rec.isLocked);
    items.push({
      id: rec.id as "life-palace" | "body-palace" | "transformations" | "top-concern",
      numeral: String(rec.numeral ?? "01"),
      title: String(rec.title ?? ""),
      tagline: String(rec.tagline ?? ""),
      // If locked, description MUST be omitted to preserve redaction boundary
      description: isLocked ? undefined : (typeof rec.description === "string" ? rec.description : undefined),
      starsSummary: typeof rec.starsSummary === "string" ? rec.starsSummary : undefined,
      locationSummary: typeof rec.locationSummary === "string" ? rec.locationSummary : undefined,
      evidenceId: String(rec.evidenceId ?? "ziwei.identity.life-palace"),
      isLocked,
      lockedPreview: isLocked ? projectLockedPreview(rec.lockedPreview) : undefined,
    });
  }
  return items.length > 0 ? items : undefined;
}

function projectPalaceTitleLines(raw: unknown): PalaceTitleLine[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const items: PalaceTitleLine[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const rec = item as Record<string, unknown>;
    const state = rec.state === "read" || rec.state === "preview" ? rec.state : "unopened";
    items.push({
      palaceId: String(rec.palaceId ?? ""),
      title: String(rec.title ?? ""),
      state,
      clippedOpening: typeof rec.clippedOpening === "string" ? rec.clippedOpening : undefined,
      lengthHint: typeof rec.lengthHint === "number" ? Number(rec.lengthHint) : 4,
      priceLa: typeof rec.priceLa === "number" ? Number(rec.priceLa) : 120,
    });
  }
  return items.length > 0 ? items : undefined;
}

function projectBanMenhPreview(raw: unknown): BanMenhPreview | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const rec = raw as Record<string, unknown>;
  return {
    title: String(rec.title ?? "Bản mệnh & Tiềm năng cốt lõi"),
    opening: typeof rec.opening === "string" ? rec.opening : undefined,
    isLocked: true,
    lengthHint: typeof rec.lengthHint === "number" ? Number(rec.lengthHint) : 4,
    counts: rec.counts && typeof rec.counts === "object"
      ? {
          points: typeof (rec.counts as Record<string, unknown>).points === "number" ? Number((rec.counts as Record<string, unknown>).points) : undefined,
          evidenceItems: typeof (rec.counts as Record<string, unknown>).evidenceItems === "number" ? Number((rec.counts as Record<string, unknown>).evidenceItems) : undefined,
          approximateWords: typeof (rec.counts as Record<string, unknown>).approximateWords === "number" ? Number((rec.counts as Record<string, unknown>).approximateWords) : undefined,
        }
      : undefined,
    priceLa: 240,
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

  const candidate: Record<string, unknown> = {
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

  if (raw.audience === "guest" || raw.audience === "verified") {
    candidate.audience = raw.audience;
  }
  if (typeof raw.topConcern === "string") {
    candidate.topConcern = raw.topConcern;
  }
  if (raw.magnetOffer && typeof raw.magnetOffer === "object") {
    candidate.magnetOffer = {
      title: String((raw.magnetOffer as Record<string, unknown>).title ?? ""),
      subtitle: String((raw.magnetOffer as Record<string, unknown>).subtitle ?? ""),
    };
  }
  const insightDetails = projectInsightDetails(raw.insightDetails);
  if (insightDetails !== undefined) {
    candidate.insightDetails = insightDetails;
  }
  const palaceTitleLines = projectPalaceTitleLines(raw.palaceTitleLines);
  if (palaceTitleLines !== undefined) {
    candidate.palaceTitleLines = palaceTitleLines;
  }
  const banMenhPreview = projectBanMenhPreview(raw.banMenhPreview);
  if (banMenhPreview !== undefined) {
    candidate.banMenhPreview = banMenhPreview;
  }

  const parsed = FreeIdentityPreviewV1Schema.safeParse(candidate);
  if (!parsed.success) {
    return null;
  }

  return parsed.data;
}
