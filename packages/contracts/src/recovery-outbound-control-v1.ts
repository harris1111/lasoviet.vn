import { z } from "zod";

const bounded = z.string().trim().min(1).max(128);
export const RecoveryControlCommandSchema = z.object({
  expectedState: z.string().regex(/^[a-f0-9]{64}$/),
  emergencyStopped: z.boolean(),
  cohortIds: z.array(bounded).max(5).refine(ids => new Set(ids).size === ids.length),
  dailyLimit: z.number().int().min(1).max(5),
  idempotencyKey: bounded,
  reasonCode: z.enum(["access_review", "security_incident"]),
}).strict().refine(command => command.emergencyStopped || command.cohortIds.length > 0);
