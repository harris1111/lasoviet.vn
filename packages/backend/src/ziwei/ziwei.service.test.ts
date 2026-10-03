import { describe, expect, it, vi } from "vitest";

import type {
  CurrentActor,
  NormalizedBirthProfileV1,
  NormalizedZiweiChartV1,
} from "@lasoviet/contracts";

import { createZiweiCalculationService } from "./ziwei.service.js";

const actor: CurrentActor = {
  kind: "account",
  userId: "account-1",
  sessionId: "session-1",
  requestId: "request-1",
};

const profile: NormalizedBirthProfileV1 = {
  version: 1,
  originalInput: {
    version: 1,
    calendar: { kind: "solar", date: "1990-01-01" },
    time: { precision: "exact_minute", localTime: "12:00" },
    timezone: { offsetMinutes: 420 },
    gender: "male",
    consentVersion: "2026-09-01",
  },
  normalizedCalendar: { kind: "solar", date: "1990-01-01" },
  normalizedTime: { precision: "exact_minute", localTime: "12:00" },
  timezoneProvenance: { source: "offset", offsetMinutes: 420 },
  utcInstant: "1990-01-01T05:00:00.000Z",
  normalizationWarnings: [],
  limitations: [],
};

const chart = {
  version: 1,
  systemId: "ziwei",
  palaces: [],
  transformations: [],
  soulPalaceId: "ziwei.palace.life",
  bodyPalaceId: "ziwei.palace.life",
  horoscopeCapabilities: [],
  warnings: [],
  provenance: {},
} as unknown as NormalizedZiweiChartV1;

describe("Ziwei calculation service", () => {
  it("persists identity evidence before returning a successful calculation", async () => {
    const buildAndPersist = vi.fn(async (chartVersionId: string) => ({
      ok: true as const,
      value: { evidenceSetId: `evidence-for-${chartVersionId}`, reused: false },
    }));
    const service = createZiweiCalculationService({
      repository: {
        async readAuthorizedRevision() {
          return { profileId: "profile-1", revisionId: "revision-1", normalized: profile };
        },
        async create() {
          return { chartId: "chart-1", chartVersionId: "chart-version-1", reused: false };
        },
      },
      evidenceService: { buildAndPersist },
      engine: {
        async calculateWithPrivateSnapshot() {
          return {
            result: { ok: true as const, output: chart, provenance: chart.provenance, warnings: [] },
            rawSnapshot: { vendor: "private" },
          };
        },
      },
    });

    await expect(service.calculate(actor, "revision-1")).resolves.toMatchObject({
      ok: true,
      value: { chartId: "chart-1", chartVersionId: "chart-version-1" },
    });
    expect(buildAndPersist).toHaveBeenCalledWith("chart-version-1");
  });

  it("does not return calculation success when identity evidence persistence fails", async () => {
    const service = createZiweiCalculationService({
      repository: {
        async readAuthorizedRevision() {
          return { profileId: "profile-1", revisionId: "revision-1", normalized: profile };
        },
        async create() {
          return { chartId: "chart-1", chartVersionId: "chart-version-1", reused: false };
        },
      },
      evidenceService: {
        async buildAndPersist() {
          return {
            ok: false as const,
            error: { code: "CAPABILITY_UNAVAILABLE", messageKey: "evidence.capability_unavailable", retryable: false },
          };
        },
      },
      engine: {
        async calculateWithPrivateSnapshot() {
          return {
            result: { ok: true as const, output: chart, provenance: chart.provenance, warnings: [] },
            rawSnapshot: { vendor: "private" },
          };
        },
      },
    });

    await expect(service.calculate(actor, "revision-1")).resolves.toMatchObject({
      ok: false,
      error: { code: "EVIDENCE_PERSISTENCE_FAILED" },
    });
  });

  it("rejects multi-branch range before creating a calculation run", async () => {
    const time = {
      precision: "range" as const,
      startLocalTime: "10:30",
      endLocalTime: "11:30",
    };
    const create = async () => {
      throw new Error("calculation run must not be created");
    };
    const service = createZiweiCalculationService({
      repository: {
        async readAuthorizedRevision() {
          return {
            profileId: "profile-1",
            revisionId: "revision-ineligible",
            normalized: {
              ...profile,
              normalizedTime: time,
            },
          };
        },
        create,
      },
      evidenceService: { async buildAndPersist() { return { ok: true as const, value: { evidenceSetId: "evidence-1", reused: false } }; } },
      engine: { async calculateWithPrivateSnapshot() { return { result: { ok: true, output: chart, provenance: chart.provenance, warnings: [] }, rawSnapshot: {} }; } },
    });

    await expect(service.calculate(actor, "revision-ineligible")).resolves.toMatchObject({
      ok: false,
      error: { code: "ZIWEI_TIME_INELIGIBLE" },
    });
  });

  it("calculates a provisional chart when birth time is unknown (FD-103)", async () => {
    let createdRecord = false;
    const service = createZiweiCalculationService({
      repository: {
        async readAuthorizedRevision() {
          return {
            profileId: "profile-1",
            revisionId: "revision-unknown",
            normalized: {
              ...profile,
              normalizedTime: { precision: "unknown" as const },
              limitations: ["TIME_UNKNOWN", "BIRTH_TIME_UNKNOWN_PROVISIONAL"],
            },
          };
        },
        async create(input) {
          createdRecord = true;
          return {
            chartId: "chart-provisional-1",
            chartVersionId: "chart-ver-provisional-1",
            reused: false,
          };
        },
      },
      evidenceService: { async buildAndPersist() { return { ok: true as const, value: { evidenceSetId: "evidence-prov-1", reused: false } }; } },
      engine: {
        async calculateWithPrivateSnapshot() {
          return {
            result: {
              ok: true,
              output: { ...chart, provisional: true, timePrecision: "unknown" as const },
              provenance: {
                ...chart.provenance,
                limitations: ["BIRTH_TIME_UNKNOWN_PROVISIONAL"],
              },
              warnings: [],
            },
            rawSnapshot: {},
          };
        },
      },
    });

    const result = await service.calculate(actor, "revision-unknown");
    expect(result).toMatchObject({
      ok: true,
      value: {
        chartId: "chart-provisional-1",
        chartVersionId: "chart-ver-provisional-1",
        reused: false,
      },
    });
    expect(createdRecord).toBe(true);
  });

  it("does not disclose a revision that the resolved actor does not own", async () => {
    const service = createZiweiCalculationService({
      repository: {
        async readAuthorizedRevision() {
          return null;
        },
        async create() {
          throw new Error("calculation run must not be created");
        },
      },
      evidenceService: { async buildAndPersist() { return { ok: true as const, value: { evidenceSetId: "evidence-1", reused: false } }; } },
      engine: {
        async calculateWithPrivateSnapshot() {
          throw new Error("engine must not run");
        },
      },
    });

    await expect(service.calculate(actor, "another-actor-revision")).resolves.toMatchObject({
      ok: false,
      error: { code: "PROFILE_FORBIDDEN" },
    });
  });

  it("reuses the existing immutable chart for the same calculation key", async () => {
    let creates = 0;
    const buildAndPersist = vi.fn(async () => ({
      ok: true as const,
      value: { evidenceSetId: "evidence-set-1", reused: creates > 1 },
    }));
    const service = createZiweiCalculationService({
      repository: {
        async readAuthorizedRevision() {
          return { profileId: "profile-1", revisionId: "revision-1", normalized: profile };
        },
        async create(input) {
          creates += 1;
          return {
            chartId: "chart-1",
            chartVersionId: "chart-version-1",
            reused: creates > 1,
            input,
          };
        },
      },
      evidenceService: { buildAndPersist },
      engine: {
        async calculateWithPrivateSnapshot() {
          return {
            result: {
              ok: true as const,
              output: chart,
              provenance: chart.provenance,
              warnings: [],
            },
            rawSnapshot: { vendor: "private" },
          };
        },
      },
    });

    const first = await service.calculate(actor, "revision-1");
    const second = await service.calculate(actor, "revision-1");

    expect(first).toMatchObject({
      ok: true,
      value: { chartId: "chart-1", chartVersionId: "chart-version-1" },
    });
    expect(second).toMatchObject({
      ok: true,
      value: { chartId: "chart-1", chartVersionId: "chart-version-1" },
    });
    expect(creates).toBe(2);
    expect(buildAndPersist).toHaveBeenNthCalledWith(1, "chart-version-1");
    expect(buildAndPersist).toHaveBeenNthCalledWith(2, "chart-version-1");
  });

  describe("optional chart-ready hook (free palace request)", () => {
    function build(over: { hook?: Parameters<typeof createZiweiCalculationService>[0]["onChartReady"]; evidenceOk?: boolean; reused?: boolean; onError?: (e: unknown) => void; timeoutMs?: number } = {}) {
      return createZiweiCalculationService({
        repository: {
          async readAuthorizedRevision() { return { profileId: "profile-1", revisionId: "revision-1", normalized: profile }; },
          async create() { return { chartId: "chart-1", chartVersionId: "chart-version-1", reused: over.reused ?? false }; },
        },
        evidenceService: { async buildAndPersist() { return over.evidenceOk === false ? { ok: false as const } : { ok: true as const }; } },
        engine: { async calculateWithPrivateSnapshot() { return { result: { ok: true as const, output: chart, provenance: chart.provenance, warnings: [] }, rawSnapshot: {} }; } },
        onChartReady: over.hook, onChartReadyError: over.onError, onChartReadyTimeoutMs: over.timeoutMs,
      });
    }
    const success = { ok: true, value: { chartId: "chart-1", chartVersionId: "chart-version-1", reused: false } };

    it("row 51: without the hook the result is byte-identical", async () => {
      expect(await build().calculate(actor, "revision-1")).toEqual(success);
    });
    it("runs only after evidence is persisted, with the reuse flag, and returns the same result", async () => {
      const hook = vi.fn(async () => undefined);
      expect(await build({ hook, reused: true }).calculate(actor, "revision-1")).toEqual({ ok: true, value: { ...success.value, reused: true } });
      expect(hook).toHaveBeenCalledWith(actor, { chartId: "chart-1", chartVersionId: "chart-version-1", reused: true });
    });
    it("is not called when the chart or its evidence is not persisted", async () => {
      const hook = vi.fn(async () => undefined);
      expect(await build({ hook, evidenceOk: false }).calculate(actor, "revision-1")).toMatchObject({ ok: false });
      expect(hook).not.toHaveBeenCalled();
    });
    it("row 52: a failing hook, a throwing hook and a throwing reporter never fail the calculation", async () => {
      const reports: unknown[] = [];
      expect(await build({ hook: async () => { throw new Error("db down"); }, onError: (e) => reports.push(e) }).calculate(actor, "revision-1")).toEqual(success);
      expect(reports).toHaveLength(1);
      expect(await build({ hook: () => { throw new Error("sync boom"); }, onError: () => { throw new Error("reporter boom"); } }).calculate(actor, "revision-1")).toEqual(success);
    });
    it("a slow hook cannot delay the calculation beyond its timeout, and a late rejection is harmless", async () => {
      let rejectLate!: (error: Error) => void;
      const hook = () => new Promise<void>((_, reject) => { rejectLate = reject; });
      const started = Date.now();
      expect(await build({ hook, timeoutMs: 30 }).calculate(actor, "revision-1")).toEqual(success);
      expect(Date.now() - started).toBeLessThan(1000);
      rejectLate(new Error("too late"));
      await new Promise((resolve) => setTimeout(resolve, 10));
    });
  });
});

