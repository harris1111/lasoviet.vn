import { z } from "zod";

/** Server-only provenance created after webhook authentication and payload validation. */
export const SePayPaymentProvenanceV1Schema = z.object({
  version: z.literal(1),
  provider: z.literal("sepay"),
  environment: z.enum(["sandbox", "production"]),
  authentication: z.enum(["hmac", "shared_secret"]),
  channel: z.enum(["bank", "ipn"]),
  authenticatedAcceptedAt: z.iso.datetime(),
}).strict().refine(value => value.authentication === "hmac" ? value.channel === "bank" : value.channel === "ipn");
export type SePayPaymentProvenanceV1 = z.infer<typeof SePayPaymentProvenanceV1Schema>;
