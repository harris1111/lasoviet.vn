import { createRecoveryFinancialAttributionService } from "./recovery-financial-attribution.js";
import { createDatabaseCommerceRepository } from "../commerce/commerce.repository.js";
import { createSePayWebhookService } from "../commerce/sepay-webhook.service.js";
import { createDatabaseWalletRepository } from "../wallet/wallet.repository.js";
import {createRecoveryClickReceiptService} from "./recovery-click-receipt.js";
import { createHmac, randomUUID } from "node:crypto";
import { PostgreSqlContainer } from "@testcontainers/postgresql";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { eq, sql } from "drizzle-orm";
import {
  authUsers, birthProfiles, birthProfileRevisions, calculationRuns, commerceOrders,
  consents, createDatabase, commercePaymentEvents, commerceUnmatchedPayments, evidenceSets, walletAccounts, walletSpendAllocations, walletCreditLots, walletRestorationAllocations,
  notificationDeliveries, notificationPreferences, recoveryClickReceipts, runMigrations, walletPurchaseIntents,
  walletTopUpContinuations, walletTransactions, ziweiCharts, ziweiChartVersions, type Database,
} from "@lasoviet/database";
import type { CurrentActor } from "@lasoviet/contracts";
import { createDatabaseDeletionRepository } from "../privacy/deletion.repository.js";
import { createPendingTopUpRecoveryCaptureService } from "./pending-topup-recovery-capture.js";

const NOW = new Date("2026-10-04T12:00:00.000Z");
const CREATED = new Date("2026-10-04T11:30:00.000Z");
const SECRET = "synthetic-recovery-secret-not-a-provider-credential";

describe("trusted recovery financial lineage in isolated PostgreSQL", () => {
  let container: Awaited<ReturnType<PostgreSqlContainer["start"]>>;
  let database: Database;
  beforeAll(async () => {
    container = await new PostgreSqlContainer("postgres:17-alpine").start();
    await runMigrations(container.getConnectionUri());
    database = createDatabase(container.getConnectionUri());
  }, 60000);
  afterAll(async () => { await container?.stop(); });
  beforeEach(async () => {
    // These fixtures exist only in this test-owned disposable database.
    await database.execute(sql`TRUNCATE auth_users, commerce_orders, notification_deliveries, outbox CASCADE`);
  });
  function service(overrides: Partial<Parameters<typeof createPendingTopUpRecoveryCaptureService>[0]> = {}) {
    return createPendingTopUpRecoveryCaptureService({ database, mode: "capture", tokenSecret: SECRET,
      orderTtlSeconds: 86400, now: () => NOW, ...overrides });
  }
  async function fixture(locale: "vi" | "en" = "vi", priceLa = 960, sku = "ZIWEI-IDENTITY-P0") {
    const userId = randomUUID(); const chartId = `chart-${userId}`;
    const chartVersionId = `version-${userId}`; const profileId = `profile-${userId}`;
    const revisionId = `revision-${userId}`; const runId = `run-${userId}`; const consentId = randomUUID();
    const email = `${userId}@example.test`;
    await database.insert(authUsers).values({ id: userId, email, name: "Synthetic QA owner", emailVerified: true, createdAt: CREATED, updatedAt: CREATED });
    await database.insert(consents).values({ id: consentId, userId, documentKey: "offers", documentVersion: "test-v1", purpose: "offers", grantedAt: CREATED });
    await database.insert(birthProfiles).values({ id: profileId, userId, createdAt: CREATED, updatedAt: CREATED });
    await database.insert(birthProfileRevisions).values({ id: revisionId, profileId, revisionNumber: 1,
      originalInput: { solarDate: "1992-06-15", solarTime: "08:30" }, normalizedInput: {}, consentVersion: "test-v1", createdAt: CREATED });
    await database.insert(calculationRuns).values({ id: runId, profileId, profileRevisionId: revisionId,
      idempotencyKey: runId, engineId: "synthetic", engineVersion: "1", adapterId: "synthetic", adapterVersion: "1",
      schemaId: "synthetic", ruleSetId: "synthetic", inputHash: "a", configHash: "b", rawSnapshotHash: "c", createdAt: CREATED });
    await database.insert(ziweiCharts).values({ id: chartId, profileId, profileRevisionId: revisionId, createdAt: CREATED });
    await database.insert(ziweiChartVersions).values({ id: chartVersionId, chartId, calculationRunId: runId,
      normalizedOutput: {}, privateRawSnapshot: {}, warnings: [], provenance: {}, createdAt: CREATED });
    const intentId = randomUUID(); const orderId = randomUUID();
    await database.insert(walletPurchaseIntents).values({ id: intentId, ownerId: userId, chartId, chartVersionId,
      sku, locale, priceLa, createdAt: CREATED });
    await addOrder(orderId, intentId, userId, locale, priceLa);
    await database.insert(evidenceSets).values({id:randomUUID(),chartVersionId,capabilityId:"ziwei.identity.p0",ruleVersion:"ziwei.identity.v1"});
    return { userId, email, chartId, chartVersionId, profileId, revisionId, runId, consentId, intentId, orderId };
  }
  async function addOrder(orderId: string, intentId: string, userId: string, locale = "vi", priceLa = 960) {
    await database.insert(commerceOrders).values({ id: orderId, invoiceNumber: `test-${orderId}`, kind: "wallet_topup",
      ownerId: userId, sku: "LA-START-1100", amount: 99000, currency: "VND", locale, createdAt: CREATED });
    await database.insert(walletTopUpContinuations).values({ orderId, ownerId: userId, purchaseIntentId: intentId,
      intentStateVersion: 1, confirmedPriceLa: priceLa, returnTab: "overview", createdAt: CREATED });
  }
  async function captures() { return database.select().from(notificationDeliveries).where(eq(notificationDeliveries.kind, "recovery_pending_topup")); }
  async function captured() {
    const f=await fixture();expect(await service().scanAndCapture()).toBe(1);
    const delivery=(await captures()).find(d=>d.requestPayload.orderId===f.orderId)!;
    const actor:CurrentActor={kind:"account",userId:f.userId,sessionId:"synthetic",requestId:"synthetic"};
    return {...f,delivery,actor,command:{version:1 as const,orderId:f.orderId,deliveryId:delivery.id}};
  }
  function receipts(now=NOW,mode:"disabled"|"capture"="capture") {return createRecoveryClickReceiptService({database,mode,tokenSecret:SECRET,orderTtlSeconds:86400,now:()=>now});}
  const PAID = new Date(NOW.getTime()+2000);
  function financial(environment:"disabled"|"sandbox"|"production"="production") {
    return createRecoveryFinancialAttributionService({database,tokenSecret:SECRET,providerEnvironment:environment,now:()=>new Date(PAID.getTime()+10000)});
  }
  async function sentClick(captureOnly=false) {
    const f=await captured();
    if(!captureOnly)await database.update(notificationDeliveries).set({status:"sent",sentAt:NOW}).where(eq(notificationDeliveries.id,f.delivery.id));
    await receipts(new Date(NOW.getTime()+1000)).record(f.actor,f.command);return f;
  }
  function adapter(now:Date, environment:"sandbox"|"production"="production", beforePaymentCommit?:()=>Promise<void>) {
    const repo=createDatabaseCommerceRepository(database,{now:()=>now,beforePaymentCommit});
    return createSePayWebhookService({secretKey:SECRET,webhookSecret:SECRET,providerEnvironment:environment,now:()=>now,
      recordPaid:input=>repo.recordPaid(input),recordUnmatched:input=>repo.recordUnmatched(input)});
  }
  async function pay(f:Awaited<ReturnType<typeof fixture>>,environment:"sandbox"|"production"="production",now=PAID,event=randomUUID(), beforePaymentCommit?:()=>Promise<void>) {
    const rawBody=JSON.stringify({notification_type:"ORDER_PAID",order:{order_invoice_number:`test-${f.orderId}`,order_amount:"99000",order_currency:"VND",order_status:"CAPTURED"},
      transaction:{transaction_id:event,transaction_amount:"99000",transaction_currency:"VND",transaction_status:"APPROVED",transaction_type:"PAYMENT"}});
    expect(await adapter(now,environment,beforePaymentCommit).handle({rawBody,secretHeader:SECRET,traceId:"synthetic-authenticated-fixture"})).toMatchObject({ok:true});return event;
  }
  async function projection(){return (await database.select().from(recoveryClickReceipts))[0];}
  it("projects genuine authenticated acceptance once with three separate units and committed grant/spend proofs",async()=>{
    const f=await sentClick();await pay(f);
    expect(await financial().project()).toEqual({attributed:1});
    const value=await projection();expect(value).toMatchObject({classification:"clicked",paidVnd:99000,chargedLa:960,recognizedVnd:85140});
    expect(value.paymentEventId).toBeTruthy();expect(value.grantTransactionId).toBeTruthy();expect(value.spendTransactionId).toBeTruthy();
    expect(await financial().project()).toEqual({attributed:0});expect(await projection()).toEqual(value);
    expect(await database.select().from(walletTransactions)).toHaveLength(2);
  });
  it.each(["disabled","sandbox","captured","historical","acceptance-before-click","no-consent","unsubscribe","deleted"])("rejects %s source without monetary projection",async(kind)=>{
    const f=await sentClick(kind==="captured");
    if(kind==="historical")expect(await createDatabaseCommerceRepository(database,{now:()=>PAID}).recordPaid({invoiceNumber:`test-${f.orderId}`,providerEventId:randomUUID(),amount:99000,currency:"VND",traceId:"metadata-free-fixture"})).toMatchObject({ok:true});
    else await pay(f,kind==="sandbox"?"sandbox":"production",kind==="acceptance-before-click"?new Date(NOW.getTime()-2000):PAID);
    if(kind==="no-consent")await database.update(consents).set({revokedAt:PAID}).where(eq(consents.id,f.consentId));
    if(kind==="unsubscribe")await database.insert(notificationPreferences).values({id:f.userId,userId:f.userId,emailFingerprint:f.delivery.recipientFingerprint,unsubscribedAll:true});
    if(kind==="deleted")await createDatabaseDeletionRepository(database).request({userId:f.userId,requestId:"synthetic-delete",requestedAt:PAID,recoverUntil:new Date(PAID.getTime()+1000)});
    expect(await financial(kind==="disabled"?"disabled":"production").project()).toEqual({attributed:0});expect((await projection()).attributedAt).toBeNull();
  });
  it("retains sandbox provenance across production replay and forbids stored source upgrades",async()=>{
    const f=await sentClick();const event=await pay(f,"sandbox");await pay(f,"production",new Date(PAID.getTime()+1000),event);
    const [payment]=await database.select().from(commercePaymentEvents);expect(payment.providerProvenance?.environment).toBe("sandbox");
    await expect(database.update(commercePaymentEvents).set({providerProvenance:{...payment.providerProvenance!,environment:"production"}}).where(eq(commercePaymentEvents.id,payment.id))).rejects.toThrow();
    expect(await financial().project()).toEqual({attributed:0});
  });
  it("rolls back provenance, paid transition, grant and continuation on settlement failure",async()=>{
    const f=await sentClick();await expect(pay(f,"production",PAID,randomUUID(),async()=>{throw Error("synthetic-commit-failure");})).rejects.toThrow("synthetic-commit-failure");
    expect(await database.select().from(commercePaymentEvents)).toHaveLength(0);expect(await database.select().from(walletTransactions)).toHaveLength(0);
    expect((await database.select().from(commerceOrders))[0].status).toBe("pending");expect(await financial().project()).toEqual({attributed:0});
  });
  it.each([false,true])("preserves bank authenticated acceptance through unmatched self-claim (late=%s)",async(late)=>{
    const f=await sentClick();const accepted=new Date(NOW.getTime()+(late?-2000:1500));
    const rawBody=JSON.stringify({id:912345,transferType:"in",transferAmount:99000,content:"synthetic unmatched fixture"});
    const timestampHeader=String(Math.floor(accepted.getTime()/1000));
    const signatureHeader="sha256="+createHmac("sha256",SECRET).update(`${timestampHeader}.${rawBody}`).digest("hex");
    expect(await adapter(accepted).handle({rawBody,timestampHeader,signatureHeader,traceId:"synthetic-bank-hmac"})).toMatchObject({ok:true});
    const [unmatched]=await database.select().from(commerceUnmatchedPayments);
    expect(unmatched.providerProvenance).toMatchObject({environment:"production",authentication:"hmac",channel:"bank",authenticatedAcceptedAt:accepted.toISOString()});
    const local=new Date(accepted.getTime()+7*3600000).toISOString().slice(0,16);
    expect(await createDatabaseCommerceRepository(database,{now:()=>PAID}).claimUnmatchedPayment(f.actor,{amount:99000,transferredAtLocal:local})).toMatchObject({ok:true});
    const [payment]=await database.select().from(commercePaymentEvents);expect(payment.providerProvenance).toEqual(unmatched.providerProvenance);
    expect(await financial().project()).toEqual({attributed:late?0:1});
  });
  it("recognizes only allocations funded by the exact recovery order in a multi-lot spend",async()=>{
    const f=await fixture();const oldId=randomUUID();await database.insert(commerceOrders).values({id:oldId,invoiceNumber:`old-${oldId}`,kind:"wallet_topup",ownerId:f.userId,sku:"LA-ENTRY-300",amount:29000,currency:"VND",locale:"vi",createdAt:CREATED});
    expect(await createDatabaseCommerceRepository(database,{now:()=>new Date(CREATED.getTime()+1000)}).recordPaid({invoiceNumber:`old-${oldId}`,providerEventId:randomUUID(),amount:29000,currency:"VND",traceId:"synthetic-old-lot"})).toMatchObject({ok:true});
    expect(await service().scanAndCapture()).toBe(1);const [delivery]=await captures();await database.update(notificationDeliveries).set({status:"sent",sentAt:NOW}).where(eq(notificationDeliveries.id,delivery.id));
    const actor:CurrentActor={kind:"account",userId:f.userId,sessionId:"synthetic",requestId:"synthetic"};await receipts(new Date(NOW.getTime()+1000)).record(actor,{version:1,orderId:f.orderId,deliveryId:delivery.id});await pay(f);
    expect(await financial().project()).toEqual({attributed:1});const value=await projection();
    const allocations=await database.select({recognized:walletSpendAllocations.recognizedVnd,grantId:walletCreditLots.grantTransactionId}).from(walletSpendAllocations).innerJoin(walletCreditLots,eq(walletCreditLots.id,walletSpendAllocations.creditLotId)).where(eq(walletSpendAllocations.spendTransactionId,value.spendTransactionId!));
    const expected=allocations.filter(a=>a.grantId===value.grantTransactionId).reduce((sum,a)=>sum+a.recognized,0);
    expect(value.recognizedVnd).toBe(expected);expect(value.recognizedVnd).toBeLessThan(allocations.reduce((sum,a)=>sum+a.recognized,0));expect(value.paidVnd).toBe(99000);
  });
  it("keeps posted historical attribution separate from refund restoration and official purge",async()=>{
    const f=await sentClick();await pay(f);expect(await financial().project()).toEqual({attributed:1});const value=await projection();
    const [wallet]=await database.select().from(walletAccounts).where(eq(walletAccounts.ownerId,f.userId));
    expect(await createDatabaseWalletRepository(database,{now:()=>new Date(PAID.getTime()+3000)}).restore({actor:f.actor,restoration:{kind:"restoration",actorId:f.userId,reasonCode:"synthetic-refund",requestId:"synthetic",traceId:"synthetic",idempotencyKey:randomUUID(),originalSpendId:value.spendTransactionId!,expectedWalletVersion:wallet.stateVersion}})).toMatchObject({ok:true});
    expect(await database.select().from(walletRestorationAllocations)).not.toHaveLength(0);expect(await financial().project()).toEqual({attributed:0});expect(await projection()).toEqual(value);
    const deletion=createDatabaseDeletionRepository(database);await deletion.request({userId:f.userId,requestId:"synthetic-purge",requestedAt:PAID,recoverUntil:new Date(PAID.getTime()+1000)});await deletion.purgeExpired(new Date(PAID.getTime()+2000),25);
    expect(await database.select().from(recoveryClickReceipts)).toHaveLength(0);
  });
  it("fairly rotates older ineligible sources before LIMIT without starving a valid conversion",async()=>{
    const old=await sentClick();await pay(old);await database.update(consents).set({revokedAt:PAID}).where(eq(consents.id,old.consentId));
    const good=await sentClick();await pay(good);
    await database.update(recoveryClickReceipts).set({clickedAt:new Date(NOW.getTime()+500)}).where(eq(recoveryClickReceipts.orderId,old.orderId));
    expect(await financial().project(1)).toEqual({attributed:0});expect(await financial().project(1)).toEqual({attributed:1});
    const receipts=await database.select().from(recoveryClickReceipts);expect(receipts.find(r=>r.orderId===old.orderId)?.attributedAt).toBeNull();expect(receipts.find(r=>r.orderId===good.orderId)?.paidVnd).toBe(99000);
  });

});
