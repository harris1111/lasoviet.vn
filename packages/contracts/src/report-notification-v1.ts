import { z } from "zod";

export const ReportNotificationCommandV1Schema = z.object({
  version: z.literal(1),
  reportVersionId: z.string().uuid(),
  action: z.enum(["subscribe", "cancel"]),
}).strict();
export const ReportNotificationViewV1Schema = z.object({
  version: z.literal(1),
  reportId: z.string().uuid(),
  reportVersionId: z.string().uuid(),
  locale: z.enum(["vi", "en"]),
  state: z.enum(["not_registered", "subscribed", "cancelled", "captured", "already_notified", "suppressed"]),
  stateVersion: z.number().int().nonnegative(),
}).strict();
export type ReportNotificationCommandV1 = z.infer<typeof ReportNotificationCommandV1Schema>;
export type ReportNotificationViewV1 = z.infer<typeof ReportNotificationViewV1Schema>;
