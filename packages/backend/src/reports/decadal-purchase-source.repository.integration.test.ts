import { randomUUID } from "node:crypto";
import { PostgreSqlContainer } from "@testcontainers/postgresql";
import { eq, sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { type CurrentActor, NormalizedBirthProfileV1Schema } from "@lasoviet/contracts";
import { authUsers, birthProfiles, birthProfileRevisions, calculationRuns, createDatabase, deletionRequests,
  lockFreeAiCoordination, FREE_AI_COORDINATION_LOCK, RECOVERY_CAPTURE_COORDINATION_LOCK, runMigrations,
  ziweiCharts, ziweiChartVersions, walletTransactions, reportReservations } from "@lasoviet/database";
import { IztroAdapter, iztroDefaultConfig } from "@lasoviet/engine-adapters";
import { createDatabaseZiweiCalculationRepository } from "../ziwei/ziwei.repository.js";
import { createDatabaseDecadalPurchaseSourceRepository } from "./decadal-purchase-source.repository.js";
import * as sourceModule from "./decadal-reading-source.js";

const at = new Date("2026-10-09T08:00:00Z");
const unavailable = {ok: false, error: {code: "DECADAL_PURCHASE_SOURCE_UNAVAILABLE"}};
describe("actual PostgreSQL private decadal purchase-source admission", () => {
  let container: Awaited<ReturnType<PostgreSqlContainer["start"]>>;
  let db: ReturnType<typeof createDatabase>;
  beforeAll(async () => {
    container = await new PostgreSqlContainer("postgres:16-alpine").start();
    await runMigrations(container.getConnectionUri()); db = createDatabase(container.getConnectionUri());
  }, 120000);
  afterAll(async () => {await container?.stop();}, 30000);
  const repository = (clock: () => Date = () => at) => createDatabaseDecadalPurchaseSourceRepository(db, {clock});
  async function owner(verified = true): Promise<Extract<CurrentActor, {kind: "account"}>> {
    const userId = randomUUID();
    await db.insert(authUsers).values({id: userId, name: "Synthetic", email: `${userId}@example.test`, emailVerified: verified});
    return {kind: "account", userId, sessionId: "s", requestId: "r", emailVerified: true};
  }
  async function stored(actor: Extract<CurrentActor, {kind: "account"}>, options: {date?: string; unknown?: boolean; gender?: "male" | "female"} = {}) {
    const profileId = randomUUID(), revisionId = randomUUID();
    const calendar = {kind: "solar" as const, date: options.date ?? "1992-06-15"};
    const time = options.unknown ? {precision: "unknown" as const} : {precision: "exact_minute" as const, localTime: "08:30"};
    const birth = NormalizedBirthProfileV1Schema.parse({version: 1, originalInput: {version: 1, calendar, time,
      gender: options.gender ?? "male", timezone: {offsetMinutes: 420}, displayName: "PRIVATE_PERSON", consentVersion: "PRIVATE_CONSENT"},
      normalizedCalendar: calendar, normalizedTime: time, timezoneProvenance: {source: "offset", offsetMinutes: 420}, normalizationWarnings: [], limitations: []});
    const {originalInput, ...normalizedInput} = birth;
    await db.insert(birthProfiles).values({id: profileId, userId: actor.userId});
    await db.insert(birthProfileRevisions).values({id: revisionId, profileId, revisionNumber: 1, originalInput, normalizedInput, consentVersion: "PRIVATE_CONSENT", createdAt: at});
    const calculated = await new IztroAdapter().calculateWithPrivateSnapshot({birthProfile: birth}, iztroDefaultConfig);
    if (!calculated.result.ok || !calculated.rawSnapshot) throw new Error("Synthetic engine calculation failed");
    const chart = calculated.result.output, p = chart.provenance;
    const record = await createDatabaseZiweiCalculationRepository(db).create({profileId, revisionId, chart,
      rawSnapshot: calculated.rawSnapshot, idempotencyKey: [p.inputHash, p.engineVersion, p.adapterVersion, p.configHash].join(":"), now: at});
    return {...record, profileId, revisionId, chart};
  }
  const request = (s: {chartId: string; chartVersionId: string}, selection: "current" | "next" = "current") => ({chartId: s.chartId, chartVersionId: s.chartVersionId, selection});
  it.each(["male", "female"] as const)("binds the exact owned stored %s chart without writes or birth input leakage", async gender => {
    const actor = await owner(), s = await stored(actor, {gender});
    const runs = await db.select().from(calculationRuns), charts = await db.select().from(ziweiCharts);
    const result = await repository().prepare(actor, request(s)); if (!result.ok) throw new Error(result.error.code);
    expect(result.value).toMatchObject({source: {status: "draft_source", manualAccepted: false,
      lineage: {chartId: s.chartId, chartVersionId: s.chartVersionId}, chart: s.chart}});
    const cycle = result.value.source.cycle;
    expect(result.value.periodKey).toBe(`decade:${cycle.ordinal}:${cycle.startYear}:${cycle.endYear}`);
    expect(result.value.remainingYears).toBe(cycle.endYear - 2026);
    expect(await repository().prepare(actor, {...request(s), expectedPeriodKey: result.value.periodKey})).toEqual(result);
    expect(await db.select().from(calculationRuns)).toEqual(runs); expect(await db.select().from(ziweiCharts)).toEqual(charts);
    expect(await db.select().from(walletTransactions)).toHaveLength(0); expect(await db.select().from(reportReservations)).toHaveLength(0);
    for (const secret of [actor.userId, s.profileId, s.revisionId, "1992-06-15", "08:30", "PRIVATE_PERSON", "PRIVATE_CONSENT", "originalInput", "normalizedInput"])
      expect(JSON.stringify(result)).not.toContain(secret);
  });
  it("requires genuine current/next cycles and opens next exactly at approved R=3 to R=2", async () => {
    const actor = await owner(), s = await stored(actor), result = await repository().prepare(actor, request(s));
    if (!result.ok) throw new Error(result.error.code);
    const end = result.value.source.cycle.endYear;
    for (const remaining of [3, 2, 0]) {
      const clock = () => new Date(`${end - remaining}-10-09T08:00:00Z`);
      const next = await repository(clock).prepare(actor, request(s, "next"));
      if (remaining === 3) expect(next).toEqual(unavailable);
      else {if (!next.ok) throw new Error(next.error.code); expect(next.value).toMatchObject({remainingYears: remaining,
        source: {selection: "next", cycle: {ordinal: result.value.source.cycle.ordinal + 1, startYear: end + 1}}});}
    }
  });
  it("uses lunar Tet and actual cycle identity rather than civil New Year or stale expected keys", async () => {
    const actor = await owner(), s = await stored(actor);
    const read = (date: string, expectedPeriodKey?: string) => repository(() => new Date(`${date}T08:00:00Z`)).prepare(actor, {...request(s), expectedPeriodKey});
    const before = await read("2025-01-28"), after = await read("2025-01-29");
    if (!before.ok || !after.ok) throw new Error("Expected real Tet sources");
    expect(before.value.source.lunarYear).toBe(2024); expect(after.value.source.lunarYear).toBe(2025);
    expect(after.value.source.cycle.ordinal).toBe(before.value.source.cycle.ordinal + 1);
    expect(await read("2025-01-29", before.value.periodKey)).toEqual(unavailable);
    const jan = await read("2027-01-01"), tetBefore = await read("2027-02-05"), tetAfter = await read("2027-02-06");
    if (!jan.ok || !tetBefore.ok || !tetAfter.ok) throw new Error("Expected lunar boundary sources");
    expect([jan.value.source.lunarYear, tetBefore.value.source.lunarYear, tetAfter.value.source.lunarYear]).toEqual([2026, 2026, 2027]);
  });
  it("refuses foreign/missing/swapped chart versions with the same generic result", async () => {
    const actor = await owner(), foreign = await owner(), one = await stored(actor), two = await stored(foreign);
    for (const input of [request(two), {...request(one), chartVersionId: two.chartVersionId}, {...request(one), chartId: randomUUID()}, {...request(one), chartVersionId: randomUUID()}])
      expect(await repository().prepare(actor, input)).toEqual(unavailable);
  });
  it("uses actual verified non-anonymous account authority rather than the actor claim", async () => {
    const actor = await owner(false), s = await stored(actor);
    expect(await repository().prepare(actor, request(s))).toEqual(unavailable);
    await db.update(authUsers).set({emailVerified: true, isAnonymous: true}).where(eq(authUsers.id, actor.userId));
    expect(await repository().prepare(actor, request(s))).toEqual(unavailable);
    expect(await repository().prepare({kind: "anonymous", anonymousActorId: actor.userId, expiresAt: "2099-01-01T00:00:00Z", sessionId: "s", requestId: "r"}, request(s))).toEqual(unavailable);
  });
  it.each(["requested", "purged", "cancelled"] as const)("retains the account deletion boundary for %s", async status => {
    const actor = await owner(), s = await stored(actor);
    await db.insert(deletionRequests).values({id: randomUUID(), userId: actor.userId, status, requestedAt: at, recoverUntil: at, purgeAfter: at});
    const result = await repository().prepare(actor, request(s)); expect(result.ok).toBe(status === "cancelled");
    if (status !== "cancelled") expect(result).toEqual(unavailable);
  });
  it("refuses deleted profiles and stored revision/run/provenance substitution", async () => {
    const actor = await owner(), s = await stored(actor), other = await stored(actor, {date: "1994-05-20"});
    await db.update(birthProfiles).set({deletedAt: at}).where(eq(birthProfiles.id, s.profileId));
    expect(await repository().prepare(actor, request(s))).toEqual(unavailable);
    await db.update(birthProfiles).set({deletedAt: null}).where(eq(birthProfiles.id, s.profileId));
    const [version] = await db.select().from(ziweiChartVersions).where(eq(ziweiChartVersions.id, s.chartVersionId));
    await db.update(calculationRuns).set({profileId: other.profileId, profileRevisionId: other.revisionId}).where(eq(calculationRuns.id, version!.calculationRunId));
    expect(await repository().prepare(actor, request(s))).toEqual(unavailable);
    await db.update(calculationRuns).set({profileId: s.profileId, profileRevisionId: s.revisionId}).where(eq(calculationRuns.id, version!.calculationRunId));
    await db.update(ziweiChartVersions).set({provenance: {...s.chart.provenance, configHash: "a".repeat(64)}}).where(eq(ziweiChartVersions.id, s.chartVersionId));
    expect(await repository().prepare(actor, request(s))).toEqual(unavailable);
    await db.update(ziweiChartVersions).set({provenance: s.chart.provenance}).where(eq(ziweiChartVersions.id, s.chartVersionId));
    await db.update(birthProfileRevisions).set({normalizedInput: {version: 1}}).where(eq(birthProfileRevisions.id, s.revisionId));
    expect(await repository().prepare(actor, request(s))).toEqual(unavailable);
  });
  it("rejects self-consistent normalized output tampering via actual pinned recalculation", async () => {
    const actor = await owner(), s = await stored(actor), changed = structuredClone(s.chart);
    changed.palaces[0]!.stars[0]!.brightness = "ziwei.brightness.neutral";
    await db.update(ziweiChartVersions).set({normalizedOutput: changed}).where(eq(ziweiChartVersions.id, s.chartVersionId));
    expect(await repository().prepare(actor, request(s))).toEqual(unavailable);
  });
  it("refuses unknown precision and pre-first/last-next cycles rather than guessing", async () => {
    const actor = await owner(), unknown = await stored(actor, {unknown: true}), young = await stored(actor, {date: "2026-01-01"}), old = await stored(actor, {date: "1980-06-15"});
    expect(await repository().prepare(actor, request(unknown))).toEqual(unavailable);
    expect(await repository(() => new Date("2026-01-15T08:00:00Z")).prepare(actor, request(young))).toEqual(unavailable);
    expect(await repository(() => new Date("2099-10-09T08:00:00Z")).prepare(actor, request(old, "next"))).toEqual(unavailable);
  });
  it("samples the clock after queued locks, including a real Vietnam midnight/Tet boundary", async () => {
    const actor = await owner(), s = await stored(actor);
    let current = new Date("2027-02-05T16:59:59Z");
    let release!: () => void, started!: () => void;
    const held = new Promise<void>(r => started = r), gate = new Promise<void>(r => release = r);
    const holder = db.transaction(async tx => {await lockFreeAiCoordination(tx); started(); await gate;});
    await held;
    let calls = 0;
    const pending = repository(() => {calls++; return current;}).prepare(actor, request(s));
    await vi.waitFor(async () => {
      const rows = await db.execute(sql`SELECT 1 FROM pg_stat_activity WHERE wait_event='advisory' AND query LIKE '%pg_advisory_xact_lock%'`);
      expect(rows.length).toBeGreaterThan(0);
    });
    expect(calls).toBe(0); current = new Date("2027-02-05T17:00:00Z"); release(); await holder;
    const result = await pending; if (!result.ok) throw new Error(result.error.code);
    expect(result.value.source).toMatchObject({asOfDate: "2027-02-06", lunarYear: 2027});
  });
  it("rechecks verification after a lifecycle lock wait", async () => {
    const actor = await owner(), s = await stored(actor);
    let release!: () => void, started!: () => void;
    const held = new Promise<void>(r => started = r), gate = new Promise<void>(r => release = r);
    const holder = db.transaction(async tx => {await lockFreeAiCoordination(tx); await tx.update(authUsers).set({emailVerified: false}).where(eq(authUsers.id, actor.userId)); started(); await gate;});
    await held; const pending = repository().prepare(actor, request(s));
    await vi.waitFor(async () => {const rows = await db.execute(sql`SELECT 1 FROM pg_stat_activity WHERE wait_event='advisory' AND query LIKE '%pg_advisory_xact_lock%'`); expect(rows.length).toBeGreaterThan(0);});
    release(); await holder; expect(await pending).toEqual(unavailable);
  });
  it("retains both lifecycle locks throughout actual source calculation, then releases them", async () => {
    const actor = await owner(), s = await stored(actor), original = sourceModule.buildDecadalReadingSource;
    const spy = vi.spyOn(sourceModule, "buildDecadalReadingSource").mockImplementation(async input => {
      for (const key of [FREE_AI_COORDINATION_LOCK, RECOVERY_CAPTURE_COORDINATION_LOCK]) {
        const rows = await db.transaction(tx => tx.execute<{acquired: boolean}>(sql`SELECT pg_try_advisory_xact_lock(hashtextextended(${key},0)) AS acquired`));
        expect(rows[0]!.acquired).toBe(false);
      }
      return original(input);
    });
    try {expect((await repository().prepare(actor, request(s))).ok).toBe(true);} finally {spy.mockRestore();}
    for (const key of [FREE_AI_COORDINATION_LOCK, RECOVERY_CAPTURE_COORDINATION_LOCK]) {
      const rows = await db.transaction(tx => tx.execute<{acquired: boolean}>(sql`SELECT pg_try_advisory_xact_lock(hashtextextended(${key},0)) AS acquired`));
      expect(rows[0]!.acquired).toBe(true);
    }
  });
  it("refuses date changes during calculation, invalid clocks and stale selected period keys", async () => {
    const actor = await owner(), s = await stored(actor); let calls = 0;
    expect(await repository(() => new Date(calls++ ? "2026-10-09T17:00:00Z" : "2026-10-09T16:59:59Z")).prepare(actor, request(s))).toEqual(unavailable);
    expect(await repository(() => new Date("invalid")).prepare(actor, request(s))).toEqual(unavailable);
    expect(await repository().prepare(actor, {...request(s), expectedPeriodKey: "decade:0:1900:1909"})).toEqual(unavailable);
  });
});
