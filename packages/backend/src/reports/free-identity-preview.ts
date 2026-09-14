import {
  PREVIEW_COST_GUARD_CONSTANTS,
  EvidenceItemV1Schema,
  FreeIdentityPreviewV1Schema,
  type FreeIdentityPreviewV1,
  type PreviewBudgetUsage,
  PreviewPreflightReservationSchema,
  type PreviewPreflightReservation,
  type Result,
} from "@lasoviet/contracts";

export type { PreviewBudgetUsage, PreviewPreflightReservation };

const canonicalEvidenceIds = [
  "ziwei.identity.life-palace",
  "ziwei.identity.body-palace",
  "ziwei.identity.transformations",
] as const;

export const PREVIEW_GUARD_LIMITS = PREVIEW_COST_GUARD_CONSTANTS;

export type PreviewPreflightResult =
  | { allowed: true }
  | {
      allowed: false;
      reason:
        | "USAGE_UNKNOWN"
        | "RESERVATION_REQUIRED"
        | "MAX_SECTIONS_EXCEEDED"
        | "MAX_TOKENS_EXCEEDED"
        | "MAX_COST_EXCEEDED"
        | "MAX_REWRITES_EXCEEDED";
    };

export function checkPreviewBudgetPreflight(
  current: PreviewBudgetUsage,
  reservation?: PreviewPreflightReservation,
): PreviewPreflightResult {
  const parsed = PreviewPreflightReservationSchema.safeParse(reservation);
  if (!parsed.success) {
    return { allowed: false, reason: "RESERVATION_REQUIRED" };
  }
  const res = parsed.data;

  if (current.hasUnknownCost) {
    return { allowed: false, reason: "USAGE_UNKNOWN" };
  }

  if (res.isRewrite && res.sectionId) {
    const rewrites = current.rewritesBySection?.[res.sectionId] ?? 0;
    if (rewrites >= PREVIEW_GUARD_LIMITS.maxRewritesPerSection) {
      return { allowed: false, reason: "MAX_REWRITES_EXCEEDED" };
    }
  }

  if (
    current.generatedSections + res.projectedSections >
    PREVIEW_GUARD_LIMITS.maxGeneratedSectionsPerChart
  ) {
    return { allowed: false, reason: "MAX_SECTIONS_EXCEEDED" };
  }
  if (
    current.billableTokens + res.projectedTokens >
    PREVIEW_GUARD_LIMITS.maxBillableTokensPerChart
  ) {
    return { allowed: false, reason: "MAX_TOKENS_EXCEEDED" };
  }
  if (
    current.costVnd + res.projectedCostVnd >
    PREVIEW_GUARD_LIMITS.maxCostVndPerChart
  ) {
    return { allowed: false, reason: "MAX_COST_EXCEEDED" };
  }
  return { allowed: true };
}

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
    interpretationBoundCodes: item.interpretationBoundCodes,
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
  const lifePalace = reference(byId.get("ziwei.identity.life-palace")!);
  const bodyPalace = reference(byId.get("ziwei.identity.body-palace")!);
  const transformations = reference(byId.get("ziwei.identity.transformations")!);
  const preview = FreeIdentityPreviewV1Schema.safeParse({
    version: 1,
    chartId: input.chartId,
    chartVersionId: input.chartVersionId,
    capabilityId: "ziwei.identity.p0",
    summaryVersion: "ziwei.identity.free.v1",
    insights: [
      { id: "life-palace", evidence: lifePalace },
      { id: "body-palace", evidence: bodyPalace },
      { id: "transformations", evidence: transformations },
    ],
    strengthSignal: { id: "life-palace-strength", evidence: lifePalace },
    tensionSignal: {
      id: "body-palace-transformations-tension",
      evidence: [bodyPalace, transformations],
    },
    paidPreview: {
      sku: "ZIWEI-IDENTITY-P0",
      sectionId: "personal_summary",
      coveragePercent: 12,
      evidence: [lifePalace],
    },
  });
  return preview.success
    ? { ok: true, value: preview.data }
    : insufficientEvidence();
}

export type GuardedPreviewInput = FreeIdentityPreviewInput & {
  usageState: PreviewBudgetUsage;
  reservation: PreviewPreflightReservation;
  generator?: () => Promise<
    | { ok: true; preview: FreeIdentityPreviewV1 }
    | { ok: false; error?: unknown }
  >;
};

export async function buildGuardedFreeIdentityPreview(
  input: GuardedPreviewInput,
): Promise<Result<FreeIdentityPreviewV1, FreeIdentityPreviewError>> {
  const structural = buildFreeIdentityPreview(input);
  if (!structural.ok) {
    return structural;
  }

  if (!input.generator) {
    return structural;
  }

  const budgetCheck = checkPreviewBudgetPreflight(input.usageState, input.reservation);
  if (!budgetCheck.allowed) {
    return structural;
  }

  try {
    const genResult = await input.generator();
    if (!genResult.ok) {
      return structural;
    }
    return { ok: true, value: genResult.preview };
  } catch {
    return structural;
  }
}
