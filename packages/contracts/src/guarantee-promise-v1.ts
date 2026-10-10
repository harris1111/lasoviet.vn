import { z } from "zod";

/** Frozen display promise, not current claim eligibility or financial authority. */
export const GuaranteePromiseV1Schema = z.object({
  version: z.literal(1),
  commercialPolicyVersion: z.union([z.literal(1), z.literal(2)]),
  chargedLa: z.number().int().nonnegative(),
  restoration: z.enum(["full", "half", "none"]),
  maximumRestoreLa: z.number().int().nonnegative(),
  claimBefore: z.iso.datetime({ offset: true }).nullable(),
  oncePerAccount: z.literal(true),
  requiresAllPaidComponentsReady: z.boolean(),
}).strict().superRefine((value, ctx) => {
  const expected = value.chargedLa === 0 ? "none" : value.chargedLa < 500 ? "full" : value.commercialPolicyVersion === 2 ? "half" : "none";
  const maximum = expected === "full" ? value.chargedLa : expected === "half" ? value.chargedLa / 2 : 0;
  if (value.restoration !== expected || value.maximumRestoreLa !== maximum ||
      (expected === "none") !== (value.claimBefore === null) ||
      value.requiresAllPaidComponentsReady !== (expected === "half")) {
    ctx.addIssue({ code: "custom", message: "Guarantee promise does not match frozen commercial rights" });
  }
});
export type GuaranteePromiseV1 = z.infer<typeof GuaranteePromiseV1Schema>;
