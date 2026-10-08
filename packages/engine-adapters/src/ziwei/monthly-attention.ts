import { starIds } from "./iztro-mapping.js";

export const MONTHLY_ATTENTION_RULE_VERSION = "monthly-attention-v1";
type Star = { name: string };

/** A warning requires a real monthly/annual Hua Ji in the monthly palace.
 * Natal malefics remain interpretation context, never a reason to invent a warning.
 */
export function computedMonthlyAttention(input: {
  stars: readonly Star[]; monthlyMutagen: readonly string[]; annualMutagen: readonly string[];
}) {
  const reasons: { scope: "monthly" | "annual"; starId: string }[] = [];
  for (const scope of ["monthly", "annual"] as const) {
    const name = (scope === "monthly" ? input.monthlyMutagen : input.annualMutagen)[3];
    if (!name || !input.stars.some(star => star.name === name)) continue;
    const starId = starIds[name];
    if (!starId) throw new Error("MONTHLY_ATTENTION_UNMAPPED");
    reasons.push({ scope, starId });
  }
  return { ruleVersion: MONTHLY_ATTENTION_RULE_VERSION, reasons,
    obstacleStarIds: [...new Set(reasons.map(reason => reason.starId))], warn: reasons.length > 0 };
}
