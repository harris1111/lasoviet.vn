import { randomUUID } from "node:crypto";

import { PostgreSqlContainer } from "@testcontainers/postgresql";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { authUsers, createDatabase, runMigrations, walletAccounts, type Database } from "@lasoviet/database";
import { eq } from "drizzle-orm";

import { createDatabaseWalletRepository } from "./wallet.repository.js";
import { ensureWalletWelcomeGrant } from "./wallet-welcome-grant.js";

describe("wallet welcome grant (FD-105 package 1.6)", () => {
  let container: Awaited<ReturnType<PostgreSqlContainer["start"]>> | undefined;
  let database: Database;

  beforeAll(async () => {
    container = await new PostgreSqlContainer("postgres:16-alpine")
      .withDatabase("lasoviet_welcome_grant_test")
      .withUsername("lasoviet")
      .withPassword("lasoviet")
      .start();
    await runMigrations(container.getConnectionUri());
    database = createDatabase(container.getConnectionUri());
  }, 120_000);

  afterAll(async () => {
    await container?.stop();
  }, 30_000);

  async function createAccount(options: { emailVerified?: boolean; isAnonymous?: boolean } = {}) {
    const id = `welcome-${randomUUID()}`;
    await database.insert(authUsers).values({
      id,
      name: "Welcome grant owner",
      email: `${id}@example.test`,
      emailVerified: options.emailVerified ?? true,
      isAnonymous: options.isAnonymous ?? false,
    });
    return id;
  }

  async function walletOf(ownerId: string) {
    const [wallet] = await database.select().from(walletAccounts).where(eq(walletAccounts.ownerId, ownerId)).limit(1);
    return wallet;
  }

  it("grants exactly 60 promotional Lá to a verified account, and only once", async () => {
    const ownerId = await createAccount();
    const now = () => new Date("2026-09-27T05:00:00.000Z");

    await ensureWalletWelcomeGrant(database, ownerId, { now, requestId: "req-1", traceId: "trace-1" });
    expect(await walletOf(ownerId)).toMatchObject({ purchasedBalance: 0, promotionalBalance: 60 });

    // Calling it again (e.g. loading /nap-la twice) must not grant a second time.
    await ensureWalletWelcomeGrant(database, ownerId, { now, requestId: "req-2", traceId: "trace-2" });
    expect(await walletOf(ownerId)).toMatchObject({ purchasedBalance: 0, promotionalBalance: 60 });
  });

  it("does not grant to an anonymous or unverified account", async () => {
    const anonymous = await createAccount({ isAnonymous: true });
    const unverified = await createAccount({ emailVerified: false });
    const now = () => new Date("2026-09-27T05:00:00.000Z");

    await ensureWalletWelcomeGrant(database, anonymous, { now, requestId: "req-3", traceId: "trace-3" });
    await ensureWalletWelcomeGrant(database, unverified, { now, requestId: "req-4", traceId: "trace-4" });

    expect(await walletOf(anonymous)).toBeUndefined();
    expect(await walletOf(unverified)).toBeUndefined();
  });

  it("grants to a formerly-ineligible account once it becomes verified, still only once", async () => {
    const ownerId = await createAccount({ emailVerified: false });
    const now = () => new Date("2026-09-27T05:00:00.000Z");

    await ensureWalletWelcomeGrant(database, ownerId, { now, requestId: "req-5", traceId: "trace-5" });
    expect(await walletOf(ownerId)).toBeUndefined();

    await database.update(authUsers).set({ emailVerified: true }).where(eq(authUsers.id, ownerId));
    await ensureWalletWelcomeGrant(database, ownerId, { now, requestId: "req-6", traceId: "trace-6" });
    expect(await walletOf(ownerId)).toMatchObject({ purchasedBalance: 0, promotionalBalance: 60 });

    await ensureWalletWelcomeGrant(database, ownerId, { now, requestId: "req-7", traceId: "trace-7" });
    expect(await walletOf(ownerId)).toMatchObject({ purchasedBalance: 0, promotionalBalance: 60 });
  });

  it("does not interfere with a separate top-up grant on the same wallet", async () => {
    const ownerId = await createAccount();
    const now = () => new Date("2026-09-27T05:00:00.000Z");

    await ensureWalletWelcomeGrant(database, ownerId, { now, requestId: "req-8", traceId: "trace-8" });
    const wallet = createDatabaseWalletRepository(database, { now });
    const history = await wallet.readHistory({ kind: "account", userId: ownerId, sessionId: "s", requestId: "r" });
    expect(history.ok && history.value.items).toHaveLength(1);
    expect(history.ok && history.value.items[0]?.laDelta).toBe(60);
  });
});
