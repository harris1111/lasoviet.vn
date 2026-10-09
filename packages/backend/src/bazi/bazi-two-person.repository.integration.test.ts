import { randomUUID } from "node:crypto";
import { PostgreSqlContainer } from "@testcontainers/postgresql";
import { eq, sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { BaziTwoPersonSourceV1Schema, type CurrentActor, type NormalizedBirthProfileV1 } from "@lasoviet/contracts";
import { authAnonymousActors, authUsers, baziSources, birthProfileRevisions, birthProfiles, calculationRuns,
  createDatabase, deletionRequests, FREE_AI_COORDINATION_LOCK, lockFreeAiCoordination, runMigrations } from "@lasoviet/database";
import { linkAnonymousActorToAccount } from "@lasoviet/database/runtime";
import { baziTenGod } from "@lasoviet/engine-adapters";
import { createDatabaseBaziSourceRepository } from "./bazi-source.repository.js";
import * as baziSourceModule from "./bazi-source.repository.js";
import { createDatabaseBaziTwoPersonRepository } from "./bazi-two-person.repository.js";
const at = new Date("2026-10-09T08:00:00Z"), expiry = new Date(at.getTime() + 24 * 3600000);
const unavailable = {ok: false, error: {code: "BAZI_TWO_PERSON_UNAVAILABLE"}};
describe("actual PostgreSQL owner-bound two-person Bazi preparation", () => {
  let container: Awaited<ReturnType<PostgreSqlContainer["start"]>>;
  let database: ReturnType<typeof createDatabase>;
  beforeAll(async () => {
    container = await new PostgreSqlContainer("postgres:16-alpine").start();
    await runMigrations(container.getConnectionUri()); database = createDatabase(container.getConnectionUri());
  }, 120000);
  afterAll(async () => {await container?.stop();}, 30000);
  async function owner(anonymous = false): Promise<CurrentActor> {
    const id = randomUUID();
    if (anonymous) {
      await database.insert(authAnonymousActors).values({id, expiresAt: expiry});
      return {kind: "anonymous", anonymousActorId: id, expiresAt: expiry.toISOString(), sessionId: "s", requestId: "r"};
    }
    await database.insert(authUsers).values({id, name: "Synthetic", email: `${id}@example.test`, emailVerified: true});
    return {kind: "account", userId: id, sessionId: "s", requestId: "r"};
  }
  async function source(actor: CurrentActor, unknown = false, date = "1992-06-15", profileId = randomUUID()) {
    const exists = await database.select({id: birthProfiles.id}).from(birthProfiles).where(eq(birthProfiles.id, profileId));
    if (!exists.length) await database.insert(birthProfiles).values({id: profileId,
      ...(actor.kind === "account" ? {userId: actor.userId} : {anonymousActorId: actor.anonymousActorId, anonymousExpiresAt: expiry})});
    const time = unknown ? {precision: "unknown" as const} : {precision: "exact_minute" as const, localTime: "08:30"};
    const calendar = {kind: "solar" as const, date};
    const profile: NormalizedBirthProfileV1 = {version: 1,
      originalInput: {version: 1, calendar, time, timezone: {offsetMinutes: 420}, displayName: "PRIVATE_PERSON", placeLabel: "PRIVATE_PLACE", consentVersion: "PRIVATE_CONSENT"},
      normalizedCalendar: calendar, normalizedTime: time, timezoneProvenance: {source: "offset", offsetMinutes: 420}, normalizationWarnings: [], limitations: []};
    const {originalInput, ...normalizedInput} = profile;
    const revisionId = randomUUID();
    const revisions = await database.select({id: birthProfileRevisions.id}).from(birthProfileRevisions).where(eq(birthProfileRevisions.profileId, profileId));
    await database.insert(birthProfileRevisions).values({id: revisionId, profileId, revisionNumber: revisions.length + 1,
      originalInput, normalizedInput, consentVersion: "synthetic", createdAt: at});
    const calculated = await createDatabaseBaziSourceRepository(database, {clock: () => at}).calculate(actor, revisionId);
    if (!calculated.ok) throw new Error(calculated.error.code);
    return {...calculated.value, profileId, revisionId};
  }
  const repository = (clock: () => Date = () => at) => createDatabaseBaziTwoPersonRepository(database, {clock});
  const input = (one: {sourceId: string}, two: {sourceId: string}) => ({primarySourceId: one.sourceId, counterpartSourceId: two.sourceId});
  it("binds ordered real sources, all known cross-pillar evidence and absent counterpart hour without new records", async () => {
    const actor = await owner(), one = await source(actor), two = await source(actor, true, "1994-05-20");
    const beforeSources = await database.select().from(baziSources), beforeRuns = await database.select().from(calculationRuns);
    const result = await repository().prepare(actor, input(one, two));
    if (!result.ok) throw new Error(result.error.code);
    expect(result.value).toMatchObject({status: "draft_source", manualAccepted: false,
      primary: {sourceId: one.sourceId, chart: one.chart}, counterpart: {sourceId: two.sourceId, chart: two.chart}});
    expect(result.value.counterpart.chart.facts.pillars.hour).toBeNull();
    expect(result.value.counterpart.chart.structure.visibleElementInventory).toMatchObject({complete: false, characterCount: 6});
    expect(result.value.relations).toHaveLength(7);
    expect(result.value.relations.some(row => row.referenceRole === "primary" && row.relativePillar === "hour")).toBe(false);
    for (const row of result.value.relations) {
      const reference = result.value[row.referenceRole].chart;
      const other = result.value[row.referenceRole === "primary" ? "counterpart" : "primary"].chart;
      const target = row.relativePillar === "hour" ? other.facts.pillars.hour : other.facts.pillars[row.relativePillar][row.relativeVariant];
      expect(target).not.toBeNull();
      expect(row.stemTenGod).toBe(baziTenGod(reference.facts.pillars.day[row.dayVariant]!.stemId, target!.stemId));
      expect(row.hiddenStems.map(value => value.stemId)).toEqual(target!.hiddenStemIds);
      expect(row.evidenceKeys).toEqual([`${row.referenceRole}.${reference.facts.evidence.find(e => e.pillar === "day" && e.variant === row.dayVariant)!.key}`,
        `${row.referenceRole === "primary" ? "counterpart" : "primary"}.${other.facts.evidence.find(e => e.pillar === row.relativePillar && e.variant === row.relativeVariant)!.key}`]);
    }
    expect(await repository().prepare(actor, input(one, two))).toEqual(result);
    expect(await database.select().from(baziSources)).toEqual(beforeSources); expect(await database.select().from(calculationRuns)).toEqual(beforeRuns);
    for (const secret of [actor.kind === "account" ? actor.userId : "", one.profileId, one.revisionId, two.profileId, "1992-06-15", "1994-05-20", "08:30", "PRIVATE_PERSON", "PRIVATE_PLACE", "PRIVATE_CONSENT", "resolvedInput", "originalInput", "compatibilityScore"])
      if (secret) expect(JSON.stringify(result)).not.toContain(secret);
  });
  it("retains actual solar-term alternatives and partial inventory rather than choosing a pillar or hour", async () => {
    const actor = await owner(), one = await source(actor, true), two = await source(actor, true, "2024-02-04");
    const result = await repository().prepare(actor, input(one, two)); if (!result.ok) throw new Error(result.error.code);
    expect(result.value.counterpart.chart.structure.uncertainty).toMatchObject({hourMissing: true, pillarAlternatives: true});
    expect(result.value.counterpart.chart.structure.visibleElementInventory).toBeNull();
    expect(result.value.counterpart.chart.facts.pillars.year).toHaveLength(2);
    expect(result.value.relations.filter(row => row.referenceRole === "primary" && row.relativePillar === "year")).toHaveLength(2);
    expect(result.value.relations.some(row => row.relativePillar === "hour")).toBe(false);
    const swapped = await repository().prepare(actor, input(two, one)); if (!swapped.ok) throw new Error(swapped.error.code);
    expect(swapped.value.sourceHash).not.toBe(result.value.sourceHash);
    expect(swapped.value.primary.sourceId).toBe(two.sourceId);
  });
  it("does not treat IDs, a foreign source or equal birth inputs as account access", async () => {
    const actor = await owner(), foreign = await owner(); const one = await source(actor), two = await source(foreign, true);
    expect(await repository().prepare(actor, input(one, two))).toEqual(unavailable);
    expect(await repository().prepare(foreign, input(one, two))).toEqual(unavailable);
    expect(await repository().prepare(actor, input(two, one))).toEqual(unavailable);
    expect(await repository().prepare(actor, {...input(one, two), counterpartSourceId: "missing"})).toEqual(unavailable);
  });
  it("refuses the same source, two revisions of one profile, and a counterpart with a known hour", async () => {
    const actor = await owner(), one = await source(actor), two = await source(actor, true, "1994-05-20", one.profileId), exact = await source(actor);
    expect(await repository().prepare(actor, input(one, one))).toEqual(unavailable);
    expect(await repository().prepare(actor, input(one, two))).toEqual(unavailable);
    expect(await repository().prepare(actor, input(one, exact))).toEqual(unavailable);
  });
  it.each(["archive", "delete", "deletion-request"])("refuses %s without a stale comparison projection", async kind => {
    const actor = await owner(), one = await source(actor), two = await source(actor, true);
    if (kind === "archive") await database.update(birthProfiles).set({deletedAt: at}).where(eq(birthProfiles.id, two.profileId));
    if (kind === "delete") await database.delete(birthProfiles).where(eq(birthProfiles.id, two.profileId));
    if (kind === "deletion-request" && actor.kind === "account") await database.insert(deletionRequests).values({id: randomUUID(), userId: actor.userId, status: "requested", requestedAt: at, recoverUntil: at, purgeAfter: at});
    expect(await repository().prepare(actor, input(one, two))).toEqual(unavailable);
  });
  it.each(["profile", "actor", "claim"])("rechecks the %s deadline after both successful locked source reads", async kind => {
    const actor = await owner(true), one = await source(actor), two = await source(actor, true);
    const earlier = new Date(at.getTime() + 1000);
    if (kind === "profile") await database.update(birthProfiles).set({anonymousExpiresAt: earlier}).where(eq(birthProfiles.id, one.profileId));
    if (actor.kind !== "anonymous") throw new Error("fixture actor");
    if (kind === "actor") await database.update(authAnonymousActors).set({expiresAt: earlier}).where(eq(authAnonymousActors.id, actor.anonymousActorId));
    const caller = kind === "claim" ? {...actor, expiresAt: earlier.toISOString()} : actor;
    let clocks = 0;
    expect(await repository(() => ++clocks < 3 ? at : earlier).prepare(caller, input(one, two))).toEqual(unavailable);
    expect(clocks).toBe(3);
    expect((await repository().prepare(actor, input(one, two))).ok).toBe(true);
  });
  it("uses the post-coordinator-wait clock at exact guest expiry", async () => {
    const actor = await owner(true), one = await source(actor), two = await source(actor, true);
    let release!: () => void, locked!: () => void;
    const acquired = new Promise<void>(resolve => {locked = resolve;}), gate = new Promise<void>(resolve => {release = resolve;});
    const holder = database.transaction(async tx => {await lockFreeAiCoordination(tx); locked(); await gate;});
    await acquired; let current = at;
    const queued = repository(() => current).prepare(actor, input(one, two));
    try {
      let waiting = false;
      for (let i = 0; i < 100 && !waiting; i++) {
        const [row] = await database.execute(sql`SELECT EXISTS (SELECT 1 FROM pg_stat_activity WHERE datname = current_database() AND wait_event = 'advisory') AS waiting`);
        waiting = row?.waiting === true;
        if (!waiting) await new Promise(resolve => setTimeout(resolve, 10));
      }
      expect(waiting).toBe(true); current = expiry;
    } finally {release(); await holder;}
    expect(await queued).toEqual(unavailable);
  });
  it("transfers source ownership on account linking without copying or accepting the old guest", async () => {
    const guest = await owner(true), account = await owner(), one = await source(guest), two = await source(guest, true);
    if (guest.kind !== "anonymous" || account.kind !== "account") throw new Error("fixture actor");
    expect((await repository().prepare(guest, input(one, two))).ok).toBe(true);
    const before = await database.select().from(baziSources);
    vi.useFakeTimers({toFake: ["Date"]}); vi.setSystemTime(at);
    try {expect((await linkAnonymousActorToAccount(database, guest.anonymousActorId, account.userId)).ok).toBe(true);}
    finally {vi.useRealTimers();}
    expect(await repository().prepare(guest, input(one, two))).toEqual(unavailable);
    expect((await repository().prepare(account, input(one, two))).ok).toBe(true);
    expect(await database.select().from(baziSources)).toEqual(before);
  });
  it("retains the actual coordination locks after each nested source read until outer transaction commits", async () => {
    const actor = await owner(), one = await source(actor), two = await source(actor, true);
    const original = baziSourceModule.createDatabaseBaziSourceRepository;
    let checked = 0;
    const wrapped = vi.spyOn(baziSourceModule, "createDatabaseBaziSourceRepository").mockImplementation((db, options) => {
      const actual = original(db, options);
      return {...actual, read: async (currentActor, sourceId) => {
        const result = await actual.read(currentActor, sourceId);
        const [row] = await database.execute(sql`SELECT pg_try_advisory_xact_lock(hashtextextended(${FREE_AI_COORDINATION_LOCK}, 0)) AS acquired`);
        expect(row?.acquired).toBe(false); checked++;
        return result;
      }};
    });
    try {expect((await repository().prepare(actor, input(one, two))).ok).toBe(true); expect(checked).toBe(2);}
    finally {wrapped.mockRestore();}
    const [released] = await database.execute(sql`SELECT pg_try_advisory_xact_lock(hashtextextended(${FREE_AI_COORDINATION_LOCK}, 0)) AS acquired`);
    expect(released?.acquired).toBe(true);
  });
  it("its closed contract rejects fabricated acceptance, swapped lineage, omitted evidence and invented counterpart hour", async () => {
    const actor = await owner(), one = await source(actor), two = await source(actor, true);
    const result = await repository().prepare(actor, input(one, two)); if (!result.ok) throw new Error(result.error.code);
    for (const candidate of [{...result.value, manualAccepted: true}, {...result.value, compatibilityScore: 90},
      {...result.value, primary: {...result.value.primary, calculationKey: "other"}}, {...result.value, counterpart: result.value.primary},
      {...result.value, relations: result.value.relations.slice(1)}, {...result.value, relations: [...result.value.relations.slice(1), result.value.relations[1]]}])
      expect(BaziTwoPersonSourceV1Schema.safeParse(candidate).success).toBe(false);
  });
});
