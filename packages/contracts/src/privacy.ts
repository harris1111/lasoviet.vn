import { z } from "zod";

export const CONSENT_DOCUMENT_KEY = "privacy" as const;
export const CURRENT_CONSENT_DOCUMENT_VERSION = "2026-09-14" as const;

export const CONSENT_DOCUMENT_VERSIONS = {
  privacy: ["2026-09-01", "2026-09-14"],
} as const;

export const CONSENT_PURPOSES = [
  "birth_profile",
  "analytics",
  "personalization",
  "offers",
] as const;

export const ConsentPurposeSchema = z.enum(CONSENT_PURPOSES);
export type ConsentPurpose = z.infer<typeof ConsentPurposeSchema>;

export const ConsentPurposesSetSchema = z
  .array(ConsentPurposeSchema)
  .length(4)
  .refine(
    (purposes) => {
      const set = new Set(purposes);
      return CONSENT_PURPOSES.every((purpose) => set.has(purpose));
    },
    { message: "CONSENT_PURPOSE_SET_INCOMPLETE" },
  );

export const ConsentRequestV1Schema = z
  .object({
    version: z.literal(1),
    documentKey: z.literal(CONSENT_DOCUMENT_KEY),
    documentVersion: z.literal(CURRENT_CONSENT_DOCUMENT_VERSION),
    purposes: ConsentPurposesSetSchema,
    visitorId: z.string().uuid().optional(),
  })
  .strict();

export type ConsentRequestV1 = z.infer<typeof ConsentRequestV1Schema>;

export const AssociateProfileRequestV1Schema = z
  .object({
    version: z.literal(1),
    visitorId: z.string().uuid(),
    profileId: z.string().trim().min(1).max(128),
  })
  .strict();
export type AssociateProfileRequestV1 = z.infer<
  typeof AssociateProfileRequestV1Schema
>;
