import { PostgreSqlContainer } from "@testcontainers/postgresql";
import { eq, sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { BirthCalendarInput, BirthTimeInput, BirthTimezoneInput, CurrentActor, NormalizedBirthProfileV1 } from "@lasoviet/contracts";
import { authAnonymousActors, authUsers, baziSources, birthProfileRevisions, birthProfiles, calculationRuns,
  createDatabase, deletionRequests, lockFreeAiCoordination, runMigrations, ziweiCharts } from "@lasoviet/database";
import { linkAnonymousActorToAccount } from "@lasoviet/database/runtime";
import { calculateNormalizedBaziChart, IztroAdapter, iztroDefaultConfig } from "@lasoviet/engine-adapters";
import { createDatabaseZiweiCalculationRepository } from "../ziwei/ziwei.repository.js";
import { createDatabaseZiweiQueryRepository } from "../ziwei/ziwei-query.repository.js";
import { createDatabaseAnonymousRetentionRepository } from "../privacy/anonymous-retention.repository.js";
import { createDatabaseBaziSourceRepository } from "./bazi-source.repository.js";

const at = new Date("2026-10-09T07:00:00Z"), expiry = new Date("2099-01-01T00:00:00Z");
function profile(calendar: BirthCalendarInput = {kind: "solar", date: "1992-06-15"},
  time: BirthTimeInput = {precision: "exact_minute", localTime: "08:30"},
  timezone: BirthTimezoneInput = {offsetMinutes: 420}): NormalizedBirthProfileV1 {
  return {version: 1, originalInput: {version: 1, calendar, time, timezone, consentVersion: "synthetic",
    displayName: "PRIVATE_DISPLAY", placeLabel: "PRIVATE_PLACE", gender: "male"}, normalizedCalendar: calendar, normalizedTime: time,
    timezoneProvenance: timezone.offsetMinutes !== undefined ? {source: "offset", offsetMinutes: timezone.offsetMinutes}
      : {source: "iana", ianaZone: timezone.ianaZone!, runtime: "Intl"}, normalizationWarnings: [], limitations: []};
}
const unavailable = {ok: false, error: {code: "BAZI_SOURCE_UNAVAILABLE"}};
describe("authorized immutable Bazi source on PostgreSQL", () => {
  let container: Awaited<ReturnType<PostgreSqlContainer["start"]>>;
  let database: ReturnType<typeof createDatabase>;
  let sequence = 0;
  beforeAll(async () => {
    container = await new PostgreSqlContainer("postgres:16-alpine").withDatabase("bazi_source_test")
      .withUsername("lasoviet").withPassword("lasoviet").start();
    await runMigrations(container.getConnectionUri());
    database = createDatabase(container.getConnectionUri());
  }, 120_000);
  afterAll(async () => { if (container) await container.stop(); }, 30_000);
  async function seed(p = profile(), anonymous = false) {
    const id = `bazi-fixture-${++sequence}`, owner = `${id}-owner`, revisionId = `${id}-revision`;
    await database.insert(authUsers).values({id: owner, name: "Synthetic", email: `${owner}@example.test`, isAnonymous: anonymous});
    if (anonymous) await database.insert(authAnonymousActors).values({id: owner, expiresAt: expiry});
    await database.insert(birthProfiles).values({id, ...(anonymous ? {anonymousActorId: owner, anonymousExpiresAt: expiry} : {userId: owner})});
    const {originalInput, ...normalizedInput} = p;
    await database.insert(birthProfileRevisions).values({id: revisionId, profileId: id, revisionNumber: 1,
      originalInput, normalizedInput, normalizationWarnings: [], limitations: [], consentVersion: "synthetic", createdAt: at});
    const actor: CurrentActor = anonymous ? {kind: "anonymous", anonymousActorId: owner, expiresAt: expiry.toISOString(), sessionId: "s", requestId: "r"}
      : {kind: "account", userId: owner, sessionId: "s", requestId: "r"};
    return {id, owner, revisionId, actor};
  }
  function repo(clock: () => Date = () => at) { return createDatabaseBaziSourceRepository(database, {clock}); }
  async function calculated(f: Awaited<ReturnType<typeof seed>>) {
    const result = await repo().calculate(f.actor, f.revisionId);
    expect(result.ok).toBe(true); if (!result.ok) throw new Error("expected source"); return result.value;
  }
  it("upgrades an actual migration-0065 database without changing existing Ziwei metadata", async () => {
    // This owned test database has no Bazi sources yet. Recreate the exact preceding
    // migration boundary and preserve an existing revision and Ziwei run across replay.
    const f = await seed();
    const run = {id: `${f.id}-ziwei-run`, profileId: f.id, profileRevisionId: f.revisionId,
      idempotencyKey: "historical-ziwei", engineId: "ziwei.iztro", engineVersion: "2.6.0",
      adapterId: "ziwei.iztro-adapter", adapterVersion: "1", schemaId: "ziwei.chart.v1",
      ruleSetId: "ziwei.default", inputHash: "a".repeat(64), configHash: "b".repeat(64), rawSnapshotHash: "c".repeat(64), createdAt: at};
    await database.insert(calculationRuns).values(run);
    const before = await database.select().from(birthProfileRevisions).where(eq(birthProfileRevisions.id, f.revisionId));
    await database.execute(sql`DROP TRIGGER bazi_run_input_immutable ON calculation_runs`);
    await database.execute(sql`DROP TRIGGER bazi_profile_input_immutable ON birth_profile_revisions`);
    await database.execute(sql`DROP TABLE bazi_sources`);
    await database.execute(sql`DROP FUNCTION enforce_bazi_source_binding()`);
    await database.execute(sql`DROP FUNCTION prevent_bazi_source_mutation()`);
    await database.execute(sql`DROP FUNCTION preserve_bazi_referenced_input()`);
    await database.execute(sql`DELETE FROM drizzle.__drizzle_migrations WHERE created_at > 1791478800000`);
    const migrated = await runMigrations(container.getConnectionUri());
    expect((await runMigrations(container.getConnectionUri())).appliedMigrations).toEqual(migrated.appliedMigrations);
    expect(await database.select().from(calculationRuns).where(eq(calculationRuns.id, run.id))).toEqual([run]);
    expect(await database.select().from(birthProfileRevisions).where(eq(birthProfileRevisions.id, f.revisionId))).toEqual(before);
    await database.update(calculationRuns).set({adapterVersion: "historical-edit"}).where(eq(calculationRuns.id, run.id));
    expect((await calculated(f)).chart.systemId).toBe("bazi");
    expect(await database.select().from(calculationRuns).where(eq(calculationRuns.profileRevisionId, f.revisionId))).toHaveLength(2);
  });
  it("uses one immutable source/run for concurrent requests and reuses its original timestamp", async () => {
    const f = await seed();
    const results = await Promise.all(Array.from({length: 6}, () => repo().calculate(f.actor, f.revisionId)));
    expect(results.every(r => r.ok)).toBe(true);
    const values = results.flatMap(r => r.ok ? [r.value] : []);
    expect(new Set(values.map(v => v.sourceId)).size).toBe(1); expect(values.filter(v => !v.reused)).toHaveLength(1);
    expect(await database.select().from(baziSources).where(eq(baziSources.profileRevisionId, f.revisionId))).toHaveLength(1);
    expect(await database.select().from(calculationRuns).where(eq(calculationRuns.profileRevisionId, f.revisionId))).toHaveLength(1);
    const later = await repo(() => new Date(at.getTime() + 60000)).calculate(f.actor, f.revisionId);
    expect(later).toEqual({ok: true, value: {...values[0], reused: true}});
    const projection = JSON.stringify(values);
    for (const secret of [f.owner, f.revisionId, "1992-06-15", "08:30", "PRIVATE_DISPLAY", "PRIVATE_PLACE", "resolvedInput", "originalInput"])
      expect(projection).not.toContain(secret);
  });
  it("isolates equal input between owners and coexists with Ziwei storage", async () => {
    const a = await seed(), b = await seed(), one = await calculated(a), two = await calculated(b);
    expect(one.chart).toEqual(two.chart); expect(one.sourceId).not.toBe(two.sourceId);
    vi.useFakeTimers({toFake: ["Date"]}); vi.setSystemTime(at);
    let calculation: Awaited<ReturnType<IztroAdapter["calculateWithPrivateSnapshot"]>>;
    try { calculation = await new IztroAdapter().calculateWithPrivateSnapshot({birthProfile: profile()}, iztroDefaultConfig); }
    finally {vi.useRealTimers();}
    if (!calculation.result.ok || !calculation.rawSnapshot) throw new Error("expected actual Iztro source");
    const ziwei = createDatabaseZiweiCalculationRepository(database);
    const input = {profileId: a.id, revisionId: a.revisionId, idempotencyKey: "actual-iztro-coexistence",
      chart: calculation.result.output, rawSnapshot: calculation.rawSnapshot, now: at};
    const first = await ziwei.create(input);
    expect(await ziwei.create(input)).toEqual({...first, reused: true});
    const read = await createDatabaseZiweiQueryRepository(database).readAuthorizedChart(a.actor, first.chartId, at);
    expect(read?.chartVersionId).toBe(first.chartVersionId); expect(read?.normalizedOutput).toEqual(input.chart);
    expect(await repo().read(a.actor, one.sourceId)).toEqual({ok: true, value: {...one, reused: true}});
    expect(await database.select().from(calculationRuns).where(eq(calculationRuns.profileRevisionId, a.revisionId))).toHaveLength(2);
    expect(await repo().read(b.actor, one.sourceId)).toEqual(unavailable);
    expect(await repo().calculate(b.actor, a.revisionId)).toEqual(unavailable);
    expect((await database.select().from(ziweiCharts).where(eq(ziweiCharts.profileId, a.id)))).toHaveLength(1);
  });
  it.each(["source", "run", "revision"])("rejects SQL mutation of a referenced %s", async kind => {
    const f = await seed(), s = await calculated(f);
    if (kind === "source") await expect(database.update(baziSources).set({profileRevisionHash: "0".repeat(64)}).where(eq(baziSources.id, s.sourceId))).rejects.toThrow();
    if (kind === "run") await expect(database.update(calculationRuns).set({engineVersion: "other"}).where(eq(calculationRuns.profileRevisionId, f.revisionId))).rejects.toThrow();
    if (kind === "revision") await expect(database.update(birthProfileRevisions).set({originalInput: {tampered: true}}).where(eq(birthProfileRevisions.id, f.revisionId))).rejects.toThrow();
    expect((await repo().read(f.actor, s.sourceId)).ok).toBe(true);
  });
  it("rejects SQL run/profile swaps and missing snapshot identity fields", async () => {
    const f = await seed(), other = await seed(), s = await calculated(f);
    const otherSource = await calculated(other);
    const [otherRow] = await database.select().from(baziSources).where(eq(baziSources.id, otherSource.sourceId));
    const [row] = await database.select().from(baziSources).where(eq(baziSources.id, s.sourceId));
    if (!row || !otherRow) throw new Error("source missing");
    for (const swap of [{profileId: other.id}, {profileRevisionId: other.revisionId},
      {calculationRunId: otherRow.calculationRunId}, {normalizedOutput: {} as typeof row.normalizedOutput}]) {
      await database.delete(baziSources).where(eq(baziSources.id, s.sourceId));
      await expect(database.insert(baziSources).values({...row, ...swap})).rejects.toThrow();
      await database.insert(baziSources).values(row);
    }
  });
  it.each(["mapping", "profile-hash", "snapshot", "vendor-substitution"])("detects stored %s corruption on read and reuse", async kind => {
    const f = await seed(), s = await calculated(f);
    await database.execute(sql`ALTER TABLE bazi_sources DISABLE TRIGGER bazi_source_immutable`);
    try {
      if (kind === "mapping") await database.update(baziSources).set({resolvedInput: {localSolarDate: "1993-06-15", localTime: "08:30", offsetMinutes: 420}}).where(eq(baziSources.id, s.sourceId));
      if (kind === "profile-hash") await database.update(baziSources).set({profileRevisionHash: "0".repeat(64)}).where(eq(baziSources.id, s.sourceId));
      if (kind === "snapshot") await database.update(baziSources).set({normalizedOutput: {...s.chart, provisional: true}}).where(eq(baziSources.id, s.sourceId));
      if (kind === "vendor-substitution") await database.update(baziSources).set({normalizedOutput: calculateNormalizedBaziChart({localSolarDate: "1993-06-15", localTime: "08:30", offsetMinutes: 420}, at)}).where(eq(baziSources.id, s.sourceId));
    } finally { await database.execute(sql`ALTER TABLE bazi_sources ENABLE TRIGGER bazi_source_immutable`); }
    const invalid = {ok: false, error: {code: "BAZI_SOURCE_INVALID"}};
    expect(await repo().read(f.actor, s.sourceId)).toEqual(invalid); expect(await repo().calculate(f.actor, f.revisionId)).toEqual(invalid);
  });
  it("keeps genuine leap calendar and unknown hour, and supports a unique IANA instant", async () => {
    const lunar = await seed(profile({kind: "lunar", date: "2023-02-01", isLeapMonth: true}, {precision: "unknown"}));
    const source = await calculated(lunar); expect(source.chart.facts.pillars.hour).toBeNull();
    expect(source.chart.structure.visibleElementInventory?.characterCount).toBe(6);
    const iana = await seed(profile(undefined, undefined, {ianaZone: "Asia/Ho_Chi_Minh"}));
    expect((await calculated(iana)).chart).toEqual((await calculated(await seed())).chart);
  });
  it.each([
    {p: profile(undefined, {precision: "branch_only", branch: "chen"}), code: "BAZI_PROFILE_TIME_PRECISION_UNSUPPORTED"},
    {p: profile({kind: "solar", date: "2024-03-10"}, {precision: "exact_minute", localTime: "02:30"}, {ianaZone: "America/New_York"}), code: "BAZI_PROFILE_TIMEZONE_UNRESOLVED"},
    {p: profile({kind: "solar", date: "2024-11-03"}, {precision: "exact_minute", localTime: "01:30"}, {ianaZone: "America/New_York"}), code: "BAZI_PROFILE_TIMEZONE_UNRESOLVED"},
  ])("refuses unsupported or ambiguous stored profile: $code", async ({p, code}) => {
    const f = await seed(p); expect(await repo().calculate(f.actor, f.revisionId)).toEqual({ok: false, error: {code}});
    expect(await database.select().from(calculationRuns).where(eq(calculationRuns.profileRevisionId, f.revisionId))).toHaveLength(0);
  });
  it("samples guest expiry after waiting for the shared coordination lock", async () => {
    const f = await seed(profile(), true); let clock = at;
    let release!: () => void, acquired!: () => void;
    const ready = new Promise<void>(resolve => {acquired = resolve;});
    const hold = new Promise<void>(resolve => {release = resolve;});
    const blocker = database.transaction(async tx => {await lockFreeAiCoordination(tx); acquired(); await hold;});
    await ready;
    const pending = repo(() => clock).calculate(f.actor, f.revisionId);
    try {
      // Observe an actual database lock wait, rather than relying on a timing sleep.
      let waiting = false;
      for (let i = 0; i < 100 && !waiting; i++) {
        const [row] = await database.execute(sql`SELECT EXISTS (SELECT 1 FROM pg_stat_activity WHERE datname = current_database() AND wait_event = 'advisory') AS waiting`);
        waiting = row?.waiting === true;
        if (!waiting) await new Promise(resolve => setTimeout(resolve, 10));
      }
      expect(waiting).toBe(true); clock = expiry;
    } finally {release(); await blocker;}
    expect(await pending).toEqual(unavailable);
    expect(await database.select().from(baziSources).where(eq(baziSources.profileRevisionId, f.revisionId))).toHaveLength(0);
  });
  it("links ownership without duplication and denies the old guest", async () => {
    const f = await seed(profile(), true), source = await calculated(f), account = await seed();
    expect((await linkAnonymousActorToAccount(database, f.owner, account.owner)).ok).toBe(true);
    expect(await repo().read(f.actor, source.sourceId)).toEqual(unavailable);
    expect(await repo().read(account.actor, source.sourceId)).toEqual({ok: true, value: {...source, reused: true}});
    expect(await database.select().from(baziSources).where(eq(baziSources.profileRevisionId, f.revisionId))).toHaveLength(1);
    expect((await repo().calculate(account.actor, f.revisionId)).ok).toBe(true);
  });
  it.each(["manual", "expired"])("cascades %s guest deletion to sources and runs", async mode => {
    const f = await seed(profile(), true), source = await calculated(f);
    const retention = createDatabaseAnonymousRetentionRepository(database);
    if (mode === "manual") expect((await retention.deleteNow(f.owner)).ok).toBe(true);
    else expect((await retention.purgeActor(f.owner, expiry)).ok).toBe(true);
    expect(await repo().read(f.actor, source.sourceId)).toEqual(unavailable);
    expect(await database.select().from(baziSources).where(eq(baziSources.id, source.sourceId))).toHaveLength(0);
    expect(await database.select().from(calculationRuns).where(eq(calculationRuns.profileRevisionId, f.revisionId))).toHaveLength(0);
  });
  it.each(["requested", "purged", "archived"])("denies %s account source access", async state => {
    const f = await seed(), source = await calculated(f);
    if (state === "archived") await database.update(birthProfiles).set({deletedAt: at}).where(eq(birthProfiles.id, f.id));
    else await database.insert(deletionRequests).values({id: `${f.id}-deletion`, userId: f.owner, status: state,
      requestedAt: at, recoverUntil: at, purgeAfter: at});
    expect(await repo().read(f.actor, source.sourceId)).toEqual(unavailable);
    expect(await repo().calculate(f.actor, f.revisionId)).toEqual(unavailable);
  });
  it("cascades physical account deletion and leaves unreferenced historical metadata behavior intact", async () => {
    const f = await seed(), source = await calculated(f), unrelated = await seed();
    await database.update(birthProfileRevisions).set({limitations: ["historical-edit"]}).where(eq(birthProfileRevisions.id, unrelated.revisionId));
    await database.delete(authUsers).where(eq(authUsers.id, f.owner));
    expect(await database.select().from(baziSources).where(eq(baziSources.id, source.sourceId))).toHaveLength(0);
    expect(await database.select().from(calculationRuns).where(eq(calculationRuns.profileRevisionId, f.revisionId))).toHaveLength(0);
    await database.execute(sql`SELECT 1`);
  });
});
