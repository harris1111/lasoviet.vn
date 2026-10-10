import { describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { GuaranteePromiseV1Schema } from "@lasoviet/contracts";
import { freezePurchaseCommercialTerms } from "./purchase-commercial-terms.js";
import { projectPurchaseGuaranteePromise } from "./purchase-guarantee-promise.js";
const base = {id: randomUUID(), ownerId: "owner", chartId: "chart", chartVersionId: "version", sku: "ZIWEI-IDENTITY-P0",
  locale: "vi", periodKey: "lifetime", priceLa: 1200, createdAt: new Date("2026-10-08T00:00:00Z")};
const spend = {walletId: "wallet", purchaseIntentId: base.id, kind: "spend", createdAt: new Date("2026-10-08T12:00:00Z")};
const wallet = {id: "wallet", ownerId: "owner"};
function intent(sku: string, priceLa: number, policy: "pre-fd119" | "fd119" = "fd119") {
  const value = {...base, sku, priceLa};return {...value, commercialTerms: freezePurchaseCommercialTerms(value, undefined, policy)};
}
describe("purchase-bound guarantee display", () => {
  it.each([["ZIWEI-IDENTITY-P0",1200,600],["ZIWEI-IDENTITY-P0",960,480],["ZIWEI-COMBO-P0",1300,650],["ZIWEI-COMBO-P0",1040,520]])(
    "projects frozen v2 half rights for%s/%s without current eligibility", (sku, price, maximum) => {
      const value=projectPurchaseGuaranteePromise(intent(sku,price),spend,wallet);
      expect(value).toEqual({version:1,commercialPolicyVersion:2,chargedLa:price,restoration:"half",maximumRestoreLa:maximum,
        claimBefore:"2026-10-09T12:00:00.000Z",oncePerAccount:true,requiresAllPaidComponentsReady:true});
      expect(JSON.stringify(value)).not.toMatch(/owner|chart|spend|wallet|creditProof|eligible/);
    });
  it.each([null,"pre-fd119"] as const)("preserves old960 no-promise cohort%s", policy => {
    const value={...base,priceLa:960,commercialTerms:policy?intent(base.sku,960,policy).commercialTerms:null};
    expect(projectPurchaseGuaranteePromise(value,spend,wallet)).toMatchObject({commercialPolicyVersion:1,chargedLa:960,
      restoration:"none",maximumRestoreLa:0,claimBefore:null,requiresAllPaidComponentsReady:false});
  });
  it.each([["ZIWEI-YEAR-P0",480],["ZIWEI-YEAR-P0",384],["ZIWEI-PALACE-LIFE-P0",120]])("preserves full restoration for%s/%s", (sku,price) => {
    expect(projectPurchaseGuaranteePromise(intent(sku,price),spend,wallet)).toMatchObject({restoration:"full",maximumRestoreLa:price,requiresAllPaidComponentsReady:false});
  });
  it("does not promise a restoration for a zero-price monthly grant", () => {
    expect(projectPurchaseGuaranteePromise(intent("ZIWEI-MONTHLY-P0",0),spend,wallet)).toMatchObject({restoration:"none",maximumRestoreLa:0,claimBefore:null});
  });
  it("derives discounted rollover rights from charged amount, without exposing original lots", () => {
    const sources=Array.from({length:7},()=>({spendId:randomUUID(),sku:"ZIWEI-PALACE-LIFE-P0" as const,amountLa:120,creditedLa:120,spentAt:base.createdAt.toISOString()}));
    const value={...base,priceLa:360};
    const commercialTerms=freezePurchaseCommercialTerms(value,{creditLa:840,creditExpiresAt:"2026-10-15T00:00:00.000Z",creditProof:{version:2,creditLa:840,sources}});
    expect(projectPurchaseGuaranteePromise({...value,commercialTerms},spend,wallet)).toMatchObject({chargedLa:360,restoration:"full",maximumRestoreLa:360});
  });
  it("rejects malformed terms, owner/wallet/purchase substitution and impossible spent-at", () => {
    const value=intent(base.sku,1200);
    expect(projectPurchaseGuaranteePromise({...value,commercialTerms:{...value.commercialTerms,guarantee:"full"}},spend,wallet)).toBeNull();
    for(const wrong of [{...spend,purchaseIntentId:randomUUID()},{...spend,walletId:"other"},{...spend,kind:"restoration"},
      {...spend,createdAt:new Date("2026-10-07T00:00:00Z")},{...spend,createdAt:new Date("invalid")}])expect(projectPurchaseGuaranteePromise(value,wrong,wallet)).toBeNull();
    expect(projectPurchaseGuaranteePromise(value,spend,{...wallet,ownerId:"other"})).toBeNull();
  });
  it("shared strict DTO rejects forged maxima, policy and accidental private fields", () => {
    const value=projectPurchaseGuaranteePromise(intent(base.sku,1200),spend,wallet)!;
    for(const extra of [{maximumRestoreLa:1200},{commercialPolicyVersion:1},{requiresAllPaidComponentsReady:false},{claimBefore:null},{purchaseIntentId:base.id}])expect(GuaranteePromiseV1Schema.safeParse({...value,...extra}).success).toBe(false);
  });
});
