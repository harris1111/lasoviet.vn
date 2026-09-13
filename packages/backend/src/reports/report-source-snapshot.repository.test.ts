import { describe, expect, it, vi } from "vitest";
import { ZIWEI_PALACE_IDS, type ZiweiTimingPalace, type ZiweiReportSnapshotV1, type ReportSourceSnapshotV1 } from "@lasoviet/contracts";
import { createDatabaseReportSourceSnapshotRepository } from "./report-source-snapshot.repository.js";

function create12Palaces(): ZiweiTimingPalace[] {
  return ZIWEI_PALACE_IDS.map((palaceId, idx) => ({
    palaceId,
    heavenlyStemId: "ziwei.stem.bing",
    earthlyBranchId: "ziwei.branch.rat",
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

function createValidSnapshot(): ZiweiReportSnapshotV1 {
  const chartVersionId = "chart-v1-uuid";
  const timingRuleVersion = "ziwei.timing.v1";
  const sensitivityRuleVersion = "ziwei.sensitivity.v1";
  const snapshotHash = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

  return {
    version: 1,
    chartVersionId,
    asOfDate: "2026-09-12",
    timezone: "Asia/Ho_Chi_Minh",
    timingRuleVersion,
    sensitivityRuleVersion,
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
      chartVersionId,
      timingRuleVersion,
      sensitivityRuleVersion,
      snapshotHash,
    },
  };
}

function createValidSourceSnapshot(): ReportSourceSnapshotV1 {
  const snapshot = createValidSnapshot();
  return {
    version: 1,
    reportId: "a0000000-0000-4000-8000-000000000001",
    reportVersionId: "b0000000-0000-4000-8000-000000000002",
    chartVersionId: snapshot.chartVersionId,
    asOfDate: snapshot.asOfDate,
    targetYear: 2026,
    timingRuleVersion: snapshot.timingRuleVersion,
    sensitivityRuleVersion: snapshot.sensitivityRuleVersion,
    snapshotHash: snapshot.provenance.snapshotHash,
    snapshot,
  };
}

describe("createDatabaseReportSourceSnapshotRepository", () => {
  describe("persist", () => {
    it("successfully persists a valid source snapshot on first attempt", async () => {
      const valid = createValidSourceSnapshot();
      const createdDate = new Date("2026-09-12T00:00:00Z");

      const insertedRow = {
        id: "c0000000-0000-4000-8000-000000000003",
        reportId: valid.reportId,
        reportVersionId: valid.reportVersionId,
        chartVersionId: valid.chartVersionId,
        asOfDate: valid.asOfDate,
        targetYear: valid.targetYear,
        timingRuleVersion: valid.timingRuleVersion,
        sensitivityRuleVersion: valid.sensitivityRuleVersion,
        snapshotHash: valid.snapshotHash,
        snapshot: valid.snapshot,
        createdAt: createdDate,
      };

      const mockDb = {
        insert: vi.fn().mockReturnValue({
          values: vi.fn().mockReturnValue({
            onConflictDoNothing: vi.fn().mockReturnValue({
              returning: vi.fn().mockResolvedValue([insertedRow]),
            }),
          }),
        }),
        select: vi.fn(),
      };

      const repo = createDatabaseReportSourceSnapshotRepository(mockDb as never);
      const result = await repo.persist(valid);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.id).toBe(insertedRow.id);
        expect(result.value.reportVersionId).toBe(valid.reportVersionId);
        expect(result.value.snapshotHash).toBe(valid.snapshotHash);
        expect(result.value.targetYear).toBe(2026);
      }
    });

    it("returns REPORT_SOURCE_SNAPSHOT_INVALID for invalid input schema", async () => {
      const mockDb = {
        insert: vi.fn(),
        select: vi.fn(),
      };

      const repo = createDatabaseReportSourceSnapshotRepository(mockDb as never);
      const result = await repo.persist({ invalid: true });

      expect(result).toEqual({
        ok: false,
        error: {
          code: "REPORT_SOURCE_SNAPSHOT_INVALID",
          messageKey: "reports.report_source_snapshot_invalid",
          retryable: false,
        },
      });
      expect(mockDb.insert).not.toHaveBeenCalled();
    });

    it("returns REPORT_SOURCE_SNAPSHOT_INVALID if raw birth profile fields are included", async () => {
      const valid = createValidSourceSnapshot();
      const mockDb = {
        insert: vi.fn(),
        select: vi.fn(),
      };

      const repo = createDatabaseReportSourceSnapshotRepository(mockDb as never);
      const result = await repo.persist({
        ...valid,
        birthDate: "1990-01-01",
      });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("REPORT_SOURCE_SNAPSHOT_INVALID");
      }
      expect(mockDb.insert).not.toHaveBeenCalled();
    });

    it("idempotently returns existing record when exact match already exists", async () => {
      const valid = createValidSourceSnapshot();
      const existingDate = new Date("2026-09-12T00:00:00Z");

      const existingRow = {
        id: "c0000000-0000-4000-8000-000000000003",
        reportId: valid.reportId,
        reportVersionId: valid.reportVersionId,
        chartVersionId: valid.chartVersionId,
        asOfDate: valid.asOfDate,
        targetYear: valid.targetYear,
        timingRuleVersion: valid.timingRuleVersion,
        sensitivityRuleVersion: valid.sensitivityRuleVersion,
        snapshotHash: valid.snapshotHash,
        snapshot: valid.snapshot,
        createdAt: existingDate,
      };

      const mockDb = {
        insert: vi.fn().mockReturnValue({
          values: vi.fn().mockReturnValue({
            onConflictDoNothing: vi.fn().mockReturnValue({
              returning: vi.fn().mockResolvedValue([]), // Conflict, nothing inserted
            }),
          }),
        }),
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([existingRow]),
            }),
          }),
        }),
      };

      const repo = createDatabaseReportSourceSnapshotRepository(mockDb as never);
      const result = await repo.persist(valid);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.id).toBe(existingRow.id);
        expect(result.value.reportVersionId).toBe(valid.reportVersionId);
      }
    });

    it("returns REPORT_SOURCE_SNAPSHOT_CONFLICT when existing record has different snapshotHash", async () => {
      const valid = createValidSourceSnapshot();

      const conflictingRow = {
        id: "c0000000-0000-4000-8000-000000000003",
        reportId: valid.reportId,
        reportVersionId: valid.reportVersionId,
        chartVersionId: valid.chartVersionId,
        asOfDate: valid.asOfDate,
        targetYear: valid.targetYear,
        timingRuleVersion: valid.timingRuleVersion,
        sensitivityRuleVersion: valid.sensitivityRuleVersion,
        snapshotHash: "ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff", // Different!
        snapshot: valid.snapshot,
        createdAt: new Date(),
      };

      const mockDb = {
        insert: vi.fn().mockReturnValue({
          values: vi.fn().mockReturnValue({
            onConflictDoNothing: vi.fn().mockReturnValue({
              returning: vi.fn().mockResolvedValue([]),
            }),
          }),
        }),
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([conflictingRow]),
            }),
          }),
        }),
      };

      const repo = createDatabaseReportSourceSnapshotRepository(mockDb as never);
      const result = await repo.persist(valid);

      expect(result).toEqual({
        ok: false,
        error: {
          code: "REPORT_SOURCE_SNAPSHOT_CONFLICT",
          messageKey: "reports.report_source_snapshot_conflict",
          retryable: false,
        },
      });
    });

    it("returns REPORT_SOURCE_SNAPSHOT_CONFLICT when existing record has different chartVersionId", async () => {
      const valid = createValidSourceSnapshot();

      const conflictingRow = {
        id: "c0000000-0000-4000-8000-000000000003",
        reportId: valid.reportId,
        reportVersionId: valid.reportVersionId,
        chartVersionId: "different-chart-id",
        asOfDate: valid.asOfDate,
        targetYear: valid.targetYear,
        timingRuleVersion: valid.timingRuleVersion,
        sensitivityRuleVersion: valid.sensitivityRuleVersion,
        snapshotHash: valid.snapshotHash,
        snapshot: valid.snapshot,
        createdAt: new Date(),
      };

      const mockDb = {
        insert: vi.fn().mockReturnValue({
          values: vi.fn().mockReturnValue({
            onConflictDoNothing: vi.fn().mockReturnValue({
              returning: vi.fn().mockResolvedValue([]),
            }),
          }),
        }),
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([conflictingRow]),
            }),
          }),
        }),
      };

      const repo = createDatabaseReportSourceSnapshotRepository(mockDb as never);
      const result = await repo.persist(valid);

      expect(result).toEqual({
        ok: false,
        error: {
          code: "REPORT_SOURCE_SNAPSHOT_CONFLICT",
          messageKey: "reports.report_source_snapshot_conflict",
          retryable: false,
        },
      });
    });

    it("returns REPORT_SOURCE_SNAPSHOT_CONFLICT when existing record cannot be found after conflict", async () => {
      const valid = createValidSourceSnapshot();

      const mockDb = {
        insert: vi.fn().mockReturnValue({
          values: vi.fn().mockReturnValue({
            onConflictDoNothing: vi.fn().mockReturnValue({
              returning: vi.fn().mockResolvedValue([]),
            }),
          }),
        }),
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([]), // Missing row
            }),
          }),
        }),
      };

      const repo = createDatabaseReportSourceSnapshotRepository(mockDb as never);
      const result = await repo.persist(valid);

      expect(result).toEqual({
        ok: false,
        error: {
          code: "REPORT_SOURCE_SNAPSHOT_CONFLICT",
          messageKey: "reports.report_source_snapshot_conflict",
          retryable: false,
        },
      });
    });
  });

  describe("getByReportVersionId", () => {
    it("returns mapped snapshot record when found", async () => {
      const valid = createValidSourceSnapshot();
      const existingDate = new Date("2026-09-12T00:00:00Z");

      const existingRow = {
        id: "c0000000-0000-4000-8000-000000000003",
        reportId: valid.reportId,
        reportVersionId: valid.reportVersionId,
        chartVersionId: valid.chartVersionId,
        asOfDate: valid.asOfDate,
        targetYear: valid.targetYear,
        timingRuleVersion: valid.timingRuleVersion,
        sensitivityRuleVersion: valid.sensitivityRuleVersion,
        snapshotHash: valid.snapshotHash,
        snapshot: valid.snapshot,
        createdAt: existingDate,
      };

      const mockDb = {
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([existingRow]),
            }),
          }),
        }),
      };

      const repo = createDatabaseReportSourceSnapshotRepository(mockDb as never);
      const record = await repo.getByReportVersionId(valid.reportVersionId);

      expect(record).not.toBeNull();
      expect(record?.id).toBe(existingRow.id);
      expect(record?.reportVersionId).toBe(valid.reportVersionId);
      expect(record?.snapshotHash).toBe(valid.snapshotHash);
    });

    it("returns null when not found", async () => {
      const mockDb = {
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([]),
            }),
          }),
        }),
      };

      const repo = createDatabaseReportSourceSnapshotRepository(mockDb as never);
      const record = await repo.getByReportVersionId("b0000000-0000-4000-8000-000000000002");

      expect(record).toBeNull();
    });

    it("returns null for empty reportVersionId", async () => {
      const mockDb = {
        select: vi.fn(),
      };

      const repo = createDatabaseReportSourceSnapshotRepository(mockDb as never);
      const record = await repo.getByReportVersionId("   ");

      expect(record).toBeNull();
      expect(mockDb.select).not.toHaveBeenCalled();
    });

    it("throws when snapshot payload in database is corrupt", async () => {
      const mockDb = {
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([
                {
                  id: "c0000000-0000-4000-8000-000000000003",
                  reportId: "a0000000-0000-4000-8000-000000000001",
                  reportVersionId: "b0000000-0000-4000-8000-000000000002",
                  chartVersionId: "chart-1",
                  asOfDate: "2026-09-12",
                  targetYear: 2026,
                  timingRuleVersion: "v1",
                  sensitivityRuleVersion: "v1",
                  snapshotHash: "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
                  snapshot: { corrupted: true }, // Invalid snapshot
                  createdAt: new Date(),
                },
              ]),
            }),
          }),
        }),
      };

      const repo = createDatabaseReportSourceSnapshotRepository(mockDb as never);
      await expect(
        repo.getByReportVersionId("b0000000-0000-4000-8000-000000000002"),
      ).rejects.toThrow("CORRUPT_REPORT_SOURCE_SNAPSHOT");
    });

    function createMockRepoWithRow(row: unknown) {
      const mockDb = {
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([row]),
            }),
          }),
        }),
      };
      return createDatabaseReportSourceSnapshotRepository(mockDb as never);
    }

    function createValidRow() {
      const valid = createValidSourceSnapshot();
      return {
        id: "c0000000-0000-4000-8000-000000000003",
        reportId: valid.reportId,
        reportVersionId: valid.reportVersionId,
        chartVersionId: valid.chartVersionId,
        asOfDate: valid.asOfDate,
        targetYear: valid.targetYear,
        timingRuleVersion: valid.timingRuleVersion,
        sensitivityRuleVersion: valid.sensitivityRuleVersion,
        snapshotHash: valid.snapshotHash,
        snapshot: valid.snapshot,
        createdAt: new Date("2026-09-12T00:00:00Z"),
      };
    }

    it("rejects when top-level reportId is not a valid UUID", async () => {
      const row = { ...createValidRow(), reportId: "not-a-valid-uuid" };
      const repo = createMockRepoWithRow(row);
      await expect(repo.getByReportVersionId(row.reportVersionId)).rejects.toThrow(
        "CORRUPT_REPORT_SOURCE_SNAPSHOT",
      );
    });

    it("rejects when top-level reportVersionId is not a valid UUID", async () => {
      const row = { ...createValidRow(), reportVersionId: "not-a-valid-uuid" };
      const repo = createMockRepoWithRow(row);
      await expect(repo.getByReportVersionId("not-a-valid-uuid")).rejects.toThrow(
        "CORRUPT_REPORT_SOURCE_SNAPSHOT",
      );
    });

    it("rejects when top-level chartVersionId does not match snapshot chartVersionId", async () => {
      const row = { ...createValidRow(), chartVersionId: "mismatched-chart-id" };
      const repo = createMockRepoWithRow(row);
      await expect(repo.getByReportVersionId(row.reportVersionId)).rejects.toThrow(
        "CORRUPT_REPORT_SOURCE_SNAPSHOT",
      );
    });

    it("rejects when top-level asOfDate does not match snapshot asOfDate", async () => {
      const row = { ...createValidRow(), asOfDate: "2026-01-01" };
      const repo = createMockRepoWithRow(row);
      await expect(repo.getByReportVersionId(row.reportVersionId)).rejects.toThrow(
        "CORRUPT_REPORT_SOURCE_SNAPSHOT",
      );
    });

    it("rejects when top-level targetYear does not match asOfDate year", async () => {
      const row = { ...createValidRow(), targetYear: 2025 };
      const repo = createMockRepoWithRow(row);
      await expect(repo.getByReportVersionId(row.reportVersionId)).rejects.toThrow(
        "CORRUPT_REPORT_SOURCE_SNAPSHOT",
      );
    });

    it("rejects when top-level targetYear does not match snapshot annual targetYear", async () => {
      const row = { ...createValidRow(), asOfDate: "2027-09-12", targetYear: 2027 };
      const repo = createMockRepoWithRow(row);
      await expect(repo.getByReportVersionId(row.reportVersionId)).rejects.toThrow(
        "CORRUPT_REPORT_SOURCE_SNAPSHOT",
      );
    });

    it("rejects when top-level timingRuleVersion does not match snapshot timingRuleVersion", async () => {
      const row = { ...createValidRow(), timingRuleVersion: "ziwei.timing.v2" };
      const repo = createMockRepoWithRow(row);
      await expect(repo.getByReportVersionId(row.reportVersionId)).rejects.toThrow(
        "CORRUPT_REPORT_SOURCE_SNAPSHOT",
      );
    });

    it("rejects when top-level sensitivityRuleVersion does not match snapshot sensitivityRuleVersion", async () => {
      const row = { ...createValidRow(), sensitivityRuleVersion: "ziwei.sensitivity.v2" };
      const repo = createMockRepoWithRow(row);
      await expect(repo.getByReportVersionId(row.reportVersionId)).rejects.toThrow(
        "CORRUPT_REPORT_SOURCE_SNAPSHOT",
      );
    });

    it("rejects when top-level snapshotHash format is invalid", async () => {
      const row = { ...createValidRow(), snapshotHash: "invalid-hash" };
      const repo = createMockRepoWithRow(row);
      await expect(repo.getByReportVersionId(row.reportVersionId)).rejects.toThrow(
        "CORRUPT_REPORT_SOURCE_SNAPSHOT",
      );
    });

    it("rejects when top-level snapshotHash does not match snapshot provenance snapshotHash", async () => {
      const row = {
        ...createValidRow(),
        snapshotHash: "abcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcd",
      };
      const repo = createMockRepoWithRow(row);
      await expect(repo.getByReportVersionId(row.reportVersionId)).rejects.toThrow(
        "CORRUPT_REPORT_SOURCE_SNAPSHOT",
      );
    });
  });
});
