import { z } from "zod";

export const CONSENT_DOCUMENT_VERSIONS = {
  privacy: ["2026-09-01"],
} as const;

export const ConsentRequestV1Schema = z
  .object({
    version: z.literal(1),
    documentKey: z.string().trim().min(1),
    documentVersion: z.string().trim().min(1),
    purpose: z.string().trim().min(1),
  })
  .strict();
export type ConsentRequestV1 = z.infer<typeof ConsentRequestV1Schema>;
