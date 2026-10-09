import { z } from "zod";
import { FreeReadingFactsV2Schema } from "./free-reading-v2.js";

const integer = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
export const FreeReadingTariffV2Schema = z.object({
  id: z.string().uuid(), pricingVersion: z.string().min(1),
  providerId: z.string().min(1), modelId: z.string().min(1),
  inputPricePerMillion: integer, outputPricePerMillion: integer, cachedInputPricePerMillion: integer,
}).strict();
export const FreeReadingFrozenCallV2Schema = z.object({
  version: z.literal(2), requestId: z.string().min(1), chartVersionId: z.string().min(1),
  source: FreeReadingFactsV2Schema, sourceHash: z.string().regex(/^[a-f0-9]{64}$/),
  serializedPrompt: z.string().min(1), tariff: FreeReadingTariffV2Schema,
  maxOutputTokens: z.literal(10_000),
}).strict();
export type FreeReadingFrozenCallV2 = z.infer<typeof FreeReadingFrozenCallV2Schema>;
