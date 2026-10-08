import { describe, expect, it } from "vitest";
import { planWalletRestoration, walletRecognitionDelta } from "./wallet-restoration-math.js";

describe("private wallet restoration accounting", () => {
  it("preserves original mixed buckets and rates with deterministic largest-remainder allocation", () => {
    const original = [
      {id: "promo", bucket: "promotional" as const, amountLa: 101, recognizedVnd: 0},
      {id: "first-pack", bucket: "purchased" as const, amountLa: 202, recognizedVnd: 19333},
      {id: "second-pack", bucket: "purchased" as const, amountLa: 197, recognizedVnd: 19650},
    ];
    expect(planWalletRestoration(original, 250)).toEqual([
      {id: "promo", amountLa: 51, reversedVnd: 0},
      {id: "first-pack", amountLa: 101, reversedVnd: 9666},
      {id: "second-pack", amountLa: 98, reversedVnd: 9775},
    ]);
    expect(planWalletRestoration(original, 500)).toEqual(original.map(a=>({id:a.id,amountLa:a.amountLa,reversedVnd:a.recognizedVnd})));
  });
  it("retains proven out-of-order full-restoration carry and catches up without negative recognition", () => {
    expect(walletRecognitionDelta(0,0,1,2,3)).toBe(0);
    expect(walletRecognitionDelta(1,0,1,2,3)).toBe(1);
    // Restore the earlier zero-revenue spend: one La and one VND remain consumed.
    expect(walletRecognitionDelta(1,1,1,2,3)).toBe(0);
    expect(walletRecognitionDelta(2,1,1,2,3)).toBe(1);
  });
  it("retains partial-restoration carry and rejects financial overflow or invalid authority amounts", () => {
    const half=planWalletRestoration([{id:"original",bucket:"purchased",amountLa:2,recognizedVnd:1}],1);
    expect(half).toEqual([{id:"original",amountLa:1,reversedVnd:0}]);
    expect(walletRecognitionDelta(1,1,1,3,4)).toBe(0);
    expect(walletRecognitionDelta(2,1,1,3,4)).toBe(1);
    expect(walletRecognitionDelta(3,2,1,3,4)).toBe(1);
    expect(()=>walletRecognitionDelta(300,29000,1,29000,300)).toThrow();
    expect(()=>planWalletRestoration([{id:"p",bucket:"promotional",amountLa:2,recognizedVnd:1}],1)).toThrow();
    expect(()=>planWalletRestoration([{id:"p",bucket:"purchased",amountLa:2,recognizedVnd:1}],3)).toThrow();
  });
});
