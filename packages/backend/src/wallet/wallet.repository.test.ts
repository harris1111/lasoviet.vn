import { describe, expect, it } from "vitest";
import { walletFingerprint } from "./wallet.repository.js";

describe("walletFingerprint", () => {
  it("is deterministic for recursively sorted semantic command fields", () => {
    expect(walletFingerprint({ ownerId: "owner", operation: "wallet.grant" }))
      .toBe(walletFingerprint({ operation: "wallet.grant", ownerId: "owner" }));
    expect(walletFingerprint({
      operation: "wallet.grant",
      grant: { trace: { requestId: "request", metadata: { b: 2, a: 1 } }, buckets: ["promotional", "purchased"] },
    })).toBe(walletFingerprint({
      grant: { buckets: ["promotional", "purchased"], trace: { metadata: { a: 1, b: 2 }, requestId: "request" } },
      operation: "wallet.grant",
    }));
    expect(walletFingerprint({ buckets: ["promotional", "purchased"] }))
      .not.toBe(walletFingerprint({ buckets: ["purchased", "promotional"] }));
    expect(walletFingerprint({ ownerId: "owner", operation: "wallet.grant" }))
      .not.toBe(walletFingerprint({ ownerId: "other", operation: "wallet.grant" }));
  });
});
