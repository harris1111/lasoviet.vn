import { z } from "zod";
import {
  ReportPdfRequestedV1Schema,
} from "./report-assets.js";

export const ReportStatusSchema = z.enum([
  "requested",
  "generating",
  "validating",
  "html_ready",
  "pdf_pending",
  "complete",
  "retryable_failure",
  "terminal_failure",
]);
export type ReportStatus = z.infer<typeof ReportStatusSchema>;

export const ReportQueueJobStatusSchema = z.enum([
  "waiting",
  "leased",
  "processed",
  "retryable_failure",
  "terminal_failure",
]);
export type ReportQueueJobStatus = z.infer<typeof ReportQueueJobStatusSchema>;

export const ReportGenerationRequestedV1Schema = z.object({
  reportId: z.string().min(1),
  reportVersionId: z.string().min(1),
  entitlementId: z.string().min(1),
  chartVersionId: z.string().min(1),
  evidenceVersionId: z.string().min(1),
  knowledgeVersionId: z.string().min(1),
  promptVersion: z.string().min(1),
  reportConfigVersion: z.string().min(1),
  locale: z.enum(["vi", "en"]),
  sku: z.string().min(1),
}).strict();
export type ReportGenerationRequestedV1 = z.infer<typeof ReportGenerationRequestedV1Schema>;

export const ReportGenerationRequestedV2Schema = z
  .object({
    reportId: z.string().min(1),
    reportVersionId: z.string().min(1),
    entitlementId: z.string().min(1),
    chartVersionId: z.string().min(1),
    evidenceVersionId: z.string().min(1),
    knowledgeVersionId: z.string().min(1),
    promptVersion: z.string().min(1),
    reportConfigVersion: z.string().min(1),
    locale: z.enum(["vi", "en"]),
    sku: z.string().min(1),
    asOfDate: z.iso.date(),
    targetYear: z.number().int(),
    timingRuleVersion: z.string().trim().min(1),
    sensitivityRuleVersion: z.string().trim().min(1),
    readingContextRevisionId: z.string().trim().min(1).nullable().optional(),
    supersedesReportVersionId: z.string().trim().min(1).max(128).optional(),
  })
  .strict()
  .superRefine((payload, ctx) => {
    const asOfDateYear = parseInt(payload.asOfDate.slice(0, 4), 10);
    if (payload.targetYear !== asOfDateYear) {
      ctx.addIssue({
        code: "custom",
        path: ["targetYear"],
        message: "targetYear (" + payload.targetYear + ") must match asOfDate year (" + asOfDateYear + ")",
      });
    }
  });
export type ReportGenerationRequestedV2 = z.infer<typeof ReportGenerationRequestedV2Schema>;

export const ReportGenerateJobEnvelopeV1Schema = z.object({
  schemaVersion: z.literal(1),
  name: z.literal("report.generate.v1"),
  sourceEventId: z.string().min(1),
  traceId: z.string().min(1),
  idempotencyKey: z.string().min(1),
  payload: ReportGenerationRequestedV1Schema,
}).strict();
export type ReportGenerateJobEnvelopeV1 = z.infer<typeof ReportGenerateJobEnvelopeV1Schema>;
export type QueueJobV1 = ReportGenerateJobEnvelopeV1;

export const ReportGenerateJobEnvelopeV2Schema = z
  .object({
    schemaVersion: z.literal(2),
    name: z.literal("report.generate.v2"),
    sourceEventId: z.string().min(1),
    traceId: z.string().min(1),
    idempotencyKey: z.string().min(1),
    payload: ReportGenerationRequestedV2Schema,
  })
  .strict();
export type ReportGenerateJobEnvelopeV2 = z.infer<typeof ReportGenerateJobEnvelopeV2Schema>;

export const ReportGenerateJobEnvelopeSchema = z.discriminatedUnion("schemaVersion", [
  ReportGenerateJobEnvelopeV1Schema,
  ReportGenerateJobEnvelopeV2Schema,
]);
export type ReportGenerateJobEnvelope = z.infer<typeof ReportGenerateJobEnvelopeSchema>;
export const GeneratedPreviewGenerateJobV1Schema = z.object({
  schemaVersion: z.literal(1),
  name: z.literal("preview.generate.v1"),
  sourceEventId: z.string().trim().min(1),
  traceId: z.string().trim().min(1),
  idempotencyKey: z.string().trim().min(1),
  payload: z.object({
    requestId: z.string().trim().min(1),
    chartVersionId: z.string().trim().min(1),
    sectionIds: z.array(z.string().trim().min(1)).min(1).max(3),
  }).strict(),
}).strict();
export type GeneratedPreviewGenerateJobV1 = z.infer<typeof GeneratedPreviewGenerateJobV1Schema>;
export type QueueJob = ReportGenerateJobEnvelope | ReportPdfRenderJobV1 | GeneratedPreviewGenerateJobV1;

const ReportFulfillmentFailedBaseSchema = z.object({
  reportId: z.string().trim().min(1),
  reportVersionId: z.string().trim().min(1),
  errorCode: z.string().trim().min(1),
});

export const ReportFulfillmentFailedV1Schema = z.discriminatedUnion("failureStage", [
  ReportFulfillmentFailedBaseSchema.extend({
    failureStage: z.enum(["generation", "validation"]),
    supportCaseId: z.string().trim().min(1).nullable().optional(),
  }).strict(),
  ReportFulfillmentFailedBaseSchema.extend({
    failureStage: z.enum(["pdf", "garage"]),
    supportCaseId: z.string().trim().min(1),
  }).strict(),
]);
export type ReportFulfillmentFailedV1 = z.infer<typeof ReportFulfillmentFailedV1Schema>;

export const ReportPdfRenderJobV1Schema = z.object({
  schemaVersion: z.literal(1),
  name: z.literal("report.pdf.render.v1"),
  sourceEventId: z.string().trim().min(1),
  traceId: z.string().trim().min(1),
  idempotencyKey: z.string().trim().min(1),
  payload: ReportPdfRequestedV1Schema,
}).strict();
export type ReportPdfRenderJobV1 = z.infer<typeof ReportPdfRenderJobV1Schema>;

export {
  ReportPdfRequestedV1Schema,
  ReportPdfRenderVersionSchema,
} from "./report-assets.js";
export type { ReportPdfRequestedV1 } from "./report-assets.js";
