import { randomUUID } from "node:crypto";
import { PostgreSqlContainer } from "@testcontainers/postgresql";
import { eq, sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { CurrentActor, NormalizedBirthProfileV1 } from "@lasoviet/contracts";
import { authAnonymousActors, authUsers, baziSources, birthProfileRevisions, birthProfiles, calculationRuns,
  createDatabase, deletionRequests, FREE_AI_COORDINATION_LOCK, RECOVERY_CAPTURE_COORDINATION_LOCK,
  lockFreeAiCoordination, runMigrations } from "@lasoviet/database";
import { linkAnonymousActorToAccount } from "@lasoviet/database/runtime";
import { buildBaziDecadalSource } from "@lasoviet/engine-adapters";
import * as baziModule from "./bazi-source.repository.js";
import { createDatabaseBaziDecadalSourceRepository } from "./bazi-decadal-source.repository.js";
const at = new Date("2026-10-09T08:00:00Z"), expiry = new Date(at.getTime() + 24 * 3600000);
const unavailable = {ok: false, error: {code: "BAZI_DECADAL_SOURCE_UNAVAILABLE"}};
describe("actual PostgreSQL owned Bazi decadal draft preparation", () => {
  let container: Awaited<ReturnType<PostgreSqlContainer["start"]>>;
  let database: ReturnType<typeof createDatabase>;
  beforeAll(async () => {
    container = await new PostgreSqlContainer("postgres:16-alpine").start();
    await runMigrations(container.getConnectionUri()); database = createDatabase(container.getConnectionUri());
  }, 120000);
  afterAll(async () => {await container?.stop();}, 30000);
  async function owner(anonymous = false): Promise<CurrentActor> {
    const id = randomUUID();
    if (anonymous) {await database.insert(authAnonymousActors).values({id, expiresAt: expiry});
      return {kind: "anonymous", anonymousActorId: id, expiresAt: expiry.toISOString(), sessionId: "s", requestId: "r"};}
    await database.insert(authUsers).values({id, name: "Synthetic", email: `${id}@example.test`});
    return {kind: "account", userId: id, sessionId: "s", requestId: "r"};
  }
  async function seed(actor: CurrentActor, gender?: "male" | "female", unknown = false, date = "1992-06-15") {
    const profileId = randomUUID(), revisionId = randomUUID();
    await database.insert(birthProfiles).values({id: profileId,
      ...(actor.kind === "account" ? {userId: actor.userId} : {anonymousActorId: actor.anonymousActorId, anonymousExpiresAt: expiry})});
    const time = unknown ? {precision: "unknown" as const} : {precision: "exact_minute" as const, localTime: "08:30"};
    const calendar = {kind: "solar" as const, date};
    const profile: NormalizedBirthProfileV1 = {version: 1,
      originalInput: {version: 1, calendar, time, ...(gender ? {gender} : {}), timezone: {offsetMinutes: 420},
        displayName: "PRIVATE_PERSON", placeLabel: "PRIVATE_PLACE", consentVersion: "PRIVATE_CONSENT"},
      normalizedCalendar: calendar, normalizedTime: time, timezoneProvenance: {source: "offset", offsetMinutes: 420},
      normalizationWarnings: [], limitations: []};
    const {originalInput, ...normalizedInput} = profile;
    await database.insert(birthProfileRevisions).values({id: revisionId, profileId, revisionNumber: 1,
      originalInput, normalizedInput, consentVersion: "synthetic", createdAt: at});
    const calculated = await baziModule.createDatabaseBaziSourceRepository(database, {clock: () => at}).calculate(actor, revisionId);
    if (!calculated.ok) throw new Error(calculated.error.code);
    return {...calculated.value, profileId, revisionId};
  }
  const repo = (clock: () => Date = () => at) => createDatabaseBaziDecadalSourceRepository(database, {clock});
  it.each(["male", "female"] as const)("binds the actual stored %s gender and source without writes or birth-input projection", async gender => {
    const actor = await owner(), one = await seed(actor, gender);
    const before = await database.select().from(baziSources), runs = await database.select().from(calculationRuns);
    const result = await repo().prepare(actor, one.sourceId); if (!result.ok) throw new Error(result.error.code);
    const [stored] = await database.select().from(baziSources).where(eq(baziSources.id, one.sourceId));
    expect(result.value).toEqual({sourceId: one.sourceId, source: buildBaziDecadalSource({
      resolvedInput: stored!.resolvedInput, storedChart: one.chart, gender})});
    expect(result.value.source).toMatchObject({status: "draft_source", manualAccepted: false, gender});
    expect(result.value.source.cycles).toHaveLength(10);
    expect(await repo().prepare(actor, one.sourceId)).toEqual(result);
    expect(await database.select().from(baziSources)).toEqual(before); expect(await database.select().from(calculationRuns)).toEqual(runs);
    for (const secret of [actor.kind === "account" ? actor.userId : "", one.profileId, one.revisionId, "1992-06-15", "08:30",
      "PRIVATE_PERSON", "PRIVATE_PLACE", "PRIVATE_CONSENT", "resolvedInput", "originalInput", "currentCycle", "fortuneScore"])
      if (secret) expect(JSON.stringify(result)).not.toContain(secret);
  });
  it("binds opposite gender even when normalized chart/calculation hashes are equal", async () => {
    const actor = await owner(), male = await seed(actor, "male"), female = await seed(actor, "female");
    expect(male.chart).toEqual(female.chart);
    const a = await repo().prepare(actor, male.sourceId), b = await repo().prepare(actor, female.sourceId);
    if (!a.ok || !b.ok) throw new Error("expected owned sources");
    expect(a.value.source.direction).not.toBe(b.value.source.direction);
    expect(a.value.source.sourceHash).not.toBe(b.value.source.sourceHash);
  });
  it("does not admit missing/foreign/equal-input sources through a hash or actor claim", async () => {
    const actor = await owner(), foreign = await owner(), one = await seed(actor, "male"), two = await seed(foreign, "male");
    expect(one.chart).toEqual(two.chart);
    for (const id of [two.sourceId, randomUUID(), "", " ", "x".repeat(256)]) expect(await repo().prepare(actor, id)).toEqual(unavailable);
    expect(await repo().prepare(foreign, one.sourceId)).toEqual(unavailable);
    if (actor.kind !== "account") throw new Error("fixture actor");
    expect(await repo().prepare({...actor, userId: randomUUID()}, one.sourceId)).toEqual(unavailable);
    await database.update(authUsers).set({isAnonymous: true}).where(eq(authUsers.id, actor.userId));
    expect(await repo().prepare(actor, one.sourceId)).toEqual(unavailable);
  });
  it.each(["missing-gender", "unknown-hour", "term-alternatives"])("generically refuses %s rather than guessing source facts", async kind => {
    const actor = await owner(), one = await seed(actor, kind === "missing-gender" ? undefined : "male",
      kind !== "missing-gender", kind === "term-alternatives" ? "2024-02-04" : "1992-06-15");
    expect(await repo().prepare(actor, one.sourceId)).toEqual(unavailable);
  });
  it.each(["archive", "deletion-request"])("refuses %s and permits only cancelled deletion", async kind => {
    const actor = await owner(), one = await seed(actor, "female");
    if (actor.kind !== "account") throw new Error("fixture actor");
    if (kind === "archive") await database.update(birthProfiles).set({deletedAt: at}).where(eq(birthProfiles.id, one.profileId));
    else await database.insert(deletionRequests).values({id: randomUUID(), userId: actor.userId, requestedAt: at, recoverUntil: expiry, purgeAfter: expiry});
    expect(await repo().prepare(actor, one.sourceId)).toEqual(unavailable);
    if (kind === "deletion-request") {
      await database.update(deletionRequests).set({status: "cancelled"}).where(eq(deletionRequests.userId, actor.userId));
      expect((await repo().prepare(actor, one.sourceId)).ok).toBe(true);
    }
  });
  it("refuses guest expiry during projection and invalid final clock", async () => {
    const guest = await owner(true), one = await seed(guest, "male"); let calls = 0;
    expect(await repo(() => ++calls === 1 ? at : expiry).prepare(guest, one.sourceId)).toEqual(unavailable); expect(calls).toBe(2);
    const actor = await owner(), two = await seed(actor, "female"); calls = 0;
    expect(await repo(() => ++calls === 1 ? at : new Date(NaN)).prepare(actor, two.sourceId)).toEqual(unavailable);
  });
  it("retains both real coordination locks through projection and final source read", async () => {
    const actor = await owner(), one = await seed(actor, "male"), original = baziModule.createDatabaseBaziSourceRepository;
    let checks = 0;
    const wrapped = vi.spyOn(baziModule, "createDatabaseBaziSourceRepository").mockImplementation((db, options) => {
      const actual = original(db, options); return {...actual, read: async (a, id) => {
        const result = await actual.read(a, id);
        for (const key of [FREE_AI_COORDINATION_LOCK, RECOVERY_CAPTURE_COORDINATION_LOCK]) {
          const [row] = await database.execute(sql`SELECT pg_try_advisory_xact_lock(hashtextextended(${key}, 0)) AS acquired`);
          expect(row?.acquired).toBe(false);
        }
        checks++; return result;
      }};
    });
    try {expect((await repo().prepare(actor, one.sourceId)).ok).toBe(true); expect(checks).toBe(2);}
    finally {wrapped.mockRestore();}
  });
  it.each(["expiry", "deletion"])("samples authority after a real coordinator wait for queued %s", async kind => {
    const actor = await owner(kind === "expiry"), one = await seed(actor, "male"); let current = at;
    let release!: () => void, ready!: () => void;
    const held = new Promise<void>(resolve => {release = resolve;}), started = new Promise<void>(resolve => {ready = resolve;});
    const holder = database.transaction(async tx => {await lockFreeAiCoordination(tx); ready(); await held;});
    await started;
    const queued = repo(() => current).prepare(actor, one.sourceId);
    try {
      let waiting = false;
      for (let i = 0; i < 100 && !waiting; i++) {
        const [row] = await database.execute(sql`SELECT EXISTS (SELECT 1 FROM pg_stat_activity WHERE datname = current_database() AND wait_event = 'advisory') AS waiting`);
        waiting = row?.waiting === true; if (!waiting) await new Promise(resolve => setTimeout(resolve, 10));
      }
      expect(waiting).toBe(true);
      if (kind === "expiry") current = expiry;
      else {if (actor.kind !== "account") throw new Error("fixture actor");
        await database.insert(deletionRequests).values({id: randomUUID(), userId: actor.userId, requestedAt: at, recoverUntil: expiry, purgeAfter: expiry});}
    } finally {release(); await holder;}
    expect(await queued).toEqual(unavailable);
  });
  it("transfers guest authority to the account without copying source records", async () => {
    const guest = await owner(true), account = await owner(), one = await seed(guest, "female");
    if (guest.kind !== "anonymous" || account.kind !== "account") throw new Error("fixture actor");
    const before = await database.select().from(baziSources);
    expect((await repo().prepare(guest, one.sourceId)).ok).toBe(true);
    vi.useFakeTimers({toFake: ["Date"]}); vi.setSystemTime(at);
    try {expect((await linkAnonymousActorToAccount(database, guest.anonymousActorId, account.userId)).ok).toBe(true);}
    finally {vi.useRealTimers();}
    expect(await repo().prepare(guest, one.sourceId)).toEqual(unavailable);
    expect((await repo().prepare(account, one.sourceId)).ok).toBe(true);
    expect(await database.select().from(baziSources)).toEqual(before);
  });
  it("does not bypass existing SQL immutability to substitute original gender or lineage", async () => {
    const actor = await owner(), one = await seed(actor, "male");
    const [revision] = await database.select().from(birthProfileRevisions).where(eq(birthProfileRevisions.id, one.revisionId));
    await expect(database.update(birthProfileRevisions).set({originalInput: {...revision!.originalInput, gender: "female"}})
      .where(eq(birthProfileRevisions.id, one.revisionId))).rejects.toThrow();
    await expect(database.update(baziSources).set({profileRevisionHash: "0".repeat(64)})
      .where(eq(baziSources.id, one.sourceId))).rejects.toThrow();
    expect((await repo().prepare(actor, one.sourceId)).ok).toBe(true);
  });
});
