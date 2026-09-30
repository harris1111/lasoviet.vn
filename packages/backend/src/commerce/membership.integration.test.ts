import { randomUUID } from "node:crypto";
import { PostgreSqlContainer } from "@testcontainers/postgresql";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { findLaProduct, type CurrentActor, type MembershipExpiryEmailRequest } from "@lasoviet/contracts";
import { authUsers, createDatabase, membershipSubscriptions, notificationDeliveries, runMigrations, walletTransactions, type Database } from "@lasoviet/database";
import { createDatabaseWalletRepository } from "../wallet/wallet.repository.js";
import { createWalletService } from "../wallet/wallet.service.js";
import { createMembershipService, membershipPrice, readActiveMembership } from "./membership.service.js";
import { createMembershipExpiryReminderService, membershipReminderAllowed } from "../notifications/membership-expiry.service.js";
import { createAuthEmailDeliveryService, createDatabaseAuthEmailDeliveryStore } from "../notifications/auth-email.js";
import type { NotificationPreferenceStore } from "../notifications/notification-preference.js";

describe("membership wallet and expiry integration", () => {
  let container: Awaited<ReturnType<PostgreSqlContainer["start"]>>;
  let db: Database;
  let time = new Date("2026-09-30T03:00:00Z");
  const now = () => time;
  beforeAll(async () => {
    container = await new PostgreSqlContainer("postgres:16-alpine").start();
    await runMigrations(container.getConnectionUri());
    db = createDatabase(container.getConnectionUri());
  }, 120_000);
  afterAll(async () => { await container?.stop(); }, 30_000);
  const activeCatalog: typeof findLaProduct = (sku) => {
    const product = findLaProduct(sku);
    return product ? { ...product, availability: "active" } : undefined;
  };
  async function fixture(amount = 20_000) {
    time = new Date("2026-09-30T03:00:00Z");
    const id = randomUUID();
    const actor: CurrentActor = { kind: "account", userId: id, sessionId: `session:${id}`, requestId: `request:${id}` };
    await db.insert(authUsers).values({ id, name: "Synthetic member", email: `${id}@example.test`, emailVerified: true });
    const authority = { token: {}, actorId: id };
    const repository = createDatabaseWalletRepository(db, { now, trustedGrantAuthority: authority });
    const wallet = createWalletService(repository);
    await repository.grant({ targetOwnerId: id, topUpOrderId: null, trustedGrantToken: authority.token, grant: {
      version: 1, kind: "grant", actorId: id, reasonCode: "test.membership.credit", requestId: actor.requestId, traceId: actor.requestId,
      idempotencyKey: `fund:${id}`, purchasedLa: 0, promotionalLa: amount, topUpPackId: null,
    } });
    const service = createMembershipService(db, wallet, { now, catalog: activeCatalog });
    async function buy(sku = "MEMBERSHIP-MONTHLY-P0") {
      const intent = await service.createIntent(actor, { sku, locale: "vi" });
      const balance = await wallet.readBalance(actor);
      if (!intent.ok || !balance.ok) throw new Error("fixture intent failed");
      const command = { purchaseIntentId: intent.value.id, expectedIntentVersion: intent.value.stateVersion, expectedWalletVersion: balance.value.stateVersion, idempotencyKey: randomUUID() };
      return { intent, command, result: await service.purchase(actor, command) };
    }
    return { id, actor, repository, wallet, service, buy };
  }
  it("atomically spends 1500 once, replays, appends explicit renewals, and denies exact expiry", async () => {
    const owner = await fixture();
    expect(await owner.service.read(owner.actor)).toMatchObject({ ok: true, value: { plans: [
      { sku: "MEMBERSHIP-MONTHLY-P0", priceLa: findLaProduct("MEMBERSHIP-MONTHLY-P0")!.priceLa },
      { sku: "MEMBERSHIP-YEARLY-P0", priceLa: findLaProduct("MEMBERSHIP-YEARLY-P0")!.priceLa },
    ] } });
    const bought = await owner.buy();
    expect(bought.result).toMatchObject({ ok: true, value: { balance: { totalLa: 18_500 } } });
    expect(await owner.service.purchase(owner.actor, bought.command)).toEqual(bought.result);
    expect(await owner.service.purchase(owner.actor, { ...bought.command, expectedIntentVersion: 2 })).toMatchObject({ ok: false });
    const first = await readActiveMembership(db, owner.id, time);
    expect(first?.expiresAt).toEqual(new Date("2026-10-30T03:00:00Z"));
    const renewal = await owner.buy("MEMBERSHIP-YEARLY-P0");
    expect(renewal.result).toMatchObject({ ok: true, value: { balance: { totalLa: 10_500 } } });
    expect(await owner.service.read(owner.actor)).toMatchObject({ ok: true, value: { active: true, expiresAt: "2027-10-30T03:00:00.000Z", automaticRenewal: false } });
    time = new Date("2027-10-30T03:00:00Z");
    expect(await readActiveMembership(db, owner.id, time)).toBeNull();
    expect(await owner.wallet.readBalance(owner.actor)).toMatchObject({ ok: true, value: { totalLa: 10_500 } });
  });
  it("rejects reserved catalog, cross-account purchases and insufficient balance without subscription", async () => {
    const owner = await fixture(100);
    const defaultService = createMembershipService(db, owner.wallet, { now });
    expect(await defaultService.createIntent(owner.actor, { sku: "MEMBERSHIP-MONTHLY-P0", locale: "vi" })).toMatchObject({ ok: false });
    const purchase = await owner.buy();
    expect(purchase.result).toMatchObject({ ok: false, code: "WALLET_INSUFFICIENT_BALANCE" });
    const stranger = await fixture();
    expect(await stranger.service.purchase(stranger.actor, purchase.command)).toMatchObject({ ok: false });
    expect(await db.select().from(membershipSubscriptions).where(eq(membershipSubscriptions.ownerId, owner.id))).toHaveLength(0);
  });
  it("serializes competing confirmed renewals through wallet versions and appends on explicit retry", async () => {
    const owner = await fixture();
    const month = await owner.service.createIntent(owner.actor, { sku: "MEMBERSHIP-MONTHLY-P0", locale: "vi" });
    const year = await owner.service.createIntent(owner.actor, { sku: "MEMBERSHIP-YEARLY-P0", locale: "vi" });
    const balance = await owner.wallet.readBalance(owner.actor);
    if (!month.ok || !year.ok || !balance.ok) throw new Error("fixture");
    const commands = [month, year].map((intent) => ({ purchaseIntentId: intent.value.id, expectedIntentVersion: 1, expectedWalletVersion: balance.value.stateVersion, idempotencyKey: randomUUID() }));
    const results = await Promise.all(commands.map((command) => owner.service.purchase(owner.actor, command)));
    expect(results.filter((result) => result.ok)).toHaveLength(1);
    const fresh = await owner.wallet.readBalance(owner.actor);
    if (!fresh.ok) throw new Error("balance");
    expect(await owner.service.purchase(owner.actor, { ...commands[results.findIndex((result) => !result.ok)]!, expectedWalletVersion: fresh.value.stateVersion })).toMatchObject({ ok: true });
    const periods = await db.select().from(membershipSubscriptions).where(eq(membershipSubscriptions.ownerId, owner.id)).orderBy(membershipSubscriptions.startsAt);
    expect(periods[1]?.startsAt).toEqual(periods[0]?.expiresAt);
  });
  it("serializes a pending locale change against purchase without deadlock or an extra debit", async () => {
    const owner = await fixture();
    const intent = await owner.service.createIntent(owner.actor, { sku: "MEMBERSHIP-MONTHLY-P0", locale: "vi" });
    const balance = await owner.wallet.readBalance(owner.actor);
    if (!intent.ok || !balance.ok) throw new Error("fixture");
    const [changed, bought] = await Promise.all([
      owner.service.createIntent(owner.actor, { sku: "MEMBERSHIP-MONTHLY-P0", locale: "en" }),
      owner.service.purchase(owner.actor, { purchaseIntentId: intent.value.id, expectedIntentVersion: 1, expectedWalletVersion: balance.value.stateVersion, idempotencyKey: randomUUID() }),
    ]);
    expect(changed.ok).toBe(true);
    expect(await owner.wallet.readBalance(owner.actor)).toMatchObject({ ok: true, value: { totalLa: bought.ok ? 18_500 : 20_000 } });
    expect(await db.select().from(membershipSubscriptions).where(eq(membershipSubscriptions.ownerId, owner.id))).toHaveLength(bought.ok ? 1 : 0);
  }, 10_000);
  it("restoration revokes membership access and discount immediately", async () => {
    const owner = await fixture();
    const { result } = await owner.buy();
    if (!result.ok) throw new Error("purchase");
    const [period] = await db.select().from(membershipSubscriptions).where(eq(membershipSubscriptions.id, result.value.subscriptionId!));
    expect(await owner.repository.restore({ actor: owner.actor, restoration: {
      version: 1, kind: "restoration", actorId: owner.id, reasonCode: "wallet.report.failure", requestId: owner.actor.requestId, traceId: owner.actor.requestId,
      idempotencyKey: randomUUID(), originalSpendId: period!.ledgerSpendId, expectedWalletVersion: result.value.balance.stateVersion,
    } })).toMatchObject({ ok: true });
    expect(await readActiveMembership(db, owner.id, time)).toBeNull();
    expect(await owner.service.read(owner.actor)).toMatchObject({ ok: true, value: { discountPercent: 0 } });
  });
  it("does not bridge a refunded renewal period or grant a queued period early", async () => {
    const owner = await fixture();
    await owner.buy();
    const second = await owner.buy();
    await owner.buy();
    if (!second.result.ok) throw new Error("renewal");
    const [middle] = await db.select().from(membershipSubscriptions).where(eq(membershipSubscriptions.id, second.result.value.subscriptionId!));
    const balance = await owner.wallet.readBalance(owner.actor);
    if (!balance.ok) throw new Error("balance");
    expect(await owner.repository.restore({ actor: owner.actor, restoration: {
      version: 1, kind: "restoration", actorId: owner.id, reasonCode: "wallet.report.failure", requestId: owner.actor.requestId, traceId: owner.actor.requestId,
      idempotencyKey: randomUUID(), originalSpendId: middle!.ledgerSpendId, expectedWalletVersion: balance.value.stateVersion,
    } })).toMatchObject({ ok: true });
    expect(await owner.service.read(owner.actor)).toMatchObject({ ok: true, value: { active: true, expiresAt: "2026-10-30T03:00:00.000Z" } });
    time = new Date("2026-10-30T03:00:00Z");
    expect(await readActiveMembership(db, owner.id, time)).toBeNull();
    time = new Date("2026-11-29T03:00:00Z");
    expect(await readActiveMembership(db, owner.id, time)).not.toBeNull();
  });
  it("continues beyond skipped recipients and rechecks unsubscribe at dispatch", async () => {
    const skipped = await fixture();
    await skipped.buy();
    const recipient = await fixture();
    // A later expiry guarantees that the skipped record sorts before the eligible recipient.
    time = new Date("2026-09-30T04:00:00Z");
    await recipient.buy();
    time = new Date("2026-10-27T04:00:00Z");
    let allowed = true;
    const preferences = { isNonTransactionalAllowed: vi.fn(async (_email: string, userId: string) => allowed && userId === recipient.id) } as unknown as NotificationPreferenceStore;
    const scanner = createMembershipExpiryReminderService({ database: db, preferenceStore: preferences, tokenSecret: "synthetic", now });
    const result = await scanner.scanAndEnqueue(1);
    expect(result.enqueued).toBe(1);
    expect(result.scanned).toBeGreaterThan(1);
    const rows = await db.select().from(notificationDeliveries);
    const payload = rows.map((row) => row.requestPayload as MembershipExpiryEmailRequest).find((request) => request.userId === recipient.id)!;
    expect(payload.actionUrl).toBe("https://lasoviet.net/nap-la?tab=hoi-vien");
    allowed = false;
    const provider = { send: vi.fn(async () => ({ ok: true as const, providerMessageId: "synthetic" })) };
    const email = createAuthEmailDeliveryService({ store: createDatabaseAuthEmailDeliveryStore(db), provider, recipientFingerprintSecret: "synthetic", preferenceChecker: preferences, membershipReminderAllowed: (request, current) => membershipReminderAllowed(db, request, current), now });
    expect(await email.send(payload)).toMatchObject({ status: "failed_permanent", errorCode: "RECIPIENT_UNSUBSCRIBED" });
    expect(provider.send).not.toHaveBeenCalled();
  });
  it("delivers a consented expiry reminder once through the retry worker without wallet activity", async () => {
    const owner = await fixture();
    await owner.buy();
    time = new Date("2026-10-27T03:00:00Z");
    const preferences = { isNonTransactionalAllowed: vi.fn(async (_email: string, userId: string) => userId === owner.id) } as unknown as NotificationPreferenceStore;
    const scanner = createMembershipExpiryReminderService({ database: db, preferenceStore: preferences, tokenSecret: "synthetic", now });
    expect((await scanner.scanAndEnqueue()).enqueued).toBe(1);
    const provider = { send: vi.fn(async () => ({ ok: true as const, providerMessageId: "synthetic" })) };
    const email = createAuthEmailDeliveryService({ store: createDatabaseAuthEmailDeliveryStore(db), provider, recipientFingerprintSecret: "synthetic", preferenceChecker: preferences, membershipReminderAllowed: (request, current) => membershipReminderAllowed(db, request, current), now });
    const balance = await owner.wallet.readBalance(owner.actor);
    await email.retryDue(100);
    await scanner.scanAndEnqueue();
    await email.retryDue(100);
    expect(provider.send).toHaveBeenCalledTimes(1);
    expect(provider.send).toHaveBeenCalledWith(expect.objectContaining({ to: `${owner.id}@example.test`, text: expect.stringContaining("Không tự động gia hạn") }), expect.stringContaining("membership-expiry:"));
    expect(await owner.wallet.readBalance(owner.actor)).toEqual(balance);
  });
  it("compares base discount and rollover without stacking", () => {
    expect(membershipPrice(960, undefined, true)).toBe(768);
    expect(membershipPrice(960, 720, true)).toBe(720);
    expect(membershipPrice(960, 0, true)).toBe(0);
    expect(membershipPrice(240, undefined, true)).toBe(192);
    expect(membershipPrice(120, undefined, true)).toBe(96);
  });
  it("deduplicates three-day reminders, respects consent and unsubscribe, suppresses renewal, and never spends", async () => {
    const owner = await fixture();
    await owner.buy();
    time = new Date("2026-10-27T03:00:00Z");
    let allowed = false;
    const preferences = { isNonTransactionalAllowed: vi.fn(async () => allowed) } as unknown as NotificationPreferenceStore;
    const scanner = createMembershipExpiryReminderService({ database: db, preferenceStore: preferences, tokenSecret: "synthetic-secret", now });
    expect((await scanner.scanAndEnqueue()).enqueued).toBe(0);
    allowed = true;
    const counts = await Promise.all([scanner.scanAndEnqueue(), scanner.scanAndEnqueue()]);
    // Earlier test owners may have eligible memberships; only this owner's delivery is asserted below.
    expect(counts.reduce((sum, value) => sum + value.enqueued, 0)).toBeGreaterThan(0);
    const rows = await db.select().from(notificationDeliveries);
    const delivery = rows.find((row) => (row.requestPayload as MembershipExpiryEmailRequest).userId === owner.id)!;
    const payload = delivery.requestPayload as MembershipExpiryEmailRequest;
    expect(await membershipReminderAllowed(db, payload, time)).toBe(true);
    const provider = { send: vi.fn(async () => ({ ok: true as const, providerMessageId: "synthetic" })) };
    const email = createAuthEmailDeliveryService({ store: createDatabaseAuthEmailDeliveryStore(db), provider, recipientFingerprintSecret: "synthetic-secret", preferenceChecker: preferences, membershipReminderAllowed: (request, current) => membershipReminderAllowed(db, request, current), now });
    await owner.buy();
    expect(await membershipReminderAllowed(db, payload, time)).toBe(false);
    expect(await email.send(payload)).toMatchObject({ status: "failed_permanent", errorCode: "MEMBERSHIP_REMINDER_OBSOLETE" });
    expect(provider.send).not.toHaveBeenCalled();
    const before = await db.select().from(walletTransactions);
    await scanner.scanAndEnqueue();
    await email.retryDue(25);
    expect(await db.select().from(walletTransactions)).toHaveLength(before.length);
  });
});
