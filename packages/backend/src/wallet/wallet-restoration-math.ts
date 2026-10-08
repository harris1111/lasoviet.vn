type Allocation = { id: string; amountLa: number; recognizedVnd: number; bucket: "purchased" | "promotional" };
function integer(value: number, positive = false) {
  if (!Number.isSafeInteger(value) || value < (positive ? 1 : 0)) throw new Error("WALLET_RESTORATION_INVALID");
  return BigInt(value);
}

/** Input order is the original stable lot order; clients never choose a return amount. */
export function planWalletRestoration(allocations: readonly Allocation[], amountLa: number) {
  const target = integer(amountLa, true);
  if (!allocations.length || new Set(allocations.map(a => a.id)).size !== allocations.length) throw new Error("WALLET_RESTORATION_INVALID");
  const total = allocations.reduce((sum, a) => sum + integer(a.amountLa, true), 0n);
  if (target > total) throw new Error("WALLET_RESTORATION_INVALID");
  const shares = allocations.map((a, index) => {
    integer(a.recognizedVnd);
    if (a.bucket !== "purchased" && a.bucket !== "promotional" || a.bucket === "promotional" && a.recognizedVnd !== 0) throw new Error("WALLET_RESTORATION_INVALID");
    const numerator = BigInt(a.amountLa) * target;
    return { a, index, amount: numerator / total, remainder: numerator % total };
  });
  let residual = target - shares.reduce((sum, s) => sum + s.amount, 0n);
  for (const share of [...shares].sort((a, b) => a.remainder === b.remainder ? a.index - b.index : a.remainder > b.remainder ? -1 : 1)) {
    if (residual === 0n) break;
    share.amount++; residual--;
  }
  return shares.filter(s => s.amount > 0n).map(s => ({ id: s.a.id, amountLa: Number(s.amount),
    reversedVnd: Number(BigInt(s.a.recognizedVnd) * s.amount / BigInt(s.a.amountLa)) }));
}

/** Immutable restoration rounding carry is retained until subsequent consumption catches up. */
export function walletRecognitionDelta(consumedLa: number, recognizedVnd: number, newLa: number, packVnd: number, grantedLa: number) {
  const consumed = integer(consumedLa), recognized = integer(recognizedVnd), added = integer(newLa, true);
  const pack = integer(packVnd), grant = integer(grantedLa, true);
  if (consumed + added > grant || recognized > pack) throw new Error("WALLET_RECONCILIATION_FAILED");
  const delta = (consumed + added) * pack / grant - recognized;
  return Number(delta > 0n ? delta : 0n);
}
