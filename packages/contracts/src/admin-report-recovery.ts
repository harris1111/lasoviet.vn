import { z } from "zod";

import { AdminAccessV1Schema } from "./admin-auth.js";

const boundedId = z.string().trim().min(1).max(128);
const correlationId = z.string().trim().regex(/^[A-Za-z0-9._:-]{1,128}$/);

export const AdminReportRecoveryReasonCodeSchema = z.enum([
  "provider_transient_failure",
  "incident_recovery",
]);
export type AdminReportRecoveryReasonCode = z.infer<
  typeof AdminReportRecoveryReasonCodeSchema
>;

export const AdminReportRecoveryCommandV1Schema = z.object({
  reportVersionId: boundedId,
  expectedStateVersion: z.number().int().min(1).max(1_000_000),
  idempotencyKey: boundedId,
  reasonCode: AdminReportRecoveryReasonCodeSchema,
}).strict();
export type AdminReportRecoveryCommandV1 = z.infer<
  typeof AdminReportRecoveryCommandV1Schema
>;

export const AdminReportRecoveryContextV1Schema = z.object({
  access: AdminAccessV1Schema,
  requestId: correlationId,
  traceId: correlationId,
  idempotencyKey: boundedId,
  reasonCode: AdminReportRecoveryReasonCodeSchema,
}).strict();
export type AdminReportRecoveryContextV1 = z.infer<
  typeof AdminReportRecoveryContextV1Schema
>;

export const AdminReportRecoverySuccessV1Schema = z.object({
  reportVersionId: boundedId,
  supersedesReportVersionId: boundedId.optional(),
  stateVersion: z.number().int().min(1).max(1_000_001),
  replayed: z.boolean(),
}).strict();
export type AdminReportRecoverySuccessV1 = z.infer<
  typeof AdminReportRecoverySuccessV1Schema
>;
