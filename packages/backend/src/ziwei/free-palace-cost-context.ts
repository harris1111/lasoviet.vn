import { createHash } from "node:crypto";

export type FreePalaceTariff = Readonly<{
  id?: string; pricingVersion: string; providerId: string; modelId: string; currency: string;
  status: string; inputPricePerMillion: number; outputPricePerMillion: number; effectiveFrom: Date;
}>;
// Only a reviewed server provider adapter may supply this proof. No production
// adapter is assumed to provide a guarantee until its semantics are verified.
export type FreePalaceTokenBoundProof = Readonly<{
  serializedRequestHash: string; maxInputTokens: number;
  enforcedMaxOutputTokens: number; semanticsVersion: string;
}>;
export type FreePalaceCostContext = Readonly<{
  pricingSnapshotId: string; pricingVersion: string; provider: string; model: string;
  inputPricePerMillion: bigint; outputPricePerMillion: bigint;
  serializedRequestHash: string; finalSerializedRequest: string;
  maxInputTokens: number; maxOutputTokens: number; semanticsVersion: string;
  reservedMicroVnd: bigint;
}>;
export function freezeFreePalaceCostContext(input: {
  provider: string; model: string; finalSerializedRequest: string; maxOutputTokens: number;
  now: Date; pricing: FreePalaceTariff | null; proof: FreePalaceTokenBoundProof | null;
}): { ok: true; value: FreePalaceCostContext } | { ok: false; reason: "unapproved_pricing" | "unproven_bound" } {
  const p = input.pricing;
  if (!p || !p.id || !p.pricingVersion || p.currency !== "VND" || p.status !== "active" ||
    p.providerId !== input.provider || p.modelId !== input.model ||
    !Number.isFinite(input.now.getTime()) || !Number.isFinite(p.effectiveFrom.getTime()) ||
    p.effectiveFrom > input.now || !Number.isSafeInteger(p.inputPricePerMillion) || p.inputPricePerMillion < 0 ||
    !Number.isSafeInteger(p.outputPricePerMillion) || p.outputPricePerMillion < 0) {
    return { ok: false, reason: "unapproved_pricing" };
  }
  const hash = createHash("sha256").update(input.finalSerializedRequest).digest("hex");
  const proof = input.proof;
  if (!input.finalSerializedRequest || !proof || proof.serializedRequestHash !== hash || !proof.semanticsVersion ||
    !Number.isSafeInteger(proof.maxInputTokens) || proof.maxInputTokens < 0 ||
    !Number.isSafeInteger(input.maxOutputTokens) || input.maxOutputTokens <= 0 ||
    proof.enforcedMaxOutputTokens !== input.maxOutputTokens) {
    return { ok: false, reason: "unproven_bound" };
  }
  // VND per million tokens equals micro-VND per token; no floating-point division.
  const reservedMicroVnd = BigInt(proof.maxInputTokens) * BigInt(p.inputPricePerMillion) +
    BigInt(input.maxOutputTokens) * BigInt(p.outputPricePerMillion);
  if (reservedMicroVnd <= 0n) return { ok: false, reason: "unapproved_pricing" };
  return { ok: true, value: Object.freeze({
    pricingSnapshotId: p.id, pricingVersion: p.pricingVersion, provider: input.provider, model: input.model,
    inputPricePerMillion: BigInt(p.inputPricePerMillion), outputPricePerMillion: BigInt(p.outputPricePerMillion),
    serializedRequestHash: hash, finalSerializedRequest: input.finalSerializedRequest,
    maxInputTokens: proof.maxInputTokens, maxOutputTokens: input.maxOutputTokens,
    semanticsVersion: proof.semanticsVersion, reservedMicroVnd,
  }) };
}
