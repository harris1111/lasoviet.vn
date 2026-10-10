import assert from "node:assert/strict";
import {randomUUID} from "node:crypto";
import {createRequire} from "node:module";
import * as dbs from "../packages/database/dist/index.js";
import * as contracts from "../packages/contracts/dist/index.js";
import * as backend from "../packages/backend/dist/index.js";
import {calculateIztroReportSnapshot} from "../packages/engine-adapters/dist/index.js";
import {createReportGenerateProcessor} from "../apps/worker/dist/processors/report-generate.processor.js";
import {provisionReportKnowledge} from "../apps/worker/dist/reports/provision-report-knowledge.js";
import {applyIsolatedAcceptanceCatalog} from "./acceptance-qa-catalog.mjs";
import {createSourceBoundSyntheticProvider} from "./acceptance-qa-provider.mjs";
const {eq, and, gt, inArray, or, sql} = createRequire(import.meta.resolve("../packages/database/dist/index.js"))("drizzle-orm");
assert.equal(process.env.LSV_ACCEPTANCE_FIXTURE, "true");
assert.equal(new URL(process.env.DATABASE_URL).hostname, "lsv5863-qa-db");
applyIsolatedAcceptanceCatalog();
let raw = ""; for await (const chunk of process.stdin) raw += chunk;
const request = JSON.parse(raw);
const {SignJWT} = await import(createRequire(import.meta.resolve("../apps/web/package.json")).resolve("jose"));
assert(/^[A-Za-z0-9_-]{1,200}$/.test(request.ownerId));
const database = dbs.createDatabase(process.env.DATABASE_URL);
const [owner] = await database.select().from(dbs.authUsers).where(eq(dbs.authUsers.id, request.ownerId));
assert(owner?.emailVerified && !owner.isAnonymous && owner.email.endsWith("@example.test"));
if (request.action === "fund") {
  const pack = contracts.WalletTopUpCatalogV1.find(item => item.id === "LA-START-1100");
  const now = new Date(), authority = {token: {}, actorId: owner.id}, id = randomUUID();
  await database.insert(dbs.commerceOrders).values({id, ownerId: owner.id, invoiceNumber: randomUUID(), kind: "wallet_topup", sku: pack.id,
    amount: pack.vndAmount, currency: "VND", locale: "vi", status: "paid", paidAt: now});
  const repository = backend.createDatabaseWalletRepository(database, {now: () => now, trustedGrantAuthority: authority});
  const result = await repository.grant({targetOwnerId: owner.id, topUpOrderId: id, trustedGrantToken: authority.token,
    grant: {version: 1, kind: "grant", actorId: owner.id, reasonCode: "test.acceptance.synthetic", requestId: randomUUID(), traceId: randomUUID(),
      idempotencyKey: randomUUID(), purchasedLa: pack.purchasedLa, promotionalLa: pack.promotionalLa, topUpPackId: pack.id}});
  assert(result.ok); console.log(JSON.stringify({syntheticFundingNotRevenue: true}));
} else if (request.action === "pump") {
  // PostgreSQL defaults use its wall clock. Normalize only this verified fixture owner's scheduled rows.
  const frozenNow = new Date();
  const ownedReports = await database.select({reportId: dbs.reportReservations.reportId}).from(dbs.reportReservations)
    .innerJoin(dbs.commerceEntitlements, eq(dbs.commerceEntitlements.id, dbs.reportReservations.entitlementId))
    .where(eq(dbs.commerceEntitlements.ownerId, owner.id));
  const reportIds = ownedReports.map(row => row.reportId);
  const alignedOutbox = await database.update(dbs.outbox).set({availableAt: frozenNow}).where(and(
    eq(dbs.outbox.status, "pending"), gt(dbs.outbox.availableAt, frozenNow),
    or(eq(dbs.outbox.actorId, owner.id), ...(reportIds.length ? [inArray(dbs.outbox.aggregateId, reportIds)] : [])),
  )).returning({id: dbs.outbox.id});
  await provisionReportKnowledge({database, repositoryRoot: process.cwd()});
  const receipts = [], workerId = "isolated-paid-acceptance";
  const generationService = backend.createReportGenerationService({
    sourceRepository: backend.createDatabaseReportGenerationSourceRepository({database,
      knowledgeRetrieval: backend.createKnowledgeRetrievalService({database})}),
    versionRepository: backend.createDatabaseReportVersionRepository(database, {betterAuthUrl: "https://lasoviet.net",
      recipientFingerprintSecret: process.env.INTERNAL_ACTOR_SECRET}),
    sourceSnapshotPreparer: backend.createReportSourceSnapshotPreparationService({database,
      repository: backend.createDatabaseReportSourceSnapshotRepository(database), calculateSnapshot: calculateIztroReportSnapshot}),
    sectionCheckpointRepository: backend.createDatabaseReportSectionCheckpointRepository(database),
    gate: {allows: () => true}, provider: createSourceBoundSyntheticProvider(receipts),
  });
  const outbox = backend.createOutboxDispatchRunner(backend.createOutboxDispatcher({
    ...backend.createDatabaseOutboxStore(database, workerId),
    ...backend.createDatabaseReportQueuePublisher(database),
  }));
  const processor = createReportGenerateProcessor({database, reportService: backend.createReportService(database),
    queueStore: backend.createDatabaseReportQueueStore(database, workerId), workerId, generationService,
    alertDispatcher: {dispatchPendingAlerts: async () => ({captured: true, externalSends: 0})}});
  await outbox.runOnce();
  const alignedQueue = reportIds.length ? await database.update(dbs.reportQueueJobs).set({availableAt: frozenNow}).where(and(
    eq(dbs.reportQueueJobs.status, "waiting"), gt(dbs.reportQueueJobs.availableAt, frozenNow),
    inArray(sql`${dbs.reportQueueJobs.payload}->>'reportId'`, reportIds),
  )).returning({id: dbs.reportQueueJobs.id}) : [];
  let processed = 0;
  for (let index = 0; index < 12; index++) {
    const result = await processor.processNext(); if (!result.processed) break; processed++;
  }
  await backend.createWalletBusinessOutboxRunner(database, {workerId}).runOnce();
  console.log(JSON.stringify({processed, fixtureScheduledRowsAligned: {outbox: alignedOutbox.length, queue: alignedQueue.length}, requests: receipts, syntheticMechanicsOnly: true, nativeProviderCalls: 0, customerSends: 0}));
} else if (request.action === "financial") {
  const [wallet] = await database.select().from(dbs.walletAccounts).where(eq(dbs.walletAccounts.ownerId, owner.id));
  assert(wallet);
  const lots = await database.select({id: dbs.walletCreditLots.id, bucket: dbs.walletCreditLots.bucket,
    remainingLa: dbs.walletCreditLots.remainingLa}).from(dbs.walletCreditLots).where(eq(dbs.walletCreditLots.walletId, wallet.id)).orderBy(dbs.walletCreditLots.id);
  const transactions = await database.select({id: dbs.walletTransactions.id, kind: dbs.walletTransactions.kind,
    purchaseIntentId: dbs.walletTransactions.purchaseIntentId}).from(dbs.walletTransactions).where(eq(dbs.walletTransactions.walletId, wallet.id)).orderBy(dbs.walletTransactions.id);
  const ledger = await database.select({transactionId: dbs.walletLedgerEntries.transactionId, bucket: dbs.walletLedgerEntries.bucket,
    amountLa: dbs.walletLedgerEntries.amountLa}).from(dbs.walletLedgerEntries).innerJoin(dbs.walletTransactions, eq(dbs.walletTransactions.id, dbs.walletLedgerEntries.transactionId)).where(eq(dbs.walletTransactions.walletId, wallet.id)).orderBy(dbs.walletLedgerEntries.id);
  const intents = await database.select({id: dbs.walletPurchaseIntents.id, sku: dbs.walletPurchaseIntents.sku,
    status: dbs.walletPurchaseIntents.status, priceLa: dbs.walletPurchaseIntents.priceLa}).from(dbs.walletPurchaseIntents).where(eq(dbs.walletPurchaseIntents.ownerId, owner.id)).orderBy(dbs.walletPurchaseIntents.id);
  const entitlements = await database.select({id: dbs.commerceEntitlements.id, sku: dbs.commerceEntitlements.sku,
    revokedAt: dbs.commerceEntitlements.revokedAt, ledgerSpendId: dbs.commerceEntitlements.ledgerSpendId}).from(dbs.commerceEntitlements).where(eq(dbs.commerceEntitlements.ownerId, owner.id)).orderBy(dbs.commerceEntitlements.id);
  const spendAllocations = await database.select({id: dbs.walletSpendAllocations.id, transactionId: dbs.walletSpendAllocations.spendTransactionId,
    lotId: dbs.walletSpendAllocations.creditLotId, amountLa: dbs.walletSpendAllocations.amountLa,
    recognizedVnd: dbs.walletSpendAllocations.recognizedVnd}).from(dbs.walletSpendAllocations)
    .innerJoin(dbs.walletTransactions, eq(dbs.walletTransactions.id, dbs.walletSpendAllocations.spendTransactionId))
    .where(eq(dbs.walletTransactions.walletId, wallet.id)).orderBy(dbs.walletSpendAllocations.id);
  const restorationAllocations = await database.select({spendAllocationId: dbs.walletRestorationAllocations.spendAllocationId,
    amountLa: dbs.walletRestorationAllocations.amountLa, reversedVnd: dbs.walletRestorationAllocations.reversedVnd})
    .from(dbs.walletRestorationAllocations).innerJoin(dbs.walletTransactions,
      eq(dbs.walletTransactions.id, dbs.walletRestorationAllocations.restorationTransactionId))
    .where(eq(dbs.walletTransactions.walletId, wallet.id)).orderBy(dbs.walletRestorationAllocations.id);
  console.log(JSON.stringify({wallet: {stateVersion: wallet.stateVersion, purchasedBalance: wallet.purchasedBalance,
    promotionalBalance: wallet.promotionalBalance}, lots, transactions, ledger, intents, entitlements, spendAllocations, restorationAllocations}));
 } else if (request.action === "read" || request.action === "library") {
  if (request.action === "read") assert(/^[a-f0-9-]{36}$/.test(request.reportId));
  assert.equal(new URL(process.env.PRIVATE_API_URL).hostname, "lsv5863-qa-api");
  const [session] = await database.select().from(dbs.authSessions).where(and(eq(dbs.authSessions.userId, owner.id), gt(dbs.authSessions.expiresAt,new Date())));
  assert(session && session.expiresAt > new Date());
  const token = await new SignJWT({version: 1, kind: "account", sub: owner.id, sid: session.id,
    requestId: randomUUID(), emailVerified: true}).setProtectedHeader({alg: "HS256"})
    .setIssuer(contracts.INTERNAL_ACTOR_ISSUER).setAudience(contracts.INTERNAL_ACTOR_AUDIENCE)
    .setIssuedAt().setExpirationTime(Math.floor(Date.now() / 1000) + 60)
    .sign(new TextEncoder().encode(process.env.INTERNAL_ACTOR_SECRET));
  const route = request.action === "library" ? "/commerce/account/library-v2" : `/reports/${request.reportId}`;
  const response = await fetch(`${process.env.PRIVATE_API_URL}${route}`,
    {headers: {authorization: `Bearer ${token}`}});
  console.log(JSON.stringify({status: response.status, body: await response.json()}));
} else if (request.action === "restore_combo") {
  assert(/^[a-f0-9-]{36}$/.test(request.reportId));
  const [selected] = await database.select({spendId: dbs.commerceEntitlements.ledgerSpendId, chartId: dbs.commerceEntitlements.chartId})
    .from(dbs.commerceEntitlements).innerJoin(dbs.reportReservations, eq(dbs.reportReservations.entitlementId, dbs.commerceEntitlements.id))
    .where(and(eq(dbs.commerceEntitlements.ownerId, owner.id), eq(dbs.reportReservations.reportId, request.reportId)));
  assert(selected?.spendId);
  const children = await database.select().from(dbs.commerceEntitlements).where(and(
    eq(dbs.commerceEntitlements.ownerId, owner.id), eq(dbs.commerceEntitlements.ledgerSpendId, selected.spendId)));
  assert(children.length === 2 && children.every(child => child.chartId === selected.chartId));
  const [session] = await database.select().from(dbs.authSessions).where(and(eq(dbs.authSessions.userId, owner.id),gt(dbs.authSessions.expiresAt,new Date())));
  const [wallet] = await database.select().from(dbs.walletAccounts).where(eq(dbs.walletAccounts.ownerId, owner.id));
  assert(session && wallet);
  const restoration = {kind: "restoration", actorId: owner.id, originalSpendId: selected.spendId,
    expectedWalletVersion: wallet.stateVersion, reasonCode: "test.acceptance.combo.restore", requestId: randomUUID(), traceId: randomUUID(),
    idempotencyKey: "isolated-combo-restore:" + selected.spendId};
  const repository = backend.createDatabaseWalletRepository(database, {now: () => new Date()});
  const actor = {kind: "account", userId: owner.id, sessionId: session.id, requestId: randomUUID()};
  const first = await repository.restore({actor, restoration}), replay = await repository.restore({actor, restoration});
  assert(first.ok && replay.ok && first.value.balance.totalLa === replay.value.balance.totalLa);
  console.log(JSON.stringify({isolatedTrustedRestoration: true, replaySameBalance: true, bothChildren: 2, productionWrites: 0}));
} else if (request.action === "requeue_revoked") {
  assert(/^[a-f0-9-]{36}$/.test(request.reportId));
  const [entitlement] = await database.select({revokedAt: dbs.commerceEntitlements.revokedAt})
    .from(dbs.commerceEntitlements).innerJoin(dbs.reportReservations,
      eq(dbs.reportReservations.entitlementId, dbs.commerceEntitlements.id))
    .where(and(eq(dbs.reportReservations.reportId, request.reportId), eq(dbs.commerceEntitlements.ownerId, owner.id)));
  assert(entitlement?.revokedAt);
  const [original] = await database.select().from(dbs.reportQueueJobs)
    .where(sql`${dbs.reportQueueJobs.payload}->>'reportId' = ${request.reportId}`);
  assert(original && original.name === "report.generate.v2");
  const sourceEventId = randomUUID(), idempotencyKey = "isolated-revoked-replay:" + request.reportId;
  await backend.createDatabaseReportQueuePublisher(database).publish({schemaVersion: 2, name: original.name,
    sourceEventId, traceId: original.traceId, idempotencyKey, payload: original.payload});
  const [queued] = await database.select().from(dbs.reportQueueJobs).where(eq(dbs.reportQueueJobs.idempotencyKey, idempotencyKey));
  assert(queued && queued.sourceEventId === sourceEventId && queued.id !== original.id);
  console.log(JSON.stringify({syntheticQueuedReplay: true, ownedRevokedReport: true, jobId: queued.id}));
} else { throw Error("CLOSED_ACCEPTANCE_FIXTURE_ACTION_REQUIRED"); }
// Flush the bounded report projection before closing the fixture database process.
await new Promise(resolve => process.stdout.write("", resolve));
process.exit(0);
