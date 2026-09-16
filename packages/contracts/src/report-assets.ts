import { z } from "zod";

const nonEmpty = z.string().trim().min(1);

export const ReportPdfRenderVersionSchema = z.enum([
  "identity-report-pdf.v1",
  "identity-report-pdf.v2",
]);
export type ReportPdfRenderVersion = z.infer<typeof ReportPdfRenderVersionSchema>;

export const ReportAssetStatusSchema = z.enum([
  "render_pending",
  "rendering",
  "rendered",
  "storing",
  "stored",
  "store_retryable_failure",
  "terminal_failure",
]);
export type ReportAssetStatus = z.infer<typeof ReportAssetStatusSchema>;

export const ReportAssetReplicaStatusSchema = z.enum([
  "replica_disabled",
]);
export type ReportAssetReplicaStatus = z.infer<typeof ReportAssetReplicaStatusSchema>;

export const ReportAssetFailureCodeSchema = z.enum([
  "PDF_RENDER_FAILED",
  "PDF_TEMP_CLEANUP_FAILED",
  "PDF_FONT_MISSING",
  "PDF_RENDER_VERSION_UNSUPPORTED",
  "GARAGE_UNAVAILABLE",
  "ASSET_CHECKSUM_MISMATCH",
  "ASSET_KEY_CONFLICT",
]);
export type ReportAssetFailureCode = z.infer<typeof ReportAssetFailureCodeSchema>;

export const ReportPdfRequestedV1Schema = z.object({
  reportId: nonEmpty,
  reportVersionId: nonEmpty,
  assetId: nonEmpty,
  renderVersion: ReportPdfRenderVersionSchema,
}).strict();
export type ReportPdfRequestedV1 = z.infer<typeof ReportPdfRequestedV1Schema>;

export const ReportPdfRenderJobV1Schema = z.object({
  schemaVersion: z.literal(1),
  name: z.literal("report.pdf.render.v1"),
  sourceEventId: nonEmpty,
  traceId: nonEmpty,
  idempotencyKey: nonEmpty,
  payload: ReportPdfRequestedV1Schema,
}).strict();
export type ReportPdfRenderJobV1 = z.infer<typeof ReportPdfRenderJobV1Schema>;

export const ReportAssetStoredV1Schema = z.object({
  reportId: nonEmpty,
  reportVersionId: nonEmpty,
  assetId: nonEmpty,
  renderVersion: ReportPdfRenderVersionSchema,
  sha256: z.string().regex(/^[a-f0-9]{64}$/),
  byteLength: z.number().int().positive(),
}).strict();
export type ReportAssetStoredV1 = z.infer<typeof ReportAssetStoredV1Schema>;
