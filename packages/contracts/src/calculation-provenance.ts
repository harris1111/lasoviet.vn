import { z } from "zod";

const identifier = z.string().trim().regex(/^[a-z][a-z0-9.-]*$/);
const hash = z.string().regex(/^[a-f0-9]{64}$/);
const offsetTimestamp = z
  .iso.datetime({ offset: true })
  .refine((value) => /[+-]\d{2}:\d{2}$/.test(value));

export type CalculationProvenanceV1 = {
  version: 1;
  engineId: string;
  engineVersion: string;
  adapterId: string;
  adapterVersion: string;
  schemaId: string;
  ruleSetId: string;
  inputHash: string;
  configHash: string;
  rawSnapshotHash: string;
  calculatedAt: string;
  limitations: string[];
};

export const CalculationProvenanceV1Schema: z.ZodType<
  CalculationProvenanceV1
> = z
  .object({
    version: z.literal(1),
    engineId: identifier,
    engineVersion: z.string().trim().min(1),
    adapterId: identifier,
    adapterVersion: z.string().trim().min(1),
    schemaId: identifier,
    ruleSetId: identifier,
    inputHash: hash,
    configHash: hash,
    rawSnapshotHash: hash,
    calculatedAt: offsetTimestamp,
    limitations: z.array(z.string().trim().min(1)),
  })
  .strict();
