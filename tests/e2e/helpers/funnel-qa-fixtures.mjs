import assert from "node:assert/strict";
import {createHash, randomUUID} from "node:crypto";
import {createRequire} from "node:module";
import * as dbs from "../../../packages/database/dist/index.js";
import * as contracts from "../../../packages/contracts/dist/index.js";
import {createDatabaseWalletRepository} from "../../../packages/backend/dist/wallet/wallet.repository.js";
import {REPORT_TEMPLATE_VERSION_V4_1_SENSITIVITY, REPORT_RENDER_VERSION_V4_1_SENSITIVITY} from "../../../packages/backend/dist/reports/identity-report-config.js";
const {eq, and} = createRequire(import.meta.resolve("../../../packages/database/dist/index.js"))("drizzle-orm");
assert.equal(new URL(process.env.DATABASE_URL).hostname, "lsv80-qa-db");
assert.equal(process.env.FREE_PALACE_GENERATION_ENABLED, "false");
let input = ""; for await (const chunk of process.stdin) input += chunk;
const request = JSON.parse(input);
assert(/^[A-Za-z0-9_-]{1,200}$/.test(request.ownerId));
const database = dbs.createDatabase(process.env.DATABASE_URL);
const [owner] = await database.select().from(dbs.authUsers).where(eq(dbs.authUsers.id, request.ownerId));
assert(owner?.emailVerified && !owner.isAnonymous && owner.email.endsWith("@example.test"));
if (request.action === "fund") {
  const pack = contracts.WalletTopUpCatalogV1.find(item => item.id === "LA-START-1100");
  const now = new Date(), authority = {token: {}, actorId: owner.id}, id = randomUUID();
  await database.insert(dbs.commerceOrders).values({id, ownerId: owner.id, invoiceNumber: randomUUID(), kind: "wallet_topup", sku: pack.id, amount: pack.vndAmount, currency: "VND", locale: "vi", status: "paid", paidAt: now});
  const repository = createDatabaseWalletRepository(database, {now: () => now, trustedGrantAuthority: authority});
  const result = await repository.grant({targetOwnerId: owner.id, topUpOrderId: id, trustedGrantToken: authority.token, grant: {version: 1, kind: "grant", actorId: owner.id, reasonCode: "test.funnel.synthetic", requestId: randomUUID(), traceId: randomUUID(), idempotencyKey: randomUUID(), purchasedLa: pack.purchasedLa, promotionalLa: pack.promotionalLa, topUpPackId: pack.id}});
  assert(result.ok); console.log(JSON.stringify({syntheticFundingNotRevenue: true}));
} else if (["evidence_off", "evidence_restore"].includes(request.action)) {
  const [chart] = await database.select({ownerId: dbs.birthProfiles.userId}).from(dbs.ziweiCharts).innerJoin(dbs.birthProfiles, eq(dbs.birthProfiles.id, dbs.ziweiCharts.profileId)).where(eq(dbs.ziweiCharts.id, request.chartId));
  assert.equal(chart?.ownerId, owner.id);
  const [version] = await database.select().from(dbs.ziweiChartVersions).where(and(eq(dbs.ziweiChartVersions.id, request.chartVersionId), eq(dbs.ziweiChartVersions.chartId, request.chartId)));
  assert(version);
  const original = "ziwei.identity.p0", hidden = "test.funnel.hidden";
  const rows = await database.update(dbs.evidenceSets).set({capabilityId: request.action === "evidence_off" ? hidden : original}).where(and(eq(dbs.evidenceSets.chartVersionId, version.id), eq(dbs.evidenceSets.capabilityId, request.action === "evidence_off" ? original : hidden))).returning({id: dbs.evidenceSets.id});
  assert.equal(rows.length, 1);
  console.log(JSON.stringify({ownedEvidenceFault: request.action}));
} else if (request.action === "ready") {
  assert(/^[a-f0-9-]{36}$/.test(request.chartId));
  const [chart] = await database.select({ownerId: dbs.birthProfiles.userId}).from(dbs.ziweiCharts).innerJoin(dbs.birthProfiles, eq(dbs.birthProfiles.id, dbs.ziweiCharts.profileId)).where(eq(dbs.ziweiCharts.id, request.chartId));
  assert.equal(chart?.ownerId, owner.id);
  const [version] = await database.select().from(dbs.ziweiChartVersions).where(and(eq(dbs.ziweiChartVersions.id, request.chartVersionId), eq(dbs.ziweiChartVersions.chartId, request.chartId)));
  assert(version, "OWNED_CHART_VERSION_REQUIRED");
  const reservations = await database.select().from(dbs.reportReservations).where(eq(dbs.reportReservations.chartVersionId, request.chartVersionId));
  assert(reservations.length === 1 && reservations[0].locale === "vi");
  const reservation = reservations[0];
  assert.equal(reservation.status, "requested");
  const [authority] = await database.select({entitlement: dbs.commerceEntitlements, spend: dbs.walletTransactions, intent: dbs.walletPurchaseIntents}).from(dbs.commerceEntitlements)
    .innerJoin(dbs.walletTransactions, eq(dbs.walletTransactions.id, dbs.commerceEntitlements.ledgerSpendId))
    .innerJoin(dbs.walletAccounts, eq(dbs.walletAccounts.id, dbs.walletTransactions.walletId))
    .innerJoin(dbs.walletPurchaseIntents, eq(dbs.walletPurchaseIntents.id, dbs.walletTransactions.purchaseIntentId))
    .where(and(eq(dbs.commerceEntitlements.id, reservation.entitlementId), eq(dbs.commerceEntitlements.ownerId, owner.id), eq(dbs.walletAccounts.ownerId, owner.id), eq(dbs.commerceEntitlements.chartId, request.chartId), eq(dbs.walletPurchaseIntents.chartId, request.chartId), eq(dbs.walletPurchaseIntents.chartVersionId, version.id), eq(dbs.walletPurchaseIntents.locale, reservation.locale), eq(dbs.walletPurchaseIntents.status, "completed"), eq(dbs.walletTransactions.kind, "spend")));
  assert(authority && !authority.entitlement.revokedAt && authority.intent.ownerId === owner.id, "LIVE_PAID_RESERVATION_AUTHORITY_REQUIRED");
  assert.equal(authority.entitlement.sku, reservation.sku);
  assert.equal(authority.intent.sku, reservation.sku);
  const entries = await database.select().from(dbs.walletLedgerEntries).where(eq(dbs.walletLedgerEntries.transactionId, authority.spend.id));
  assert(entries.length && entries.every(entry => entry.amountLa < 0));
  assert.equal(-entries.reduce((sum, entry) => sum + entry.amountLa, 0), authority.intent.priceLa);
  const [receipt] = await database.select().from(dbs.walletCommandReceipts).where(and(eq(dbs.walletCommandReceipts.walletId, authority.spend.walletId), eq(dbs.walletCommandReceipts.transactionId, authority.spend.id), eq(dbs.walletCommandReceipts.idempotencyKey, authority.spend.idempotencyKey)));
  assert(receipt && receipt.fingerprint === authority.spend.fingerprint, "POSTED_PURCHASE_RECEIPT_REQUIRED");

  const narrative = "Nội dung mô phỏng dành riêng cho kiểm thử luồng đọc. Đây không phải luận giải đã nghiệm thu chất lượng.";
  const part = title => ({title, narrative, evidenceKeys: ["ziwei.palace.life"]});
  const content = contracts.ZiweiComprehensiveReportContentV3Schema.parse({
    overview: part("Tổng quan kiểm thử"), coreAxis: part("Mệnh và Thân kiểm thử"), keyConfigurations: [part("Cấu trúc kiểm thử")],
    palaceReadings: contracts.ZIWEI_PALACE_IDS.map(palaceId => ({...part("Cung kiểm thử"), palaceId})),
    thematicSynthesis: contracts.ZIWEI_THEMATIC_SYNTHESIS_IDS.map(id => ({...part("Chủ đề kiểm thử"), id})),
    strengthsAndTensions: part("Điểm mạnh kiểm thử"),
    currentDecadal: {...part("Đại vận kiểm thử"), state: "active", index: 2, ageRange: [25, 34], yearRange: [2020, 2029]},
    annualSnapshot: {...part("Năm kiểm thử"), targetYear: 2026, asOfDate: "2026-10-04"},
    practicalDirection: [1, 2, 3].map(() => ({recommendation: "Ghi nhận kết quả kiểm thử.", rationale: "Xác minh đường đi.", avoid: "Không dùng làm tư vấn thật.", evidenceKeys: ["ziwei.palace.life"]})),
    birthTimeSensitivity: {title: "Giờ sinh kiểm thử", stableFactors: part("Ổn định kiểm thử"), sensitiveFactors: part("Nhạy kiểm thử")},
  });
  const pdfAssetId = randomUUID();
  await database.transaction(async transaction => {
    await transaction.insert(dbs.reportVersions).values({reportId: reservation.reportId, reportVersionId: reservation.reportVersionId, entitlementId: reservation.entitlementId, chartVersionId: reservation.chartVersionId, evidenceVersionId: reservation.evidenceVersionId, knowledgeVersionId: reservation.knowledgeVersionId, promptVersion: reservation.promptVersion, reportConfigVersion: reservation.reportConfigVersion, locale: reservation.locale, sku: reservation.sku, templateVersion: REPORT_TEMPLATE_VERSION_V4_1_SENSITIVITY, renderVersion: REPORT_RENDER_VERSION_V4_1_SENSITIVITY, providerId: "synthetic-ci-fixture", modelId: "synthetic-ci-fixture", contentHash: createHash("sha256").update(JSON.stringify(content)).digest("hex"), htmlContent: "<p>Synthetic reader fixture; no provider output.</p>", structuredContent: content, pdfAssetId});
    await transaction.insert(dbs.reportAssets).values({id: pdfAssetId, reportId: reservation.reportId, reportVersionId: reservation.reportVersionId, renderVersion: REPORT_RENDER_VERSION_V4_1_SENSITIVITY, objectKey: `synthetic-ci/${pdfAssetId}.pdf`, status: "render_pending"});
    await transaction.update(dbs.reportReservations).set({status: "complete", updatedAt: new Date()}).where(and(eq(dbs.reportReservations.id, reservation.id), eq(dbs.reportReservations.status, "requested")));
  });
  console.log(JSON.stringify({reportId: reservation.reportId, syntheticReaderNotWriterAcceptance: true}));
} else {throw Error("CLOSED_FIXTURE_ACTION_REQUIRED");}
process.exit(0);
