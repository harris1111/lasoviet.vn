import { z } from "zod";

const id = z.string().trim().min(1);
const codePointLength = (value: string) => Array.from(value).length;
const safeExcerpt = z.string().trim().refine(
  (value) => codePointLength(value) >= 280 && codePointLength(value) <= 520,
  "excerpt must contain 280 through 520 Unicode code points",
);

export const GeneratedPreviewStatusV1Schema = z.enum([
  "requested", "generating", "ready", "budget_exhausted", "terminal_failure",
]);
export type GeneratedPreviewStatusV1 = z.infer<typeof GeneratedPreviewStatusV1Schema>;

export const GeneratedPreviewSafeProjectionV1Schema = z.object({
  version: z.literal(1),
  sectionId: z.string().trim().min(1).max(120),
  status: GeneratedPreviewStatusV1Schema,
  excerpt: safeExcerpt.nullable(),
  teaser: z.string().trim().min(1).max(520),
  locked: z.boolean(),
}).strict();
export type GeneratedPreviewSafeProjectionV1 = z.infer<typeof GeneratedPreviewSafeProjectionV1Schema>;

export const GeneratedPreviewRequestV1Schema = z.object({
  schemaVersion: z.literal(1),
  requestId: id,
  chartVersionId: id,
  sectionIds: z.array(z.string().trim().min(1).max(120)).min(1).max(3),
  idempotencyKey: z.string().trim().min(1).max(200),
}).strict();
export type GeneratedPreviewRequestV1 = z.infer<typeof GeneratedPreviewRequestV1Schema>;
