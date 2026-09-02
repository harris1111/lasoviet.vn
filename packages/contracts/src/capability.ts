import { z } from "zod";

export const CapabilityDefinitionV1Schema = z.object({
  version: z.literal(1),
  id: z.literal("ziwei.identity.p0"),
  systemId: z.literal("ziwei"),
  technicalAvailable: z.boolean(),
  publicAvailable: z.boolean(),
  paidAvailable: z.boolean(),
  skuId: z.literal("ZIWEI-IDENTITY-P0").optional(),
}).strict();

export type CapabilityDefinitionV1 = z.infer<typeof CapabilityDefinitionV1Schema>;
