import { describe, expect, it, vi } from "vitest";

import {
  ZIWEI_BRANCH_IDS,
  ZIWEI_PALACE_IDS,
  type ReportGenerationRequestedV2,
  type ZiweiReportSnapshotV1,
  type ZiweiTimingPalace,
} from "@lasoviet/contracts";
import type { Database } from "@lasoviet/database";

import type {
  PersistedReportSourceSnapshotRecord,
  ReportSourceSnapshotRepository,
} from "./report-source-snapshot.repository.js";
import {
  createReportSourceSnapshotPreparationService,
  type ReportSnapshotCalculator,
} from "./report-source-snapshot.service.js";

function create12Palaces(): ZiweiTimingPalace[] {
  return ZIWEI_PALACE_IDS.map((palaceId, idx) => ({
    palaceId,
    heavenlyStemId: "ziwei.stem.bing",
    earthlyBranchId: ZIWEI_BRANCH_IDS[idx % ZIWEI_BRANCH_IDS.length]!,
    isOriginalPalace: idx === 2,
    cycleStateId: "ziwei.cycle.prime",
    stars: [
      {
        id: "ziwei.star.ziwei",
        brightness: "ziwei.brightness.exalted",
        category: "major",
      },
    ],
    transformations: [
      {
        starId: "ziwei.star.ziwei",
        id: "ziwei.transformation.prosperity",
      },
    ],
  }));
}

const TEST_HASH = "a".repeat(64);

function createValidSnapshot(overrides?: Partial<ZiweiReportSnapshotV1>): ZiweiReportSnapshotV1 {
  return {
    version: 1,
    chartVersionId: "chart-version-1",
    asOfDate: "2026-09-12",
    timezone: "Asia/Ho_Chi_Minh",
    timingRuleVersion: "ziwei.timing.v1",
    sensitivityRuleVersion: "ziwei.sensitivity.v1",
    timing: {
      decadal: {
        state: "active",
        index: 2,
        ageRange: [22, 31],
        yearRange: [2022, 2031],
        palaceId: "ziwei.palace.fortune",
        heavenlyStemId: "ziwei.stem.bing",
        earthlyBranchId: "ziwei.branch.tiger",
        palaces: create12Palaces(),
      },
      annual: {
        targetYear: 2026,
        palaceId: "ziwei.palace.career",
        heavenlyStemId: "ziwei.stem.bing",
        earthlyBranchId: "ziwei.branch.horse",
        palaces: create12Palaces(),
      },
      provenance: {
        engineId: "ziwei.iztro",
        engineVersion: "2.6.0",
        adapterId: "ziwei.iztro-adapter",
        adapterVersion: "1.0.0",
        ruleSetId: "ziwei.default",
        config: {
          yearDivide: "normal",
          horoscopeDivide: "normal",
          ageDivide: "normal",
          dayDivide: "current",
        },
      },
    },
    sensitivity: {
      previousFrame: {
        position: "previous",
        vendorTimeIndex: 5,
        civilDateOffset: 0,
        frameId: "ziwei.time-frame.snake",
      },
      selectedFrame: {
        position: "selected",
        vendorTimeIndex: 6,
        civilDateOffset: 0,
        frameId: "ziwei.time-frame.horse",
      },
      nextFrame: {
        position: "next",
        vendorTimeIndex: 7,
        civilDateOffset: 0,
        frameId: "ziwei.time-frame.goat",
      },
      stableFactKeys: [
        "ziwei.fact.life-palace-branch",
        "ziwei.fact.body-palace-branch",
      ],
      sensitiveFacts: [
        {
          factKey: "ziwei.fact.life-palace-stem",
          variants: [
            {
              position: "previous",
              valueIds: ["ziwei.stem.yi"],
              evidenceKeys: ["ziwei.palace.life"],
            },
            {
              position: "selected",
              valueIds: ["ziwei.stem.bing"],
              evidenceKeys: ["ziwei.palace.life"],
            },
            {
              position: "next",
              valueIds: ["ziwei.stem.ding"],
              evidenceKeys: ["ziwei.palace.life"],
            },
          ],
        },
      ],
    },
    provenance: {
      chartVersionId: "chart-version-1",
      timingRuleVersion: "ziwei.timing.v1",
      sensitivityRuleVersion: "ziwei.sensitivity.v1",
      snapshotHash: TEST_HASH,
    },
    ...overrides,
  };
}

function createValidPayload(): ReportGenerationRequestedV2 {
  return {
    reportId: "11111111-1111-4111-8111-111111111111",
    reportVersionId: "22222222-2222-4222-8222-222222222222",
    entitlementId: "entitlement-1",
    chartVersionId: "chart-version-1",
    evidenceVersionId: "evidence-1",
    knowledgeVersionId: "knowledge-1",
    promptVersion: "prompt-1",
    reportConfigVersion: "config-1",
    locale: "vi",
    sku: "ZIWEI-NATAL-V4",
    asOfDate: "2026-09-12",
    targetYear: 2026,
    timingRuleVersion: "ziwei.timing.v1",
    sensitivityRuleVersion: "ziwei.sensitivity.v1",
  };
}

const validOriginalInput = {
  version: 1 as const,
  gender: "male",
  calendar: { kind: "solar" as const, date: "2000-01-01" },
  time: { precision: "exact_minute" as const, localTime: "04:30" },
  timezone: { offsetMinutes: 420 },
  placeLabel: "Hà Nội",
  consentVersion: "v1",
};

const validNormalizedInput = {
  version: 1 as const,
  normalizedCalendar: { kind: "solar" as const, date: "2000-01-01" },
  normalizedTime: { precision: "exact_minute" as const, localTime: "04:30" },
  timezoneProvenance: { source: "offset" as const, offsetMinutes: 420 },
  normalizationWarnings: [],
  limitations: [],
};

function createMockDatabase(row: unknown = null): Database {
  const queryBuilder = {
    from: vi.fn().mockReturnThis(),
    innerJoin: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue(row ? [row] : []),
  };
  return {
    select: vi.fn().mockReturnValue(queryBuilder),
  } as unknown as Database;
}

function createMockRecord(overrides?: Partial<PersistedReportSourceSnapshotRecord>): PersistedReportSourceSnapshotRecord {
  const snapshot = createValidSnapshot();
  return {
    id: "snapshot-rec-1",
    reportId: "11111111-1111-4111-8111-111111111111",
    reportVersionId: "22222222-2222-4222-8222-222222222222",
    chartVersionId: "chart-version-1",
    asOfDate: "2026-09-12",
    targetYear: 2026,
    timingRuleVersion: "ziwei.timing.v1",
    sensitivityRuleVersion: "ziwei.sensitivity.v1",
    snapshotHash: TEST_HASH,
    snapshot,
    createdAt: new Date(),
    ...overrides,
  };
}

describe("ReportSourceSnapshotPreparationService", () => {
  it("returns existing record without DB query or calculation when exact match exists", async () => {
    const existing = createMockRecord();
    const repository: ReportSourceSnapshotRepository = {
      getByReportVersionId: vi.fn().mockResolvedValue(existing),
      persist: vi.fn(),
    };
    const database = createMockDatabase();
    const calculateSnapshot: ReportSnapshotCalculator = vi.fn();

    const service = createReportSourceSnapshotPreparationService({
      database,
      repository,
      calculateSnapshot,
    });

    const result = await service.prepare(createValidPayload());

    expect(result).toEqual({ ok: true, value: existing });
    if (result.ok) {
      expect(result.value).toEqual(existing);
    }
    expect(repository.getByReportVersionId).toHaveBeenCalledWith("22222222-2222-4222-8222-222222222222");
    expect(database.select).not.toHaveBeenCalled();
    expect(calculateSnapshot).not.toHaveBeenCalled();
    expect(repository.persist).not.toHaveBeenCalled();
  });

  it("returns non-retryable REPORT_SOURCE_SNAPSHOT_CONFLICT when existing record has mismatched lineage", async () => {
    const existing = createMockRecord({ chartVersionId: "different-chart-version" });
    const repository: ReportSourceSnapshotRepository = {
      getByReportVersionId: vi.fn().mockResolvedValue(existing),
      persist: vi.fn(),
    };
    const database = createMockDatabase();
    const calculateSnapshot: ReportSnapshotCalculator = vi.fn();

    const service = createReportSourceSnapshotPreparationService({
      database,
      repository,
      calculateSnapshot,
    });

    const result = await service.prepare(createValidPayload());

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("REPORT_SOURCE_SNAPSHOT_CONFLICT");
      expect(result.error.retryable).toBe(false);
    }
    expect(database.select).not.toHaveBeenCalled();
    expect(calculateSnapshot).not.toHaveBeenCalled();
  });

  it("returns retryable REPORT_SOURCE_SNAPSHOT_UNAVAILABLE when repository getByReportVersionId throws", async () => {
    const repository: ReportSourceSnapshotRepository = {
      getByReportVersionId: vi.fn().mockRejectedValue(new Error("DB connection failure")),
      persist: vi.fn(),
    };
    const database = createMockDatabase();
    const calculateSnapshot: ReportSnapshotCalculator = vi.fn();

    const service = createReportSourceSnapshotPreparationService({
      database,
      repository,
      calculateSnapshot,
    });

    const result = await service.prepare(createValidPayload());

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("REPORT_SOURCE_SNAPSHOT_UNAVAILABLE");
      expect(result.error.retryable).toBe(true);
    }
  });

  it.each([
    ["missing reportId", { reportId: undefined }],
    ["non-uuid reportId", { reportId: "not-a-uuid" }],
    ["non-uuid reportVersionId", { reportVersionId: "not-a-uuid" }],
    ["mismatched targetYear and asOfDate", { targetYear: 2025, asOfDate: "2026-09-12" }],
    ["empty chartVersionId", { chartVersionId: "" }],
  ])("returns non-retryable REPORT_SOURCE_SNAPSHOT_INVALID for %s", async (_name, overrides) => {
    const repository: ReportSourceSnapshotRepository = {
      getByReportVersionId: vi.fn(),
      persist: vi.fn(),
    };
    const database = createMockDatabase();
    const calculateSnapshot: ReportSnapshotCalculator = vi.fn();

    const service = createReportSourceSnapshotPreparationService({
      database,
      repository,
      calculateSnapshot,
    });

    const payload = { ...createValidPayload(), ...overrides };
    const result = await service.prepare(payload);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("REPORT_SOURCE_SNAPSHOT_INVALID");
      expect(result.error.retryable).toBe(false);
    }
  });

  it("queries exact chart version revision, calculates, persists, and returns new record", async () => {
    const snapshot = createValidSnapshot();
    const persisted = createMockRecord({ snapshot });
    const repository: ReportSourceSnapshotRepository = {
      getByReportVersionId: vi.fn().mockResolvedValue(null),
      persist: vi.fn().mockResolvedValue({ ok: true, value: persisted }),
    };
    const database = createMockDatabase({
      originalInput: validOriginalInput,
      normalizedInput: validNormalizedInput,
    });
    const calculateSnapshot: ReportSnapshotCalculator = vi.fn().mockResolvedValue({
      ok: true,
      value: snapshot,
    });

    const service = createReportSourceSnapshotPreparationService({
      database,
      repository,
      calculateSnapshot,
    });

    const result = await service.prepare(createValidPayload());

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toEqual(persisted);
    }
    expect(calculateSnapshot).toHaveBeenCalledWith(
      expect.objectContaining({
        chartVersionId: "chart-version-1",
        asOfDate: "2026-09-12",
        targetYear: 2026,
      }),
    );
    expect(repository.persist).toHaveBeenCalledWith(
      expect.objectContaining({
        version: 1,
        reportId: "11111111-1111-4111-8111-111111111111",
        reportVersionId: "22222222-2222-4222-8222-222222222222",
        chartVersionId: "chart-version-1",
        snapshotHash: TEST_HASH,
        snapshot,
      }),
    );
  });

  it("returns non-retryable REPORT_SOURCE_SNAPSHOT_INVALID when chartVersionId is not in DB", async () => {
    const repository: ReportSourceSnapshotRepository = {
      getByReportVersionId: vi.fn().mockResolvedValue(null),
      persist: vi.fn(),
    };
    const database = createMockDatabase(null); // empty result
    const calculateSnapshot: ReportSnapshotCalculator = vi.fn();

    const service = createReportSourceSnapshotPreparationService({
      database,
      repository,
      calculateSnapshot,
    });

    const result = await service.prepare(createValidPayload());

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("REPORT_SOURCE_SNAPSHOT_INVALID");
      expect(result.error.retryable).toBe(false);
    }
  });

  it("returns retryable REPORT_SOURCE_SNAPSHOT_UNAVAILABLE when database query fails", async () => {
    const repository: ReportSourceSnapshotRepository = {
      getByReportVersionId: vi.fn().mockResolvedValue(null),
      persist: vi.fn(),
    };
    const queryBuilder = {
      from: vi.fn().mockReturnThis(),
      innerJoin: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockRejectedValue(new Error("Connection terminated")),
    };
    const database = { select: vi.fn().mockReturnValue(queryBuilder) } as unknown as Database;
    const calculateSnapshot: ReportSnapshotCalculator = vi.fn();

    const service = createReportSourceSnapshotPreparationService({
      database,
      repository,
      calculateSnapshot,
    });

    const result = await service.prepare(createValidPayload());

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("REPORT_SOURCE_SNAPSHOT_UNAVAILABLE");
      expect(result.error.retryable).toBe(true);
    }
  });

  it("returns retryable REPORT_SOURCE_SNAPSHOT_UNAVAILABLE when calculateSnapshot returns ENGINE_UNAVAILABLE", async () => {
    const repository: ReportSourceSnapshotRepository = {
      getByReportVersionId: vi.fn().mockResolvedValue(null),
      persist: vi.fn(),
    };
    const database = createMockDatabase({
      originalInput: validOriginalInput,
      normalizedInput: validNormalizedInput,
    });
    const calculateSnapshot: ReportSnapshotCalculator = vi.fn().mockResolvedValue({
      ok: false,
      error: { code: "ENGINE_UNAVAILABLE", messageKey: "engine.unavailable", retryable: true },
    });

    const service = createReportSourceSnapshotPreparationService({
      database,
      repository,
      calculateSnapshot,
    });

    const result = await service.prepare(createValidPayload());

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("REPORT_SOURCE_SNAPSHOT_UNAVAILABLE");
      expect(result.error.retryable).toBe(true);
    }
  });

  it("reconstructs profile without exposing raw PII in returned snapshot records or errors", async () => {
    const snapshot = createValidSnapshot();
    const repository: ReportSourceSnapshotRepository = {
      getByReportVersionId: vi.fn().mockResolvedValue(null),
      persist: vi.fn().mockResolvedValue({ ok: true, value: createMockRecord({ snapshot }) }),
    };
    const database = createMockDatabase({
      originalInput: { ...validOriginalInput, displayName: "Sensitive Name" },
      normalizedInput: validNormalizedInput,
    });
    const calculateSnapshot: ReportSnapshotCalculator = vi.fn().mockResolvedValue({
      ok: true,
      value: snapshot,
    });


    const service = createReportSourceSnapshotPreparationService({
      database,
      repository,
      calculateSnapshot,
    });

    const result = await service.prepare(createValidPayload());
    expect(result.ok).toBe(true);
    if (result.ok) {
      const serialized = JSON.stringify(result.value);
      expect(serialized).not.toContain("Sensitive Name");
      
    }
  });
});
  it("returns non-retryable REPORT_SOURCE_SNAPSHOT_INVALID when repository getByReportVersionId throws CORRUPT_REPORT_SOURCE_SNAPSHOT", async () => {
    const repository: ReportSourceSnapshotRepository = {
      getByReportVersionId: vi.fn().mockRejectedValue(new Error("CORRUPT_REPORT_SOURCE_SNAPSHOT")),
      persist: vi.fn(),
    };
    const database = createMockDatabase();
    const calculateSnapshot: ReportSnapshotCalculator = vi.fn();

    const service = createReportSourceSnapshotPreparationService({
      database,
      repository,
      calculateSnapshot,
    });

    const result = await service.prepare(createValidPayload());

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("REPORT_SOURCE_SNAPSHOT_INVALID");
      expect(result.error.retryable).toBe(false);
    }
    expect(database.select).not.toHaveBeenCalled();
    expect(calculateSnapshot).not.toHaveBeenCalled();
    expect(repository.persist).not.toHaveBeenCalled();
  });

  it("returns non-retryable REPORT_SOURCE_SNAPSHOT_INVALID when repository persist throws CORRUPT_REPORT_SOURCE_SNAPSHOT", async () => {
    const snapshot = createValidSnapshot();
    const repository: ReportSourceSnapshotRepository = {
      getByReportVersionId: vi.fn().mockResolvedValue(null),
      persist: vi.fn().mockRejectedValue(new Error("CORRUPT_REPORT_SOURCE_SNAPSHOT")),
    };
    const database = createMockDatabase({
      originalInput: validOriginalInput,
      normalizedInput: validNormalizedInput,
    });
    const calculateSnapshot: ReportSnapshotCalculator = vi.fn().mockResolvedValue({
      ok: true,
      value: snapshot,
    });

    const service = createReportSourceSnapshotPreparationService({
      database,
      repository,
      calculateSnapshot,
    });

    const result = await service.prepare(createValidPayload());

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("REPORT_SOURCE_SNAPSHOT_INVALID");
      expect(result.error.retryable).toBe(false);
    }
    expect(repository.persist).toHaveBeenCalled();
  });

  it("returns retryable REPORT_SOURCE_SNAPSHOT_UNAVAILABLE when repository persist throws transient DB error", async () => {
    const snapshot = createValidSnapshot();
    const repository: ReportSourceSnapshotRepository = {
      getByReportVersionId: vi.fn().mockResolvedValue(null),
      persist: vi.fn().mockRejectedValue(new Error("Connection reset by peer")),
    };
    const database = createMockDatabase({
      originalInput: validOriginalInput,
      normalizedInput: validNormalizedInput,
    });
    const calculateSnapshot: ReportSnapshotCalculator = vi.fn().mockResolvedValue({
      ok: true,
      value: snapshot,
    });

    const service = createReportSourceSnapshotPreparationService({
      database,
      repository,
      calculateSnapshot,
    });

    const result = await service.prepare(createValidPayload());

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("REPORT_SOURCE_SNAPSHOT_UNAVAILABLE");
      expect(result.error.retryable).toBe(true);
    }
  });

