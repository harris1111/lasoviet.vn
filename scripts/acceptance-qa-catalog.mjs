import assert from "node:assert/strict";
import {existsSync, readFileSync} from "node:fs";
import {LA_PRODUCT_CATALOG, findLaProduct} from "../packages/contracts/dist/index.js";
export function applyIsolatedAcceptanceCatalog() {
  assert.equal(process.env.LSV_ACCEPTANCE_FIXTURE, "true");
  assert.equal(new URL(process.env.DATABASE_URL).hostname, "lsv5863-qa-db");
  assert.equal(process.env.SEPAY_ENV, "disabled");
  if (!existsSync("/qa/catalog-approved.json")) return {testOnlyOverride: false};
  const approval = JSON.parse(readFileSync("/qa/catalog-approved.json", "utf8"));
  const identity = JSON.parse(readFileSync("/qa/identity.json", "utf8"));
  assert.equal(approval.runId, identity.runId);
  assert.equal(approval.reservedLayerPassed, true);
  const skus = ["ZIWEI-RELATIONSHIP-P0", "ZIWEI-CAREER-P0", "ZIWEI-MONTHLY-P0", "ZIWEI-YEAR-P0"];
  const before = structuredClone(LA_PRODUCT_CATALOG);
  for (const sku of skus) {
    const item = findLaProduct(sku); assert(item);
    assert.equal(item.availability, "reserved");
    assert.equal(item.priceLa, sku === "ZIWEI-MONTHLY-P0" ? 300 : 480);
    item.availability = "active";
  }
  const expected = before.map(item => ({...item, availability: skus.includes(item.sku) ? "active" : item.availability}));
  assert.deepEqual(LA_PRODUCT_CATALOG, expected);
  return {testOnlyOverride: true, reservedLayerPassed: true, products: skus.map(sku => ({sku, priceLa: findLaProduct(sku).priceLa, availability: findLaProduct(sku).availability}))};
}
