import { describe, expect, it, vi } from "vitest";

import type { CurrentActor } from "@lasoviet/contracts";

import {
  ZiweiQueryDataError,
  createZiweiQueryService,
  type ZiweiQueryRepository,
} from "./ziwei-query.service.js";

const now = new Date("2026-09-02T00:00:00.000Z");
const account: CurrentActor = {
  kind: "account",
  userId: "account-1",
  sessionId: "session-1",
  requestId: "request-1",
};

const chart = {
  version: 1,
  systemId: "ziwei",
  palaces: [
    "life", "siblings", "spouse", "children", "wealth", "health",
    "travel", "friends", "career", "property", "fortune", "parents",
  ].map((name, index) => ({
    id: `ziwei.palace.${name}`,
    earthlyBranchId: [
      "ziwei.branch.rat", "ziwei.branch.ox", "ziwei.branch.tiger", "ziwei.branch.rabbit",
      "ziwei.branch.dragon", "ziwei.branch.snake", "ziwei.branch.horse", "ziwei.branch.goat",
      "ziwei.branch.monkey", "ziwei.branch.rooster", "ziwei.branch.dog", "ziwei.branch.pig",
    ][index],
    stars: [{ id: "ziwei.star.ziwei", brightness: "ziwei.brightness.exalted" }],
  })),
  transformations: [{ starId: "ziwei.star.ziwei", id: "ziwei.transformation.prosperity" }],
  soulPalaceId: "ziwei.palace.life",
  bodyPalaceId: "ziwei.palace.life",
  horoscopeCapabilities: [{ id: "ziwei.horoscope.decadal", supported: true }],
  warnings: [],
  provenance: {
    version: 1,
    engineId: "ziwei.iztro",
    engineVersion: "2.6.0",
    adapterId: "ziwei.iztro-adapter",
    adapterVersion: "2.6.0",
    schemaId: "ziwei.chart.v1",
    ruleSetId: "ziwei.default",
    inputHash: "a".repeat(64),
    configHash: "b".repeat(64),
    rawSnapshotHash: "c".repeat(64),
    calculatedAt: "2026-09-02T00:00:00+00:00",
    limitations: ["IZTRO_NO_TRUE_SOLAR_TIME_CORRECTION"],
  },
};

const items = ["soul", "body", "configuration"].map((name) => ({
  id: `ziwei.identity.${name}`,
  factReferences: ["fact-1"],
  confidence: "high" as const,
  interpretationBounds: ["bound-1"],
  limitations: ["limit-1"],
  riskTags: ["identity" as const],
  allowedActionCategories: ["reflect" as const],
}));

function record(overrides: Partial<Awaited<ReturnType<ZiweiQueryRepository["readAuthorizedChart"]>> extends infer T ? Exclude<T, null> : never> = {}) {
  return {
    chartId: "chart-1",
    chartVersionId: "chart-version-2",
    normalizedOutput: chart,
    evidenceSetId: "evidence-set-1",
    capabilityId: "ziwei.identity.p0" as const,
    ruleVersion: "ziwei.identity.v1" as const,
    items: items.map((item, index) => ({ id: `row-${index}`, payload: item })),
    ...overrides,
  };
}

function repository(overrides: Partial<ZiweiQueryRepository> = {}) {
  return {
    readAuthorizedChart: vi.fn().mockResolvedValue(record()),
    readEvidenceItem: vi.fn().mockResolvedValue({ id: "row-1", payload: items[1] }),
    ...overrides,
  } satisfies ZiweiQueryRepository;
}

describe("Zi Wei query service", () => {
  it("returns only a strict chart and three evidence IDs to the account owner", async () => {
    const store = repository();
    const service = createZiweiQueryService({ repository: store, now: () => now });

    const result = await service.readChart(account, "chart-1");

    expect(result).toEqual({
      ok: true,
      value: expect.objectContaining({
        chartId: "chart-1",
        chartVersionId: "chart-version-2",
        evidenceIndex: expect.objectContaining({
          itemIds: items.map((item) => item.id),
        }),
      }),
    });
    if (result.ok) {
      expect(result.value).not.toHaveProperty("evidence");
    }
  });

  it("allows an unexpired anonymous owner and rejects an expired actor before querying", async () => {
    const store = repository();
    const service = createZiweiQueryService({ repository: store, now: () => now });
    const anonymous: CurrentActor = {
      kind: "anonymous", anonymousActorId: "anon-1", sessionId: "session-1",
      requestId: "request-1", expiresAt: "2026-09-02T00:01:00.000Z",
    };
    await expect(service.readChart(anonymous, "chart-1")).resolves.toMatchObject({ ok: true });
    await expect(service.readChart({ ...anonymous, expiresAt: "2026-09-02T00:00:00.000Z" }, "chart-1"))
      .resolves.toMatchObject({ ok: false, error: { code: "ANONYMOUS_EXPIRED" } });
    expect(store.readAuthorizedChart).toHaveBeenCalledTimes(1);
  });

  it("maps cross-owner and missing charts to the same error", async () => {
    const service = createZiweiQueryService({
      repository: repository({ readAuthorizedChart: vi.fn().mockResolvedValue(null) }),
      now: () => now,
    });
    await expect(service.readChart(account, "another-owner-chart")).resolves.toMatchObject({
      ok: false, error: { code: "CHART_NOT_FOUND" },
    });
    await expect(service.readChart(account, "missing-chart")).resolves.toMatchObject({
      ok: false, error: { code: "CHART_NOT_FOUND" },
    });
  });

  it("returns one selected strict evidence item and hides unrelated evidence IDs", async () => {
    const store = repository();
    const service = createZiweiQueryService({ repository: store, now: () => now });
    await expect(service.readEvidence(account, "chart-1", "ziwei.identity.body")).resolves.toEqual({
      ok: true,
      value: {
        version: 1, chartId: "chart-1", chartVersionId: "chart-version-2", evidence: items[1],
      },
    });
    store.readEvidenceItem.mockResolvedValueOnce(null);
    await expect(service.readEvidence(account, "chart-1", "unrelated-row")).resolves.toMatchObject({
      ok: false, error: { code: "EVIDENCE_NOT_FOUND" },
    });
  });

  it("throws a stable error for malformed stored chart or evidence data", async () => {
    const service = createZiweiQueryService({
      repository: repository({ readAuthorizedChart: vi.fn().mockResolvedValue(record({ normalizedOutput: {} })) }),
      now: () => now,
    });
    await expect(service.readChart(account, "chart-1")).rejects.toEqual(
      new ZiweiQueryDataError(),
    );
    const malformedEvidence = createZiweiQueryService({
      repository: repository({
        readAuthorizedChart: vi.fn().mockResolvedValue(
          record({ items: [{ id: "row-1", payload: {} }] }),
        ),
      }),
      now: () => now,
    });
    await expect(malformedEvidence.readChart(account, "chart-1")).rejects.toEqual(
      new ZiweiQueryDataError(),
    );
  });
});
