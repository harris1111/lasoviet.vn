import { z } from "zod";
import {
  EvidenceActionCategorySchema,
  EvidenceInterpretationBoundCodeSchema,
  EvidenceItemV1Schema,
  type EvidenceItemV1,
} from "./evidence.js";
import {
  ReportStatusSchema,
  type ReportStatus,
} from "./jobs.js";
import {
  ZIWEI_PALACE_IDS,
  ZIWEI_THEMATIC_SYNTHESIS_IDS,
  type ZiweiComprehensiveReportContentV1,
} from "./ziwei-comprehensive-report-v1.js";


export const IDENTITY_REPORT_SECTION_IDS = [
  "personal_summary",
  "data_and_method",
  "primary_evidence",
  "strengths_and_resources",
  "tensions_and_blind_spots",
  "identity_analysis",
  "cycles_and_timing",
  "within_control",
  "reflection_questions",
  "action_summary",
  "limitations_and_disclaimer",
] as const;
export const CANONICAL_PROFESSIONAL_ADVICE_DISCLAIMER =
  "Nội dung này chỉ nhằm mục đích tham khảo và không thay thế tư vấn y tế, sức khỏe tâm thần, pháp lý, tài chính hoặc tư vấn chuyên môn được cấp phép khác.";
export const CANONICAL_PROFESSIONAL_ADVICE_DISCLAIMER_EN =
  "This content is for reference and self-reflection only. It does not replace medical, mental health, legal, financial, or other licensed professional advice.";

const sectionIdSchema = z.enum(IDENTITY_REPORT_SECTION_IDS);

const claimSchema = z.object({
  id: z.string().trim().min(1).max(80),
  text: z.string().trim().min(1).max(1_500),
  evidenceIds: z.array(z.string().regex(/^ziwei\.identity\.[a-z0-9-]+$/)).min(1),
  interpretationBoundCode: EvidenceInterpretationBoundCodeSchema,
  confidence: z.enum(["high", "moderate", "low"]),
  limitations: z.array(z.string().trim().min(1).max(300)).min(1).max(8),
  suggestedActions: z.array(z.object({
    category: EvidenceActionCategorySchema,
    text: z.string().trim().min(1).max(300),
  }).strict()).max(3),
}).strict();

const sectionSchema = z.object({
  id: sectionIdSchema,
  title: z.string().trim().min(1).max(120),
  narrative: z.string().trim().min(1).max(4_000),
  claims: z.array(claimSchema).max(12),
}).strict();

const provenanceSchema = z.object({
    chartVersionId: z.string().trim().min(1),
    ruleVersion: z.string().trim().min(1),
    evidenceVersion: z.number().int().positive(),
    knowledgeVersion: z.string().trim().min(1),
    providerId: z.string().trim().min(1),
    modelId: z.string().trim().min(1),
    promptVersion: z.string().trim().min(1),
    templateVersion: z.string().trim().min(1),
}).strict();

export const IdentityReportContentV1Schema = z.object({
  sections: z.array(sectionSchema).length(IDENTITY_REPORT_SECTION_IDS.length),
  reflectionQuestions: z.array(z.string().trim().min(1).max(300)).min(3).max(5),
  summaryActions: z.array(z.string().trim().min(1).max(300)).max(5),
}).strict().superRefine((report, context) => {
  report.sections.forEach((section, index) => {
    if (section.id !== IDENTITY_REPORT_SECTION_IDS[index]) {
      context.addIssue({
        code: "custom",
        path: ["sections", index, "id"],
        message: "Sections must use the canonical report order",
      });
    }
  });
  if (new Set(report.sections.map((section) => section.id)).size !== report.sections.length) {
    context.addIssue({
      code: "custom",
      path: ["sections"],
      message: "Section IDs must be unique",
    });
  }
});

const baseIdentityReportSchema = IdentityReportContentV1Schema.extend({
  version: z.literal(1),
  sku: z.literal("ZIWEI-IDENTITY-P0"),
  capabilityId: z.literal("ziwei.identity.p0"),
  provenance: provenanceSchema,
});

const viIdentityReportSchema = baseIdentityReportSchema.extend({
  locale: z.literal("vi"),
  professionalAdviceDisclaimer: z.literal(CANONICAL_PROFESSIONAL_ADVICE_DISCLAIMER),
}).strict();

const enIdentityReportSchema = baseIdentityReportSchema.extend({
  locale: z.literal("en"),
  professionalAdviceDisclaimer: z.literal(CANONICAL_PROFESSIONAL_ADVICE_DISCLAIMER_EN),
}).strict();

export const IdentityReportV1Schema = z.discriminatedUnion("locale", [
  viIdentityReportSchema,
  enIdentityReportSchema,
]);

export type IdentityReportLocale = "vi" | "en";
export type IdentityReportV1 = z.infer<typeof IdentityReportV1Schema>;
export type IdentityReportContentV1 = z.infer<typeof IdentityReportContentV1Schema>;
export type IdentityReportSectionId = z.infer<typeof sectionIdSchema>;
export type IdentityReportClaimV1 = z.infer<typeof claimSchema>;


export const REPORT_VIEW_REFRESH_MS = 5_000 as const;
export const REPORT_PENDING_STATUSES = [
  "requested",
  "generating",
  "validating",
  "retryable_failure",
] as const;
export const REPORT_READY_STATUSES = [
  "html_ready",
  "pdf_pending",
  "complete",
] as const;

export const ReportPublicContentV1Schema = z.object({
  sections: IdentityReportContentV1Schema.shape.sections,
  reflectionQuestions: z.array(z.string().trim().min(1).max(300)).min(3).max(5),
  summaryActions: z.array(z.string().trim().min(1).max(300)).max(5),
  professionalAdviceDisclaimer: z.string().trim().min(1),
}).strict().superRefine((val, ctx) => {
  val.sections.forEach((section, index) => {
    if (section.id !== IDENTITY_REPORT_SECTION_IDS[index]) {
      ctx.addIssue({
        code: "custom",
        path: ["sections", index, "id"],
        message: "Sections must use the canonical report order",
      });
    }
  });
  if (new Set(val.sections.map((section) => section.id)).size !== val.sections.length) {
    ctx.addIssue({
      code: "custom",
      path: ["sections"],
      message: "Section IDs must be unique",
    });
  }
});
export type ReportPublicContentV1 = z.infer<typeof ReportPublicContentV1Schema>;

export const ReportSafeProvenanceV1Schema = z.object({
  method: z.literal("ziwei"),
  ruleVersion: z.string().trim().min(1),
  evidenceVersion: z.number().int().positive(),
  knowledgeVersion: z.string().trim().min(1),
  templateVersion: z.string().trim().min(1),
  createdAt: z.iso.datetime({ offset: true }),
}).strict();
export type ReportSafeProvenanceV1 = z.infer<typeof ReportSafeProvenanceV1Schema>;

export const ReportPendingViewV1Schema = z.object({
  version: z.literal(1),
  state: z.literal("pending"),
  reportId: z.string().trim().min(1),
  reportVersionId: z.string().trim().min(1),
  locale: z.enum(["vi", "en"]),
  sku: z.literal("ZIWEI-IDENTITY-P0"),
  fulfillmentStatus: z.enum(REPORT_PENDING_STATUSES),
  refreshAfterMs: z.literal(5000),
}).strict();
export type ReportPendingViewV1 = z.infer<typeof ReportPendingViewV1Schema>;

export const ComprehensiveReportOverviewSectionSchema = z
  .object({
    title: z.string().trim().min(1).max(120),
    narrative: z.string().trim().min(1).max(5_000),
  })
  .strict();

export const ComprehensiveReportCoreAxisSectionSchema = z
  .object({
    title: z.string().trim().min(1).max(120),
    narrative: z.string().trim().min(1).max(5_000),
  })
  .strict();

export const ComprehensiveReportKeyConfigurationItemSchema = z
  .object({
    title: z.string().trim().min(1).max(120),
    narrative: z.string().trim().min(1).max(5_000),
  })
  .strict();

export const ComprehensiveReportPalaceReadingItemSchema = z
  .object({
    palaceId: z.enum(ZIWEI_PALACE_IDS),
    title: z.string().trim().min(1).max(120),
    narrative: z.string().trim().min(1).max(5_000),
  })
  .strict();

export const ComprehensiveReportThematicSynthesisItemSchema = z
  .object({
    id: z.enum(ZIWEI_THEMATIC_SYNTHESIS_IDS),
    title: z.string().trim().min(1).max(120),
    narrative: z.string().trim().min(1).max(5_000),
  })
  .strict();

export const ComprehensiveReportStrengthsAndTensionsSectionSchema = z
  .object({
    title: z.string().trim().min(1).max(120),
    narrative: z.string().trim().min(1).max(5_000),
  })
  .strict();

export const ComprehensiveReportPublicContentV1Schema = z
  .object({
    overview: ComprehensiveReportOverviewSectionSchema,
    coreAxis: ComprehensiveReportCoreAxisSectionSchema,
    keyConfigurations: z.array(ComprehensiveReportKeyConfigurationItemSchema).min(1).max(12),
    palaceReadings: z.array(ComprehensiveReportPalaceReadingItemSchema).length(ZIWEI_PALACE_IDS.length),
    thematicSynthesis: z.array(ComprehensiveReportThematicSynthesisItemSchema).length(ZIWEI_THEMATIC_SYNTHESIS_IDS.length),
    strengthsAndTensions: ComprehensiveReportStrengthsAndTensionsSectionSchema,
    practicalDirection: z.array(z.string().trim().min(1).max(1_000)).min(1).max(10),
  })
  .strict();
export type ComprehensiveReportPublicContentV1 = z.infer<
  typeof ComprehensiveReportPublicContentV1Schema
>;

export function projectComprehensiveReportPublicContent(
  stored: ZiweiComprehensiveReportContentV1,
): ComprehensiveReportPublicContentV1 {
  return {
    overview: {
      title: stored.overview.title,
      narrative: stored.overview.narrative,
    },
    coreAxis: {
      title: stored.coreAxis.title,
      narrative: stored.coreAxis.narrative,
    },
    keyConfigurations: stored.keyConfigurations.map((k) => ({
      title: k.title,
      narrative: k.narrative,
    })),
    palaceReadings: stored.palaceReadings.map((p) => ({
      palaceId: p.palaceId,
      title: p.title,
      narrative: p.narrative,
    })),
    thematicSynthesis: stored.thematicSynthesis.map((t) => ({
      id: t.id,
      title: t.title,
      narrative: t.narrative,
    })),
    strengthsAndTensions: {
      title: stored.strengthsAndTensions.title,
      narrative: stored.strengthsAndTensions.narrative,
    },
    practicalDirection: [...stored.practicalDirection],
  };
}

const baseReportReadyViewV1Schema = z.object({
  version: z.literal(1),
  state: z.literal("ready"),
  reportId: z.string().trim().min(1),
  reportVersionId: z.string().trim().min(1),
  sku: z.literal("ZIWEI-IDENTITY-P0"),
  fulfillmentStatus: ReportStatusSchema,
  lineage: z.object({
    supersedesReportVersionId: z.string().trim().min(1).nullable(),
  }).strict(),
});

export const ReportLegacyReadyViewV1Schema = baseReportReadyViewV1Schema.extend({
  contentVersion: z.literal("identity.v1"),
  locale: z.enum(["vi", "en"]),
  content: ReportPublicContentV1Schema,
  evidence: z.array(EvidenceItemV1Schema),
  provenance: ReportSafeProvenanceV1Schema,
}).strict().superRefine((val, ctx) => {
  if (val.locale === "vi" && val.content.professionalAdviceDisclaimer !== CANONICAL_PROFESSIONAL_ADVICE_DISCLAIMER) {
    ctx.addIssue({
      code: "custom",
      path: ["content", "professionalAdviceDisclaimer"],
      message: "Vietnamese report must use canonical Vietnamese disclaimer",
    });
  }
  if (val.locale === "en" && val.content.professionalAdviceDisclaimer !== CANONICAL_PROFESSIONAL_ADVICE_DISCLAIMER_EN) {
    ctx.addIssue({
      code: "custom",
      path: ["content", "professionalAdviceDisclaimer"],
      message: "English report must use canonical English disclaimer",
    });
  }
});
export type ReportLegacyReadyViewV1 = z.infer<typeof ReportLegacyReadyViewV1Schema>;

export const ReportComprehensiveReadyViewV1Schema = baseReportReadyViewV1Schema.extend({
  contentVersion: z.literal("ziwei-comprehensive.v1"),
  locale: z.literal("vi"),
  content: ComprehensiveReportPublicContentV1Schema,
}).strict();
export type ReportComprehensiveReadyViewV1 = z.infer<
  typeof ReportComprehensiveReadyViewV1Schema
>;

export const ReportReadyViewV1Schema = z.discriminatedUnion("contentVersion", [
  ReportLegacyReadyViewV1Schema,
  ReportComprehensiveReadyViewV1Schema,
]);
export type ReportReadyViewV1 =
  | ReportLegacyReadyViewV1
  | ReportComprehensiveReadyViewV1;

export const ReportFailedViewV1Schema = z.object({
  version: z.literal(1),
  state: z.literal("failed"),
  reportId: z.string().trim().min(1),
  reportVersionId: z.string().trim().min(1),
  locale: z.enum(["vi", "en"]),
  sku: z.literal("ZIWEI-IDENTITY-P0"),
  fulfillmentStatus: z.literal("terminal_failure"),
  invoiceNumber: z.string().trim().min(1),
  paymentReceivedAt: z.iso.datetime({ offset: true }),
  reportStatusUpdatedAt: z.iso.datetime({ offset: true }),
  supportEmail: z.literal("support@lasoviet.vn"),
  supportSubject: z.string().trim().min(1),
  supportReference: z.string().trim().min(1),
}).strict();
export type ReportFailedViewV1 = z.infer<typeof ReportFailedViewV1Schema>;

export const ReportViewV1Schema = z.discriminatedUnion("state", [
  ReportPendingViewV1Schema,
  ReportReadyViewV1Schema,
  ReportFailedViewV1Schema,
]);
export type ReportViewV1 =
  | ReportPendingViewV1
  | ReportReadyViewV1
  | ReportFailedViewV1;
