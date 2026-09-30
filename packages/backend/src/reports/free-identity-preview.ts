import {
  PREVIEW_COST_GUARD_CONSTANTS,
  EvidenceItemV1Schema,
  FreeIdentityPreviewV1Schema,
  type FreeIdentityPreviewV1,
  type PreviewBudgetUsage,
  PreviewPreflightReservationSchema,
  type PreviewPreflightReservation,
  type Result,
  type NormalizedZiweiChartV1,
  type TopConcernV1,
  type InsightDetail,
  type PalaceTitleLine,
  type BanMenhPreview,
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

export const CANONICAL_PALACE_PREVIEWS: Record<
  string,
  {
    vi: { title: string; clippedOpening: string };
    en: { title: string; clippedOpening: string };
  }
> = {
  "ziwei.palace.life": {
    vi: {
      title: "Khí chất & Bản mệnh cốt lõi",
      clippedOpening: "Cung Mệnh định hình nền tảng khí chất tự nhiên, bản lĩnh cá nhân và xu hướng phản ứng cốt lõi trước mọi biến chuyển của đời sống…",
    },
    en: {
      title: "Core Identity & Demeanor",
      clippedOpening: "The Life Palace shapes your natural disposition, core character, and primary behavioral responses through life changes…",
    },
  },
  "ziwei.palace.body": {
    vi: {
      title: "Điểm tựa & Xu hướng hành động",
      clippedOpening: "Cung Thân phản ánh điểm tựa thực tế, thói quen tích lũy qua trải nghiệm và trọng tâm hành động trong nửa sau cuộc đời…",
    },
    en: {
      title: "Action Focus & Anchor",
      clippedOpening: "The Body Palace reveals your practical anchor, accumulated behavioral patterns, and focus of action in the mature phase of life…",
    },
  },
  "ziwei.palace.career": {
    vi: {
      title: "Năng lực chuyên môn & Môi trường phát triển",
      clippedOpening: "Cung Quan Lộc phản ánh môi trường làm việc phù hợp, thế mạnh chuyên môn và cách thức xác lập vị thế trong sự nghiệp…",
    },
    en: {
      title: "Professional Capacity & Career Path",
      clippedOpening: "The Career Palace outlines your optimal work environment, specialized strengths, and professional standing…",
    },
  },
  "ziwei.palace.wealth": {
    vi: {
      title: "Dòng tiền & Năng lực tích lũy của cải",
      clippedOpening: "Cung Tài Bạch phản ánh phương thức tạo ra thu nhập, tư duy quản lý tài chính và khả năng tích lũy nguồn lực lâu dài…",
    },
    en: {
      title: "Wealth Generation & Financial Stewardship",
      clippedOpening: "The Wealth Palace reveals income generation channels, resource management mindsets, and long-term financial accumulation…",
    },
  },
  "ziwei.palace.spouse": {
    vi: {
      title: "Duyên nợ & Mối liên kết lứa đôi",
      clippedOpening: "Cung Phu Thê phản ánh xu hướng chọn bạn đời, mức độ hòa hợp trong hôn nhân và những bài học cảm xúc quan trọng…",
    },
    en: {
      title: "Partnership & Marriage Dynamic",
      clippedOpening: "The Spouse Palace reflects marital dynamics, emotional alignment, and relationship growth lessons…",
    },
  },
  "ziwei.palace.travel": {
    vi: {
      title: "Xu thế dịch chuyển & Cơ hội đối ngoại",
      clippedOpening: "Cung Thiên Di phản ánh năng lực thích ứng với môi trường xa lạ, cơ hội mở rộng khi bước ra khỏi vùng quen thuộc…",
    },
    en: {
      title: "Outward Mobility & External Horizons",
      clippedOpening: "The Travel Palace indicates your adaptability in new environments and opportunities discovered beyond familiar circles…",
    },
  },
  "ziwei.palace.fortune": {
    vi: {
      title: "Nội tâm, thọ duyên & Phúc khí tinh thần",
      clippedOpening: "Cung Phúc Đức phản ánh đời sống tinh thần, sự an yên trong tâm tưởng và phúc ấm tích lũy qua dòng dõi…",
    },
    en: {
      title: "Spiritual Well-being & Inner Harmony",
      clippedOpening: "The Fortune Palace governs inner peace, psychological balance, and ancestral spiritual grounding…",
    },
  },
  "ziwei.palace.health": {
    vi: {
      title: "Khí huyết, thể tạng & Điểm cần lưu tâm thân thể",
      clippedOpening: "Cung Tật Ách chỉ dẫn những điểm tạng phủ nhạy cảm, nguyên tắc giữ gìn sinh lực và thói quen bảo vệ sức khỏe…",
    },
    en: {
      title: "Vitality & Physical Constitution",
      clippedOpening: "The Health Palace highlights physiological sensitivities and mindful wellness habits for enduring vigor…",
    },
  },
  "ziwei.palace.property": {
    vi: {
      title: "Gia cư, bất động sản & Nền móng gia trạch",
      clippedOpening: "Cung Điền Trạch phản ánh duyên điền sản, mức độ ổn định của nơi cư ngụ và không gian sống nuôi dưỡng sự an định…",
    },
    en: {
      title: "Real Estate & Home Foundation",
      clippedOpening: "The Property Palace indicates real estate alignment, residential stability, and living space harmony…",
    },
  },
  "ziwei.palace.friends": {
    vi: {
      title: "Mạng lưới quan hệ & Bạn bè đồng hành",
      clippedOpening: "Cung Nô Bộc (Giao Hữu) phản ánh cách bạn tương tác với cộng sự, đồng nghiệp và mức độ trợ lực từ các mối quan hệ xã hội…",
    },
    en: {
      title: "Social Network & Peer Alliances",
      clippedOpening: "The Friends Palace reflects peer collaboration, team synergy, and social circle dynamics…",
    },
  },
  "ziwei.palace.parents": {
    vi: {
      title: "Gia giáo & Điểm tựa từ đấng sinh thành",
      clippedOpening: "Cung Phụ Mẫu phản ánh sự ảnh hưởng từ cha mẹ, nền tảng nuôi dưỡng thuở nhỏ và đạo hiếu trong gia đình…",
    },
    en: {
      title: "Family Heritage & Parental Foundation",
      clippedOpening: "The Parents Palace governs familial influence, early upbringing, and parental mentorship…",
    },
  },
  "ziwei.palace.children": {
    vi: {
      title: "Hậu duệ & Mối dây liên kết thế hệ sau",
      clippedOpening: "Cung Tử Tức phản ánh duyên con cái, phong cách nuôi dạy và sự gắn kết giữa các thế hệ trong gia đình…",
    },
    en: {
      title: "Descendants & Generational Connection",
      clippedOpening: "The Children Palace indicates generational bonds, parenting orientation, and family continuity…",
    },
  },
  "ziwei.palace.siblings": {
    vi: {
      title: "Tình anh em & Mối quan hệ ruột thịt",
      clippedOpening: "Cung Huynh Đệ phản ánh mối liên hệ giữa anh chị em ruột, mức độ hỗ trợ lẫn nhau trong những bước ngoặt lớn…",
    },
    en: {
      title: "Sibling Bonds & Mutual Support",
      clippedOpening: "The Siblings Palace reflects mutual assistance and emotional ties among brothers and sisters…",
    },
  },
};

export const CONCERN_PALACE_MAP: Record<string, string> = {
  career: "ziwei.palace.career",
  money: "ziwei.palace.wealth",
  love: "ziwei.palace.spouse",
  family: "ziwei.palace.parents",
  wellbeing: "ziwei.palace.fortune",
  self_understanding: "ziwei.palace.body",
};

const CANONICAL_12_PALACES = [
  "ziwei.palace.life",
  "ziwei.palace.siblings",
  "ziwei.palace.spouse",
  "ziwei.palace.children",
  "ziwei.palace.wealth",
  "ziwei.palace.health",
  "ziwei.palace.travel",
  "ziwei.palace.friends",
  "ziwei.palace.career",
  "ziwei.palace.property",
  "ziwei.palace.fortune",
  "ziwei.palace.parents",
] as const;

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
  usageState?: PreviewBudgetUsage;
  reservation?: PreviewPreflightReservation;
  generator?: () => Promise<
    | { ok: true; preview: FreeIdentityPreviewV1 }
    | { ok: false; error?: unknown }
  >;
  actorKind?: "guest" | "verified";
  topConcern?: TopConcernV1 | null;
  chart?: NormalizedZiweiChartV1;
  displayName?: string;
  locale?: "vi" | "en";
};

export async function buildGuardedFreeIdentityPreview(
  input: GuardedPreviewInput,
): Promise<Result<FreeIdentityPreviewV1, FreeIdentityPreviewError>> {
  const structural = buildFreeIdentityPreview(input);
  if (!structural.ok) {
    return structural;
  }

  let basePreview: FreeIdentityPreviewV1;
  if (input.generator) {
    const budgetCheck = input.usageState && input.reservation
      ? checkPreviewBudgetPreflight(input.usageState, input.reservation)
      : { allowed: false as const };
    if (budgetCheck.allowed) {
      try {
        const genResult = await input.generator();
        basePreview = genResult.ok ? genResult.preview : structural.value;
      } catch {
        basePreview = structural.value;
      }
    } else {
      basePreview = structural.value;
    }
  } else {
    basePreview = structural.value;
  }

  // Enrich with FD-105 package 1.4 magnet offer and secure reveal boundaries
  const actorKind = input.actorKind ?? "guest";
  const locale = input.locale ?? "vi";
  const soulPalaceId = input.chart?.soulPalaceId ?? "ziwei.palace.life";
  const bodyPalaceId = input.chart?.bodyPalaceId ?? "ziwei.palace.body";
  const topConcern = input.topConcern ?? undefined;
  const concernPalaceId = topConcern ? (CONCERN_PALACE_MAP[topConcern] ?? bodyPalaceId) : bodyPalaceId;

  const magnetOffer = {
    title: locale === "vi"
      ? "Lá số Tử Vi của bạn, và 2 điều lá số nói riêng về bạn"
      : "Your Zi Wei Chart, and 2 Key Insights Personal to You",
    subtitle: locale === "vi"
      ? "Lập từ dữ liệu sinh chuẩn xác trong 60 giây. Khám phá 2 điều nổi bật nhất về bản mệnh của bạn trước khi đi sâu vào 12 cung."
      : "Constructed from exact birth data in 60 seconds. Discover the 2 primary highlights about your chart before exploring all 12 palaces.",
  };

  // 1. Insight 1 (Life Palace / Cung Mệnh): always unlocked
  const lifeInfo = CANONICAL_PALACE_PREVIEWS["ziwei.palace.life"]![locale];
  const insight1: InsightDetail = {
    id: "life-palace",
    numeral: "01",
    title: lifeInfo.title,
    tagline: locale === "vi" ? "Cung Mệnh" : "Life Palace",
    evidenceId: "ziwei.identity.life-palace",
    isLocked: false,
    description: locale === "vi"
      ? "Tọa thủ tại Cung Mệnh phản ánh trục cốt lõi về bản sắc, khí chất tự nhiên và cách bạn tương tác với các hoàn cảnh trong cuộc sống."
      : "Anchored in the Life Palace, shaping your natural temperament, self-agency, and foundational perspective across life phases.",
  };

  // 2. Insight 2 (tailored by top concern):
  // Verified user receives full description; Guest receives ONLY safe clipped sentence + blurred placeholder hint (NO locked plaintext!)
  const concernInfo = CANONICAL_PALACE_PREVIEWS[concernPalaceId]?.[locale] ?? CANONICAL_PALACE_PREVIEWS["ziwei.palace.body"]![locale];
  const concernTagline = locale === "vi"
    ? (topConcern === "career" ? "Cung Quan Lộc" : topConcern === "love" ? "Cung Phu Thê" : topConcern === "money" ? "Cung Tài Bạch" : topConcern === "wellbeing" ? "Cung Phúc Đức" : topConcern === "family" ? "Cung Phụ Mẫu" : "Cung Thân")
    : (topConcern === "career" ? "Career Palace" : topConcern === "love" ? "Spouse Palace" : topConcern === "money" ? "Wealth Palace" : topConcern === "wellbeing" ? "Fortune Palace" : topConcern === "family" ? "Parents Palace" : "Body Palace");

  const insight2: InsightDetail = actorKind === "verified"
    ? {
        id: "body-palace",
        numeral: "02",
        title: concernInfo.title,
        tagline: concernTagline,
        evidenceId: "ziwei.identity.body-palace",
        isLocked: false,
        description: locale === "vi"
          ? concernInfo.clippedOpening + " Đây là điểm tựa trọng tâm gắn liền với câu hỏi và định hướng hiện tại của bạn."
          : concernInfo.clippedOpening + " This anchor aligns with your primary inquiries and active aspirations.",
      }
    : {
        id: "body-palace",
        numeral: "02",
        title: concernInfo.title,
        tagline: locale === "vi" ? "Điều thứ hai" : "Second Insight",
        evidenceId: "ziwei.identity.body-palace",
        isLocked: true,
        // CRITICAL: description is omitted for guest!
        lockedPreview: {
          id: "insight-2",
          title: concernInfo.title,
          tagline: locale === "vi" ? "Điều thứ hai" : "Second Insight",
          clippedSentences: [concernInfo.clippedOpening],
          counts: { points: 1, evidenceItems: 1, approximateWords: 180 },
          lengthHint: 4,
          isLocked: true,
        },
      };

  // 3. 12 Palace Title Lines
  const palaceTitleLines: PalaceTitleLine[] = CANONICAL_12_PALACES.map((palaceId) => {
    const info = CANONICAL_PALACE_PREVIEWS[palaceId]?.[locale] ?? { title: palaceId, clippedOpening: "..." };
    let state: "read" | "preview" | "unopened" = "unopened";
    if (palaceId === soulPalaceId) {
      state = "read";
    } else if (actorKind === "verified" && (palaceId === concernPalaceId || palaceId === bodyPalaceId)) {
      state = "preview";
    }

    return {
      palaceId,
      title: info.title,
      state,
      clippedOpening: info.clippedOpening,
      lengthHint: 4,
      priceLa: 120,
    };
  });

  // 4. Bản Mệnh Preview
  // Verified user receives safe 1-2 clipped sentences of opening; Guest receives NO opening narrative
  const banMenhPreview: BanMenhPreview = {
    title: locale === "vi" ? "Bản mệnh & Tiềm năng cốt lõi" : "Core Destiny & Potential",
    isLocked: true,
    lengthHint: 4,
    priceLa: 240,
    counts: { points: 4, approximateWords: 850 },
    ...(actorKind === "verified"
      ? {
          opening: locale === "vi"
            ? "Bản mệnh của bạn định hình từ trục Cung Mệnh, mang theo khí chất của chính tinh tọa thủ và các cung chiếu hội. Đây là nền móng chi phối cách bạn tương tác với hoàn cảnh, tích lũy năng lực và đối diện thử thách lớn trong cuộc đời…"
            : "Your core destiny is anchored in the Life Palace axis, shaped by residing major stars and aspect configurations. This foundation governs how you navigate circumstances, build capacity, and face challenges…",
        }
      : {}),
  };

  const enrichedCandidate = {
    ...basePreview,
    audience: actorKind,
    topConcern,
    magnetOffer,
    insightDetails: [insight1, insight2],
    palaceTitleLines,
    banMenhPreview,
  };

  const parsedEnriched = FreeIdentityPreviewV1Schema.safeParse(enrichedCandidate);
  if (parsedEnriched.success) {
    return { ok: true, value: parsedEnriched.data };
  }

  return { ok: true, value: basePreview };
}
