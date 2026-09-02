import { z } from "zod";

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

const sectionIdSchema = z.enum(IDENTITY_REPORT_SECTION_IDS);

const claimSchema = z.object({
  id: z.string().trim().min(1).max(80),
  text: z.string().trim().min(1).max(1_500),
  evidenceIds: z.array(z.string().regex(/^ziwei\.identity\.[a-z0-9-]+$/)).min(1),
  confidence: z.enum(["high", "moderate", "low"]),
  limitations: z.array(z.string().trim().min(1).max(300)).min(1).max(8),
  suggestedActions: z.array(z.string().trim().min(1).max(300)).max(3),
}).strict();

const sectionSchema = z.object({
  id: sectionIdSchema,
  title: z.string().trim().min(1).max(120),
  narrative: z.string().trim().min(1).max(4_000),
  claims: z.array(claimSchema).max(12),
}).strict();

export const IdentityReportV1Schema = z.object({
  version: z.literal(1),
  sku: z.literal("ZIWEI-IDENTITY-P0"),
  capabilityId: z.literal("ziwei.identity.p0"),
  locale: z.literal("vi"),
  provenance: z.object({
    chartVersionId: z.string().trim().min(1),
    ruleVersion: z.string().trim().min(1),
    evidenceVersion: z.number().int().positive(),
    knowledgeVersion: z.string().trim().min(1),
    providerId: z.string().trim().min(1),
    modelId: z.string().trim().min(1),
    promptVersion: z.string().trim().min(1),
    templateVersion: z.string().trim().min(1),
  }).strict(),
  sections: z.array(sectionSchema).length(IDENTITY_REPORT_SECTION_IDS.length),
  reflectionQuestions: z.array(z.string().trim().min(1).max(300)).min(3).max(5),
  summaryActions: z.array(z.string().trim().min(1).max(300)).max(5),
  professionalAdviceDisclaimer: z.string().trim().min(1).max(1_000)
    .regex(/(?:chuyên gia|chuyen gia|professional advice)/i),
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

export type IdentityReportV1 = z.infer<typeof IdentityReportV1Schema>;
export type IdentityReportSectionId = z.infer<typeof sectionIdSchema>;
export type IdentityReportClaimV1 = z.infer<typeof claimSchema>;
