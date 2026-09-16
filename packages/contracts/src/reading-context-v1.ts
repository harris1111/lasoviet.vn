/// <reference types="node" />

import { createHash } from "node:crypto";

import { z } from "zod";

import {
  BirthProfileV1Schema,
  type BirthProfileV1,
} from "./birth-profile-v1.js";

export const LifeStageV1Schema = z.enum([
  "studying",
  "early_career",
  "established_career",
  "business_owner",
  "between_paths",
  "retired",
]);
export type LifeStageV1 = z.infer<typeof LifeStageV1Schema>;

export const TopConcernV1Schema = z.enum([
  "career",
  "money",
  "love",
  "family",
  "wellbeing",
  "self_understanding",
]);
export type TopConcernV1 = z.infer<typeof TopConcernV1Schema>;

export const ReadingContextV1Schema = z
  .object({
    version: z.literal(1),
    lifeStage: LifeStageV1Schema.optional(),
    topConcern: TopConcernV1Schema.optional(),
  })
  .strict()
  .refine(
    (context) =>
      context.lifeStage !== undefined || context.topConcern !== undefined,
    "At least one reading context field (lifeStage or topConcern) must be selected",
  );
export type ReadingContextV1 = z.infer<typeof ReadingContextV1Schema>;

export const SetReadingContextRequestV1Schema = z
  .object({
    version: z.literal(1),
    lifeStage: LifeStageV1Schema.optional(),
    topConcern: TopConcernV1Schema.optional(),
    expectedStateVersion: z.number().int().nonnegative(),
    idempotencyKey: z.string().trim().min(1).max(128),
  })
  .strict()
  .refine(
    (context) =>
      context.lifeStage !== undefined || context.topConcern !== undefined,
    "At least one reading context field must be selected in PUT replacement",
  );
export type SetReadingContextRequestV1 = z.infer<
  typeof SetReadingContextRequestV1Schema
>;

export const ClearReadingContextRequestV1Schema = z
  .object({
    version: z.literal(1),
    expectedStateVersion: z.number().int().positive(),
    idempotencyKey: z.string().trim().min(1).max(128),
  })
  .strict();
export type ClearReadingContextRequestV1 = z.infer<
  typeof ClearReadingContextRequestV1Schema
>;

export const BirthProfileCreateWrapperV1Schema = z
  .object({
    profile: BirthProfileV1Schema,
    readingContext: ReadingContextV1Schema.optional(),
  })
  .strict();
export type BirthProfileCreateWrapperV1 = z.infer<
  typeof BirthProfileCreateWrapperV1Schema
>;

export const BirthProfileCreateRequestV1Schema = z.union([
  BirthProfileCreateWrapperV1Schema,
  BirthProfileV1Schema,
]);
export type BirthProfileCreateRequestV1 = z.infer<
  typeof BirthProfileCreateRequestV1Schema
>;

export function normalizeBirthProfileCreateRequest(
  input: BirthProfileCreateRequestV1,
): { profile: BirthProfileV1; readingContext?: ReadingContextV1 } {
  if ("profile" in input) {
    return {
      profile: input.profile,
      readingContext: input.readingContext,
    };
  }

  return {
    profile: input,
    readingContext: undefined,
  };
}

export const ReadingContextRecordV1Schema = z
  .object({
    profileId: z.string().trim().min(1),
    revisionId: z.string().trim().min(1).nullable(),
    revisionNumber: z.number().int().positive().nullable(),
    stateVersion: z.number().int().nonnegative(),
    lifeStage: LifeStageV1Schema.nullable(),
    topConcern: TopConcernV1Schema.nullable(),
    createdAt: z.string().datetime({ offset: true }).nullable(),
    updatedAt: z.string().datetime({ offset: true }).nullable(),
  })
  .strict();
export type ReadingContextRecordV1 = z.infer<
  typeof ReadingContextRecordV1Schema
>;

export function computeReadingContextFingerprint(
  commandType: "set" | "clear",
  expectedStateVersion: number,
  context?: {
    lifeStage?: LifeStageV1 | null;
    topConcern?: TopConcernV1 | null;
  },
): string {
  const canonical = JSON.stringify([
    1,
    commandType,
    expectedStateVersion,
    context?.lifeStage ?? null,
    context?.topConcern ?? null,
  ] as const);

  return createHash("sha256").update(canonical).digest("hex");
}
