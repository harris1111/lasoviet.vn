import { z } from "zod";

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
});
export type ReportGenerationRequestedV1 = z.infer<typeof ReportGenerationRequestedV1Schema>;

export const ReportGenerateJobEnvelopeV1Schema = z.object({
  schemaVersion: z.literal(1),
  name: z.literal("report.generate.v1"),
  sourceEventId: z.string().min(1),
  traceId: z.string().min(1),
  idempotencyKey: z.string().min(1),
  payload: ReportGenerationRequestedV1Schema,
});
export type ReportGenerateJobEnvelopeV1 = z.infer<typeof ReportGenerateJobEnvelopeV1Schema>;
export type QueueJobV1 = ReportGenerateJobEnvelopeV1;

export const ReportFulfillmentFailedV1Schema = z.object({
  reportId: z.string().min(1),
  reportVersionId: z.string().min(1),
  failureStage: z.enum(["generation", "validation", "pdf", "garage"]),
  errorCode: z.string().min(1),
  supportCaseId: z.string().nullable().optional(),
});
export type ReportFulfillmentFailedV1 = z.infer<typeof ReportFulfillmentFailedV1Schema>;
