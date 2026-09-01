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

  it.each([
    { precision: "unknown" as const },
    {
      precision: "range" as const,
      startLocalTime: "10:30",
      endLocalTime: "11:30",
    },
  ])("rejects ineligible time before creating a calculation run", async (time) => {
    const create = async () => {
      throw new Error("calculation run must not be created");
    };
    const service = createZiweiCalculationService({
      repository: {
        async readAuthorizedRevision() {
          return {
            profileId: "profile-1",
            revisionId: "revision-unknown",
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

    await expect(service.calculate(actor, "revision-unknown")).resolves.toMatchObject({
      ok: false,
      error: { code: "ZIWEI_TIME_INELIGIBLE" },
    });
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
});
