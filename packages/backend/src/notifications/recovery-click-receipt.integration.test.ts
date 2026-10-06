import {createRecoveryClickReceiptService} from "./recovery-click-receipt.js";
import { randomUUID } from "node:crypto";
import { PostgreSqlContainer } from "@testcontainers/postgresql";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { eq, sql } from "drizzle-orm";
import {
  authUsers, birthProfiles, birthProfileRevisions, calculationRuns, commerceOrders,
  consents, createDatabase,
  notificationDeliveries, notificationPreferences, recoveryClickReceipts, outbox, runMigrations, walletPurchaseIntents,
  walletTopUpContinuations, walletTransactions, ziweiCharts, ziweiChartVersions, type Database,
} from "@lasoviet/database";
import type { CurrentActor } from "@lasoviet/contracts";
import { createDatabaseDeletionRepository } from "../privacy/deletion.repository.js";
import { createPendingTopUpRecoveryCaptureService } from "./pending-topup-recovery-capture.js";

const NOW = new Date("2026-10-04T12:00:00.000Z");
const CREATED = new Date("2026-10-04T11:30:00.000Z");
const SECRET = "synthetic-recovery-secret-not-a-provider-credential";

describe("durable recovery click receipts with isolated PostgreSQL", () => {
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
    return { userId, email, chartId, chartVersionId, profileId, revisionId, runId, consentId, intentId, orderId };
  }
  async function addOrder(orderId: string, intentId: string, userId: string, locale = "vi", priceLa = 960) {
    await database.insert(commerceOrders).values({ id: orderId, invoiceNumber: `test-${orderId}`, kind: "wallet_topup",
      ownerId: userId, sku: "LA-ENTRY-300", amount: 29000, currency: "VND", locale, createdAt: CREATED });
    await database.insert(walletTopUpContinuations).values({ orderId, ownerId: userId, purchaseIntentId: intentId,
      intentStateVersion: 1, confirmedPriceLa: priceLa, returnTab: "overview", createdAt: CREATED });
  }
  async function captures() { return database.select().from(notificationDeliveries).where(eq(notificationDeliveries.kind, "recovery_pending_topup")); }
  async function captured() {
    const f=await fixture();expect(await service().scanAndCapture()).toBe(1);
    const [delivery]=await captures();
    const actor:CurrentActor={kind:"account",userId:f.userId,sessionId:"synthetic",requestId:"synthetic"};
    return {...f,delivery,actor,command:{version:1 as const,orderId:f.orderId,deliveryId:delivery.id}};
  }
  function receipts(now=NOW,mode:"disabled"|"capture"="capture") {return createRecoveryClickReceiptService({database,mode,tokenSecret:SECRET,orderTtlSeconds:86400,now:()=>now});}
  it("captures an opaque owned click once, without commerce or monetary attribution",async()=>{
    const f=await captured();const before=await database.select().from(commerceOrders);
    const result=await receipts().record(f.actor,f.command);
    expect(result).toEqual({version:1,orderId:f.orderId,source:"reminder",classification:"captured_click"});
    expect(await receipts(new Date(NOW.getTime()+1000)).record(f.actor,f.command)).toEqual(result);
    const rows=await database.select().from(recoveryClickReceipts);expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({clickedAt:NOW,attributedAt:null,paidVnd:null,chargedLa:null});
    expect(await database.select().from(commerceOrders)).toEqual(before);
    expect(await database.select().from(walletTransactions)).toHaveLength(0);
  });
  it("rejects any monetary tuple in the receipt-only milestone",async()=>{
    const f=await captured();await receipts().record(f.actor,f.command);
    for(const change of [{paidVnd:29000},{chargedLa:960},{attributedAt:NOW},{paidVnd:29000,chargedLa:960,attributedAt:NOW}]) {
      await expect(database.update(recoveryClickReceipts).set(change).where(eq(recoveryClickReceipts.orderId,f.orderId))).rejects.toThrow();
    }
    expect((await database.select().from(recoveryClickReceipts))[0].paidVnd).toBeNull();
  });
  it("serializes concurrent click receipts",async()=>{
    const f=await captured();const values=await Promise.all([receipts().record(f.actor,f.command),receipts().record(f.actor,f.command)]);
    expect(values[0]).toEqual(values[1]);expect(await database.select().from(recoveryClickReceipts)).toHaveLength(1);
  });
  it("never upgrades a captured click after a delivery status change or payment",async()=>{
    const f=await captured();await receipts().record(f.actor,f.command);
    await database.update(notificationDeliveries).set({status:"sent",sentAt:NOW}).where(eq(notificationDeliveries.id,f.delivery.id));
    await database.update(commerceOrders).set({status:"paid",paidAt:NOW}).where(eq(commerceOrders.id,f.orderId));
    expect((await receipts().record(f.actor,f.command)).classification).toBe("captured_click");
    expect((await database.select().from(recoveryClickReceipts))[0].attributedAt).toBeNull();
  });
  it("records a sent reminder click separately but no revenue projection",async()=>{
    const f=await captured();await database.update(notificationDeliveries).set({status:"sent",sentAt:NOW}).where(eq(notificationDeliveries.id,f.delivery.id));
    expect((await receipts().record(f.actor,f.command)).classification).toBe("clicked");
    expect((await database.select().from(recoveryClickReceipts))[0].paidVnd).toBeNull();
  });
  it.each(["foreign","unverified","paid","expired","changed-intent","changed-version","revoked-consent","unsubscribe","deleted-profile"])("rejects %s receipt admission",async(kind)=>{
    const f=await captured();let actor=f.actor;
    if(kind==="foreign")actor={...actor,userId:(await fixture()).userId};
    if(kind==="unverified")await database.update(authUsers).set({emailVerified:false}).where(eq(authUsers.id,f.userId));
    if(kind==="paid")await database.update(commerceOrders).set({status:"paid",paidAt:NOW}).where(eq(commerceOrders.id,f.orderId));
    if(kind==="changed-intent")await database.update(walletPurchaseIntents).set({stateVersion:2}).where(eq(walletPurchaseIntents.id,f.intentId));
    if(kind==="changed-version")await database.update(ziweiChartVersions).set({createdAt:new Date(CREATED.getTime()+1)}).where(eq(ziweiChartVersions.id,f.chartVersionId));
    if(kind==="revoked-consent")await database.update(consents).set({revokedAt:NOW}).where(eq(consents.id,f.consentId));
    if(kind==="unsubscribe")await database.insert(notificationPreferences).values({id:f.userId,userId:f.userId,emailFingerprint:f.delivery.recipientFingerprint,unsubscribedAll:true});
    if(kind==="deleted-profile")await database.update(birthProfiles).set({deletedAt:NOW}).where(eq(birthProfiles.id,f.profileId));
    if(kind==="changed-version") {
      const [run]=await database.select().from(calculationRuns).where(eq(calculationRuns.id,f.runId));
      const newRunId="new-"+f.runId;
      await database.insert(calculationRuns).values({...run,id:newRunId,idempotencyKey:newRunId});
      await database.insert(ziweiChartVersions).values({id:"new-"+f.chartVersionId,chartId:f.chartId,calculationRunId:newRunId,normalizedOutput:{},privateRawSnapshot:{},warnings:[],provenance:{},createdAt:new Date(NOW.getTime()+1)});}
    const now=kind==="expired"?new Date(CREATED.getTime()+86400*1000):NOW;
    await expect(receipts(now).record(actor,f.command)).rejects.toMatchObject({code:"RECOVERY_NOT_FOUND"});
    expect(await database.select().from(recoveryClickReceipts)).toHaveLength(0);
  });
  it("rejects an arbitrary delivery/order/UTM and defaults disabled",async()=>{
    const f=await captured();await expect(receipts(NOW,"disabled").record(f.actor,f.command)).rejects.toMatchObject({code:"RECOVERY_DISABLED"});
    await expect(receipts().record(f.actor,{...f.command,deliveryId:randomUUID()})).rejects.toMatchObject({code:"RECOVERY_NOT_FOUND"});
    await expect(receipts().record(f.actor,{...f.command,orderId:randomUUID()})).rejects.toMatchObject({code:"RECOVERY_NOT_FOUND"});
    expect(await database.select().from(recoveryClickReceipts)).toHaveLength(0);
  });
  it("fences deletion and purges actual receipt payloads",async()=>{
    const f=await captured();await receipts().record(f.actor,f.command);
    const deletion=createDatabaseDeletionRepository(database);
    await deletion.request({userId:f.userId,requestId:"synthetic-delete",requestedAt:NOW,recoverUntil:new Date(NOW.getTime()+1000)});
    await expect(receipts().record(f.actor,f.command)).rejects.toMatchObject({code:"RECOVERY_NOT_FOUND"});
    await deletion.purgeExpired(new Date(NOW.getTime()+2000),25);
    expect(await database.select().from(recoveryClickReceipts)).toHaveLength(0);
    expect(await captures()).toHaveLength(0);
  });
});
