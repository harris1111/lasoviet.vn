import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { CurrentActor } from "../../packages/contracts/src/index.js";
import { createFreeAiDispatchService } from "../../packages/backend/src/ziwei/free-ai-dispatch.service.js";
import { createFreeAiSettlementService } from "../../packages/backend/src/ziwei/free-ai-settlement.service.js";
import { createFreePalaceArtifactRepository } from "../../packages/backend/src/ziwei/free-palace-artifact.repository.js";
import { createFreePalaceReadService } from "../../packages/backend/src/ziwei/free-palace-read.service.js";
import { freePalaceArtifactKey } from "../../packages/backend/src/ziwei/free-palace-selection.js";
import { createZiweiQueryService } from "../../packages/backend/src/ziwei/ziwei-query.service.js";
import { createDatabaseZiweiQueryRepository } from "../../packages/backend/src/ziwei/ziwei-query.repository.js";
import { MICRO, admitRequest, lineage, seedChartVersion, startFreeAiDatabase, type TestDatabase } from "./free-ai-test-harness.js";

type Harness = Awaited<ReturnType<typeof startFreeAiDatabase>>;
const TABLES = ["outbox", "free_ai_artifacts", "free_ai_settlements", "free_ai_admissions", "free_ai_requests", "free_ai_quota_aliases", "free_ai_quota_subjects", "free_ai_daily_budgets", "free_ai_chart_budgets"];
const FREE_COUNT_TABLES = ["free_ai_requests", "free_ai_admissions", "free_ai_settlements", "free_ai_artifacts", "free_ai_chart_budgets", "free_ai_daily_budgets", "free_ai_quota_subjects", "outbox"];
const facts = [{ key: "fact:one", label: "Cung Mệnh", value: "Sao Tử Vi ở thế vượng" }, { key: "fact:two", label: "Cung Mệnh", value: "Sao Thiên Phủ hội chiếu" }];
const point = (text: string, key = "fact:one") => ({ text, evidenceKeys: [key] });
const content = {
  palaceId: "ziwei.palace.life", title: "Cái cốt lõi của bạn", conclusion: "Cung Mệnh của bạn nghiêng về sự chủ động có cân nhắc.",
  keyPoints: [point("Bạn thích tự mình sắp xếp trình tự công việc."), point("Bạn cần thời gian trước khi chốt một lựa chọn lớn."), point("Bạn dễ được người khác tin cậy.", "fact:two")],
  narrative: "Bạn là người có xu hướng giữ vai trò dẫn dắt trong những nhóm nhỏ. ".repeat(10), do: [point("Dành một buổi mỗi tuần để rà soát ưu tiên.")], avoid: [point("Tránh ôm hết mọi việc về mình.")], evidenceKeys: ["fact:one", "fact:two"],
};
const account = (userId: string): CurrentActor => ({ kind: "account", userId, sessionId: "s", requestId: "r" });

describe("free palace gift reader (real Postgres)", () => {
  let h: Harness;
  let main: TestDatabase;
  let seq = 0;
  beforeAll(async () => { h = await startFreeAiDatabase(); main = h.connect(); }, 180000);
  afterAll(async () => { if (h) await h.stop(); });
  beforeEach(async () => { for (const table of TABLES) await h.raw.unsafe(`DELETE FROM ${table}`); });

  // Writes are forbidden outright: the reader may only select.
  const readOnly = (database: TestDatabase) => new Proxy(database, {
    get(target, property, receiver) {
      if (["insert", "update", "delete", "transaction", "execute"].includes(String(property))) throw new Error(`reader attempted a write: ${String(property)}`);
      return Reflect.get(target, property, receiver);
    },
  });
  const reader = (database: TestDatabase, lineageFor: (s: { chartVersionId: string; palaceId: string; locale: "vi" | "en" }) => string | null = (s) =>
    freePalaceArtifactKey(lineage(s.chartVersionId, { palaceId: s.palaceId as never, locale: s.locale }))) =>
    createFreePalaceReadService({ database: readOnly(database) as never, currentLineageHash: lineageFor });

  async function ready(options: { guestExpiresAt?: Date } = {}) {
    const n = ++seq;
    const userId = `reader-user-${n}`;
    const chartVersionId = `reader-chart-${n}`;
    const { chartId } = await seedChartVersion(main, chartVersionId, { kind: "account", userId });
    const requestId = await admitRequest(main, chartVersionId, { actorId: userId });
    const fence = await createFreeAiDispatchService(main).fence({ requestId, flagEnabled: true, isSourceAvailable: async () => true, activePricingSnapshotId: async () => "price-1" });
    if (fence.kind !== "fenced") throw new Error("fence failed");
    await createFreeAiSettlementService(main).settle({ requestId, attemptId: fence.attemptId, settlement: { kind: "resolved", actualMicroVnd: 400n * MICRO, disposition: "publishable" } });
    expect(await createFreePalaceArtifactRepository(main).publish({ requestId, attemptId: fence.attemptId, content, facts })).toMatchObject({ kind: "published" });
    return { userId, chartVersionId, chartId, requestId };
  }
  const counts = async () => Object.fromEntries(await Promise.all(FREE_COUNT_TABLES.map(async (t) => [t, Number((await h.raw.unsafe(`SELECT count(*)::int AS n FROM ${t}`))[0]!.n)])));

  it("returns the full one-palace gift to its owner with no operational fields", async () => {
    const r = await ready();
    const result = await reader(main).read(account(r.userId), r.chartId, "vi");
    expect(result).toMatchObject({ ok: true, value: { version: 1, status: "ready", palaceId: "ziwei.palace.life", locale: "vi", sourceKind: "validated_artifact" } });
    const text = JSON.stringify(result);
    for (const forbidden of ["fake-model", "fake-provider", "price-1", "serializedPrompt", "reservedMicroVnd", "frozenCall", "attemptId", "pricingSnapshotId"]) expect(text).not.toContain(forbidden);
  });

  it("rows 43/46: reading never writes anything and repeated ready reads are free cache hits", async () => {
    const r = await ready();
    const before = await counts();
    const service = reader(main);
    for (let i = 0; i < 5; i += 1) expect((await service.read(account(r.userId), r.chartId, "vi")).value).toMatchObject({ status: "ready" });
    expect(await counts()).toEqual(before);
  });

  it("row 44: each stored state maps to the right contract status", async () => {
    const r = await ready();
    const expected: Array<[string, string]> = [["reserved", "requested"], ["dispatching", "generating"], ["terminal_failure", "terminal_failure"], ["cost_unknown", "cost_unknown"], ["cancelled", "unavailable"]];
    for (const [stored, exposed] of expected) {
      await h.raw`UPDATE free_ai_requests SET status=${stored} WHERE id=${r.requestId}`;
      const result = await reader(main).read(account(r.userId), r.chartId, "vi");
      expect(result).toEqual({ ok: true, value: { version: 1, status: exposed } });
    }
  });

  it("an authorized chart that never had a gift reports unavailable and admits nothing", async () => {
    const { chartId } = await seedChartVersion(main, `reader-none-${++seq}`, { kind: "account", userId: `reader-none-user-${seq}` });
    const before = await counts();
    expect(await reader(main).read(account(`reader-none-user-${seq}`), chartId, "vi")).toEqual({ ok: true, value: { version: 1, status: "unavailable" } });
    expect(await counts()).toEqual(before);
  });

  it("row 45: wrong-owner and missing charts are the same error; an expired anonymous actor is its own", async () => {
    const r = await ready();
    const stranger = await reader(main).read(account("someone-else"), r.chartId, "vi");
    const missing = await reader(main).read(account(r.userId), "no-such-chart", "vi");
    expect(stranger).toEqual(missing);
    expect(stranger).toMatchObject({ ok: false, error: { code: "CHART_NOT_FOUND" } });
    const expired: CurrentActor = { kind: "anonymous", anonymousActorId: "a", sessionId: "s", requestId: "r", expiresAt: new Date(Date.now() - 1000).toISOString() };
    expect(await reader(main).read(expired, r.chartId, "vi")).toMatchObject({ ok: false, error: { code: "ANONYMOUS_EXPIRED" } });
  });

  it("row 45: a wrong-locale, unsupported-lineage, stale, expired, tampered or cost-unresolved artifact is never exposed", async () => {
    const r = await ready();
    const asOwner = (service = reader(main), locale: "vi" | "en" = "vi") => service.read(account(r.userId), r.chartId, locale);
    const unavailable = { ok: true, value: { version: 1, status: "unavailable" } };
    expect(await asOwner(undefined, "en")).toEqual(unavailable);                                         // wrong locale
    expect(await asOwner(reader(main, () => "a-different-supported-key"))).toEqual(unavailable);           // consumed but unsupported key
    expect(await asOwner(reader(main, () => null))).toEqual(unavailable);
    const before = await counts();
    expect(before.outbox).toBe(1);                                                                          // and no regeneration was queued
    await h.raw`UPDATE free_ai_artifacts SET content_hash = repeat('0', 64) WHERE request_id=${r.requestId}`; // tampered
    expect(await asOwner()).toEqual(unavailable);
    await h.raw`UPDATE free_ai_artifacts SET content_hash = (SELECT content_hash FROM free_ai_artifacts LIMIT 1)`;
    expect(await asOwner()).toEqual(unavailable);
  });

  it("a deleted generation, a deleted chart and an expired TTL all read as unavailable", async () => {
    const r = await ready();
    const before = JSON.stringify((await h.raw`SELECT content, content_hash FROM free_ai_artifacts WHERE request_id=${r.requestId}`)[0]);
    await h.raw`UPDATE free_ai_artifacts SET expires_at = now() - interval '1 minute' WHERE request_id=${r.requestId}`;
    expect((await reader(main).read(account(r.userId), r.chartId, "vi")).value).toEqual({ version: 1, status: "unavailable" });
    await h.raw`UPDATE free_ai_artifacts SET expires_at = NULL WHERE request_id=${r.requestId}`;
    expect((await reader(main).read(account(r.userId), r.chartId, "vi")).value).toMatchObject({ status: "ready" });
    await h.raw`UPDATE free_ai_chart_budgets SET deletion_generation = deletion_generation + 1 WHERE chart_version_id=${r.chartVersionId}`;
    expect((await reader(main).read(account(r.userId), r.chartId, "vi")).value).toEqual({ version: 1, status: "unavailable" });
    await h.raw`UPDATE free_ai_chart_budgets SET deleted_at = now()`;
    expect((await reader(main).read(account(r.userId), r.chartId, "vi")).value).toEqual({ version: 1, status: "unavailable" });
    expect(JSON.stringify((await h.raw`SELECT content, content_hash FROM free_ai_artifacts WHERE request_id=${r.requestId}`)[0])).toBe(before); // reading never mutates
  });

  it("without a cost capture the gift is not ready", async () => {
    const r = await ready();
    await h.raw`DELETE FROM free_ai_settlements WHERE request_id=${r.requestId}`;
    expect((await reader(main).read(account(r.userId), r.chartId, "vi")).value).toEqual({ version: 1, status: "unavailable" });
  });

  it("the query service exposes the reader and degrades to unavailable when none is wired", async () => {
    const r = await ready();
    const repository = createDatabaseZiweiQueryRepository(main);
    const wired = createZiweiQueryService({ repository, freePalaceGift: reader(main) });
    const bare = createZiweiQueryService({ repository });
    expect((await wired.readFreePalaceGift(account(r.userId), r.chartId, "vi")).value).toMatchObject({ status: "ready" });
    expect(await bare.readFreePalaceGift(account(r.userId), r.chartId, "vi")).toEqual({ ok: true, value: { version: 1, status: "unavailable" } });
    expect(await bare.readFreePalaceGift(account("other"), r.chartId, "vi")).toMatchObject({ ok: false, error: { code: "CHART_NOT_FOUND" } });
  });
});
