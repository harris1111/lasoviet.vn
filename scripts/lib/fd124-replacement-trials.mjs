import { createHash } from "node:crypto";

export const FD124_POLICY = "FD124-paid-six-v1";
export const FD124_RESERVE_VND = 33368;
export const FD124_TECHNICAL_CAP_VND = FD124_RESERVE_VND * 12;
export const FD124_OUTPUT_TOKENS = 32768;
export const FD124_SLOTS = Object.freeze(["current_annual:1", "next_annual:0", "next_annual:1",
  "career_wealth:2", "relationship_marriage:2", "relationship_marriage:3"]);
export function fd124AttemptKey(slot, purpose) {
  if (!FD124_SLOTS.includes(slot) || !["report", "rewrite"].includes(purpose)) {
    throw Object.assign(new Error("FD124_SLOT_OR_PURPOSE_INVALID"), { code: "FD124_SLOT_OR_PURPOSE_INVALID" });
  }
  return createHash("sha256").update(`${FD124_POLICY}:${slot}:${purpose}`).digest("hex");
}
const keys = new Set(FD124_SLOTS.flatMap(slot => ["report", "rewrite"].map(purpose => fd124AttemptKey(slot, purpose))));
export const isFd124AttemptKey = value => keys.has(value);
export const fd124RewritePrerequisite = value => {
  const slot = FD124_SLOTS.find(slot => fd124AttemptKey(slot, "rewrite") === value);
  return slot ? fd124AttemptKey(slot, "report") : undefined;
};
