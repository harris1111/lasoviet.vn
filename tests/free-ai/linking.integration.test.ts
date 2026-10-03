import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { authAnonymousActors, authUsers } from "../../packages/database/src/schema/auth.js";
import { freeAiQuotaAlias, mergeFreeAiQuotaHistory } from "../../packages/database/src/index.js";
import { linkAnonymousActorToAccount } from "../../packages/database/src/runtime.js";
import { createFreeAiBudgetRepository } from "../../packages/backend/src/ziwei/free-ai-budget.repository.js";
import { MICRO, costContext, lineage, raceBehindLock, startFreeAiDatabase } from "./free-ai-test-harness.js";

type Harness = Awaited<ReturnType<typeof startFreeAiDatabase>>;
let seq = 0;

describe("free AI quota history survives ownership linking (real Postgres)", () => {
  let h: Harness;
  beforeAll(async () => { h = await startFreeAiDatabase(); main = h.connect(); }, 180000);
  afterAll(async () => { if (h) await h.stop(); });

  let main: ReturnType<Harness["connect"]>;
  const db = () => main;
  async function account() {
    const id = `acct-${++seq}`;
    await db().insert(authUsers).values({ id, name: id, email: `${id}@example.test` });
    return id;
  }
  async function guest() {
    const id = `anon-${++seq}`;
    const database = db();
    await database.insert(authUsers).values({ id, name: id, email: `${id}@example.test`, isAnonymous: true });
    await database.insert(authAnonymousActors).values({ id, expiresAt: new Date(Date.now() + 3_600_000) });
    return id;
  }
  const admit = (kind: "guest" | "account", actorId: string, chart: string, database = db()) =>
    createFreeAiBudgetRepository(database).reserve({
      flagEnabled: true, actor: { kind, id: actorId, trusted: true }, lineage: lineage(chart), concern: null,
      cost: costContext(1000n * MICRO), traceId: "t", authorizeSource: async () => ({ expiresAt: null }),
    });
  const link = (anon: string, user: string, database = db()) => linkAnonymousActorToAccount(database, anon, user);
  async function accountAdmissions(userId: string) {
    const rows = await h.raw`SELECT count(DISTINCT a.request_id)::int AS n FROM free_ai_admissions a
      JOIN free_ai_quota_aliases al ON al.subject_id = a.subject_id WHERE al.alias_key = ${aliasOf("account", userId)}`;
    return Number(rows[0]!.n);
  }
  const aliasOf = freeAiQuotaAlias;

  it("row 10: a guest's 1 admission counts toward the account's 3 — union, not reset, not 4", async () => {
    const [user, anon] = [await account(), await guest()];
    expect(await admit("account", user, `l10-a1-${seq}`)).toMatchObject({ kind: "admitted" });
    expect(await admit("account", user, `l10-a2-${seq}`)).toMatchObject({ kind: "admitted" });
    expect(await admit("guest", anon, `l10-g-${seq}`)).toMatchObject({ kind: "admitted" });
    expect(await link(anon, user)).toMatchObject({ ok: true });
    expect(await accountAdmissions(user)).toBe(3);
    expect(await admit("account", user, `l10-a3-${seq}`)).toEqual({ kind: "refused", reason: "quota_exhausted" });
  });

  it("an account with no history inherits the guest's usage and keeps the remaining allowance", async () => {
    const [user, anon] = [await account(), await guest()];
    await admit("guest", anon, `l-inherit-g-${seq}`);
    await link(anon, user);
    expect(await admit("account", user, `l-inherit-1-${seq}`)).toMatchObject({ kind: "admitted" });
    expect(await admit("account", user, `l-inherit-2-${seq}`)).toMatchObject({ kind: "admitted" });
    expect(await admit("account", user, `l-inherit-3-${seq}`)).toEqual({ kind: "refused", reason: "quota_exhausted" });
  });

  it("row 11: two guests linked to one account concurrently serialize into the distinct union", async () => {
    const [user, a, b] = [await account(), await guest(), await guest()];
    await admit("guest", a, `l11-a-${seq}`);
    await admit("guest", b, `l11-b-${seq}`);
    const results = await raceBehindLock(h.rawClient(), [() => link(a, user, h.connect()), () => link(b, user, h.connect())]);
    expect(results.every((r) => r.ok)).toBe(true);
    expect(await accountAdmissions(user)).toBe(2);
    expect(await admit("account", user, `l11-c1-${seq}`)).toMatchObject({ kind: "admitted" });
    expect(await admit("account", user, `l11-c2-${seq}`)).toEqual({ kind: "refused", reason: "quota_exhausted" });
  });

  it("row 12: repeated merging is idempotent", async () => {
    const [user, anon] = [await account(), await guest()];
    await admit("guest", anon, `l12-${seq}`);
    const merge = () => db().transaction((tx) => mergeFreeAiQuotaHistory(tx, anon, user));
    expect(await merge()).toEqual({ merged: true });
    expect(await merge()).toEqual({ merged: false });
    expect(await merge()).toEqual({ merged: false });
    expect(await accountAdmissions(user)).toBe(1);
  });

  it("row 13: concurrent link and admission serialize without losing or duplicating admissions", async () => {
    const [user, anon] = [await account(), await guest()];
    await admit("account", user, `l13-a1-${seq}`);
    await admit("account", user, `l13-a2-${seq}`);
    await admit("guest", anon, `l13-g-${seq}`);
    const [linked, admitted] = await raceBehindLock(h.rawClient(), [() => link(anon, user, h.connect()), () => admit("account", user, `l13-new-${seq}`, h.connect())] as Array<() => Promise<unknown>>);
    expect(linked).toMatchObject({ ok: true });
    const total = await accountAdmissions(user);
    // Either order is legal, but each admission is judged against the history visible when it ran:
    //  link first  -> account already at 3, the new admission is refused (total 3);
    //  admit first -> it saw 2 and was allowed (total 4 after the guest's earlier usage is unioned in).
    if ((admitted as { kind: string }).kind === "refused") expect(total).toBe(3);
    else { expect((admitted as { kind: string }).kind).toBe("admitted"); expect(total).toBe(4); }
    expect(await admit("account", user, `l13-after-${seq}`)).toEqual({ kind: "refused", reason: "quota_exhausted" });
  });

  it("row 14: quota history survives deletion of the anonymous auth row", async () => {
    const [user, anon] = [await account(), await guest()];
    await admit("guest", anon, `l14-${seq}`);
    await link(anon, user);
    expect(await h.raw`SELECT id FROM auth_users WHERE id = ${anon}`).toHaveLength(0);
    expect(await accountAdmissions(user)).toBe(1);
    expect(await admit("account", user, `l14-b-${seq}`)).toMatchObject({ kind: "admitted" });
  });

  it("row 15: a stale guest hint with no stored history never creates an empty history", async () => {
    const [user, anon] = [await account(), await guest()];
    const before = await h.raw`SELECT (SELECT count(*) FROM free_ai_quota_subjects)::int AS s, (SELECT count(*) FROM free_ai_quota_aliases)::int AS a`;
    expect(await link(anon, user)).toMatchObject({ ok: true });
    const after = await h.raw`SELECT (SELECT count(*) FROM free_ai_quota_subjects)::int AS s, (SELECT count(*) FROM free_ai_quota_aliases)::int AS a`;
    expect(after).toEqual(before);
  });

  it("an account already linked elsewhere is never merged across accounts", async () => {
    const [user, anon] = [await account(), await guest()];
    await admit("guest", anon, `l-conflict-${seq}`);
    expect(await link(anon, user)).toMatchObject({ ok: true });
    expect(await link(anon, await account())).toMatchObject({ ok: false });
    expect(await accountAdmissions(user)).toBe(1);
  });
});
