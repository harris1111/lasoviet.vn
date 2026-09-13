import { describe, expect, it } from "vitest";

import {
  ZIWEI_PALACE_IDS,
  ZiweiReportSnapshotV1Schema,
  type NormalizedBirthProfileV1,
} from "@lasoviet/contracts";

import {
  calculateIztroReportSnapshot,
  IZTRO_ADAPTER_VERSION,
  ZIWEI_SENSITIVITY_RULE_VERSION_V1,
  ZIWEI_TIMING_RULE_VERSION_V1,
} from "../index.js";

function createProfile(overrides: {
  calendarKind?: "solar" | "lunar";
  date?: string;
  isLeapMonth?: boolean;
  timePrecision?: "exact_minute" | "branch_only" | "unknown";
  localTime?: string;
  branch?: string;
  gender?: "male" | "female" | "Nam" | "Nữ";
  placeLabel?: string;
  displayName?: string;
} = {}): NormalizedBirthProfileV1 {
  const calendarKind = overrides.calendarKind ?? "solar";
  const date = overrides.date ?? "1995-06-15";
  const localTime = overrides.localTime ?? "12:00";
  const gender = overrides.gender ?? "male";

  return {
    version: 1,
    originalInput: {
      version: 1,
      calendar: {
        kind: calendarKind,
        date,
        ...(calendarKind === "lunar" ? { isLeapMonth: Boolean(overrides.isLeapMonth) } : {}),
      },
      time: overrides.timePrecision === "branch_only"
        ? { precision: "branch_only", branch: (overrides.branch ?? "wu") as any }
        : overrides.timePrecision === "unknown"
        ? { precision: "unknown" }
        : { precision: "exact_minute", localTime },
      timezone: { offsetMinutes: 420 },
      gender,
      placeLabel: overrides.placeLabel,
      displayName: overrides.displayName,
      consentVersion: "2026-09-01",
    },
    normalizedCalendar: {
      kind: calendarKind,
      date,
      ...(calendarKind === "lunar" ? { isLeapMonth: Boolean(overrides.isLeapMonth) } : {}),
    },
    normalizedTime: overrides.timePrecision === "branch_only"
      ? { precision: "branch_only", branch: (overrides.branch ?? "wu") as any }
      : overrides.timePrecision === "unknown"
      ? { precision: "unknown" }
      : { precision: "exact_minute", localTime },
    timezoneProvenance: { source: "offset", offsetMinutes: 420 },
    utcInstant: "1995-06-15T05:00:00.000Z",
    normalizationWarnings: [],
    limitations: [],
  };
}

describe("calculateIztroReportSnapshot", () => {
  it("calculates an ordinary selected index (Horse, index 6) with previous (5) and next (7) on same civil date", async () => {
    const profile = createProfile({ localTime: "12:00" });
    const result = await calculateIztroReportSnapshot({
      chartVersionId: "chart-v1-uuid",
      birthProfile: profile,
      asOfDate: "2026-09-12",
      targetYear: 2026,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(ZiweiReportSnapshotV1Schema.safeParse(result.value).success).toBe(true);
    expect(result.value.sensitivity.selectedFrame).toEqual({
      position: "selected",
      vendorTimeIndex: 6,
      civilDateOffset: 0,
      frameId: "ziwei.time-frame.horse",
    });
    expect(result.value.sensitivity.previousFrame).toEqual({
      position: "previous",
      vendorTimeIndex: 5,
      civilDateOffset: 0,
      frameId: "ziwei.time-frame.snake",
    });
    expect(result.value.sensitivity.nextFrame).toEqual({
      position: "next",
      vendorTimeIndex: 7,
      civilDateOffset: 0,
      frameId: "ziwei.time-frame.goat",
    });
  });

  it("handles early Zi (index 0, 00:30) with previous index 12 on prior civil date (offset -1) and next index 1 (offset 0)", async () => {
    const profile = createProfile({ date: "2000-01-02", localTime: "00:30" });
    const result = await calculateIztroReportSnapshot({
      chartVersionId: "chart-early-zi",
      birthProfile: profile,
      asOfDate: "2026-09-12",
      targetYear: 2026,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(ZiweiReportSnapshotV1Schema.safeParse(result.value).success).toBe(true);
    expect(result.value.sensitivity.selectedFrame).toEqual({
      position: "selected",
      vendorTimeIndex: 0,
      civilDateOffset: 0,
      frameId: "ziwei.time-frame.rat",
    });
    expect(result.value.sensitivity.previousFrame).toEqual({
      position: "previous",
      vendorTimeIndex: 12,
      civilDateOffset: -1,
      frameId: "ziwei.time-frame.late-rat",
    });
    expect(result.value.sensitivity.nextFrame).toEqual({
      position: "next",
      vendorTimeIndex: 1,
      civilDateOffset: 0,
      frameId: "ziwei.time-frame.ox",
    });
  });

  it("handles late Zi (index 12, 23:30) with previous index 11 (offset 0) and next index 0 on next civil date (offset +1)", async () => {
    const profile = createProfile({ date: "2000-01-02", localTime: "23:30" });
    const result = await calculateIztroReportSnapshot({
      chartVersionId: "chart-late-zi",
      birthProfile: profile,
      asOfDate: "2026-09-12",
      targetYear: 2026,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(ZiweiReportSnapshotV1Schema.safeParse(result.value).success).toBe(true);
    expect(result.value.sensitivity.selectedFrame).toEqual({
      position: "selected",
      vendorTimeIndex: 12,
      civilDateOffset: 0,
      frameId: "ziwei.time-frame.late-rat",
    });
    expect(result.value.sensitivity.previousFrame).toEqual({
      position: "previous",
      vendorTimeIndex: 11,
      civilDateOffset: 0,
      frameId: "ziwei.time-frame.pig",
    });
    expect(result.value.sensitivity.nextFrame).toEqual({
      position: "next",
      vendorTimeIndex: 0,
      civilDateOffset: 1,
      frameId: "ziwei.time-frame.rat",
    });
  });

  it("accepts lunar calendar input through selected solarDate canonicalization for neighboring frames", async () => {
    const profile = createProfile({
      calendarKind: "lunar",
      date: "1990-01-15",
      isLeapMonth: false,
      localTime: "08:00",
    });
    const result = await calculateIztroReportSnapshot({
      chartVersionId: "chart-lunar",
      birthProfile: profile,
      asOfDate: "2026-09-12",
      targetYear: 2026,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(ZiweiReportSnapshotV1Schema.safeParse(result.value).success).toBe(true);
    expect(result.value.sensitivity.selectedFrame.vendorTimeIndex).toBe(4);
    expect(result.value.sensitivity.previousFrame.vendorTimeIndex).toBe(3);
    expect(result.value.sensitivity.nextFrame.vendorTimeIndex).toBe(5);
  });

  it("verifies timing has 12 canonical ordered palaces, 10-year decadal range, annual target year 2026, exact provenance", async () => {
    const profile = createProfile({ date: "2000-01-01", localTime: "12:00" });
    const result = await calculateIztroReportSnapshot({
      chartVersionId: "chart-timing-check",
      birthProfile: profile,
      asOfDate: "2026-09-12",
      targetYear: 2026,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const snapshot = result.value;

    expect(snapshot.timing.decadal.state).toBe("active");
    if (snapshot.timing.decadal.state !== "active") return;

    expect(snapshot.timing.decadal.palaces).toHaveLength(12);
    expect(snapshot.timing.decadal.palaces.map((p) => p.palaceId)).toEqual(ZIWEI_PALACE_IDS);

    expect(snapshot.timing.annual.palaces).toHaveLength(12);
    expect(snapshot.timing.annual.palaces.map((p) => p.palaceId)).toEqual(ZIWEI_PALACE_IDS);

    // Verify metadata presence and stability for all 12 canonical decadal and annual palaces
    for (const p of snapshot.timing.decadal.palaces) {
      expect(p.heavenlyStemId).toMatch(/^ziwei\.stem\.[a-z0-9-]+$/);
      expect(p.earthlyBranchId).toMatch(/^ziwei\.branch\.[a-z0-9-]+$/);
      expect(typeof p.isOriginalPalace).toBe("boolean");
      expect(p.cycleStateId).toMatch(/^ziwei\.cycle\.[a-z0-9-]+$/);
    }
    expect(snapshot.timing.decadal.palaces.filter((p) => p.isOriginalPalace)).toHaveLength(1);

    for (const p of snapshot.timing.annual.palaces) {
      expect(p.heavenlyStemId).toMatch(/^ziwei\.stem\.[a-z0-9-]+$/);
      expect(p.earthlyBranchId).toMatch(/^ziwei\.branch\.[a-z0-9-]+$/);
      expect(typeof p.isOriginalPalace).toBe("boolean");
      expect(p.cycleStateId).toMatch(/^ziwei\.cycle\.[a-z0-9-]+$/);
    }
    expect(snapshot.timing.annual.palaces.filter((p) => p.isOriginalPalace)).toHaveLength(1);

    const [ageStart, ageEnd] = snapshot.timing.decadal.ageRange;
    expect(ageEnd - ageStart).toBe(9);

    const [yearStart, yearEnd] = snapshot.timing.decadal.yearRange;
    expect(yearEnd - yearStart).toBe(9);
    expect(2026).toBeGreaterThanOrEqual(yearStart);
    expect(2026).toBeLessThanOrEqual(yearEnd);

    expect(snapshot.timing.annual.targetYear).toBe(2026);

    expect(snapshot.timing.provenance).toEqual({
      engineId: "ziwei.iztro",
      engineVersion: "2.6.0",
      adapterId: "ziwei.iztro-adapter",
      adapterVersion: IZTRO_ADAPTER_VERSION,
      ruleSetId: "ziwei.default",
      config: {
        yearDivide: "normal",
        horoscopeDivide: "normal",
        ageDivide: "normal",
        dayDivide: "current",
      },
    });

    expect(snapshot.timing.provenance.adapterVersion).toBe("1");
    expect(snapshot.timingRuleVersion).toBe(ZIWEI_TIMING_RULE_VERSION_V1);
    expect(snapshot.sensitivityRuleVersion).toBe(ZIWEI_SENSITIVITY_RULE_VERSION_V1);
  });

  it("maps annualLayer.palaceId to annual cycle palace at yearly.palaceNames[yearly.index], distinguishing from natal physical palace", async () => {
    // For 1995-06-15 12:00 evaluated on 2026-09-12 (year 2026, Ngọ):
    // yearly.index is 4 (branch woo).
    // The annual cycle palace at index 4 is "soul" -> maps to "ziwei.palace.life".
    // The natal physical palace at index 4 is "surface" -> maps to "ziwei.palace.travel".
    const profile = createProfile({ date: "1995-06-15", localTime: "12:00" });
    const result = await calculateIztroReportSnapshot({
      chartVersionId: "chart-annual-cycle-palace-distinction",
      birthProfile: profile,
      asOfDate: "2026-09-12",
      targetYear: 2026,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value.timing.annual.palaceId).toBe("ziwei.palace.life");
    expect(result.value.timing.annual.palaceId).not.toBe("ziwei.palace.travel");
  });

  it("handles pre-decadal evaluation (e.g. 2025 infant evaluated in 2026) emitting state not_started with no fabricated active fields", async () => {
    // For a child born 2025-06-15 evaluated on 2026-09-12 (targetYear 2026):
    // The first decadal cycle for Fire 6th starts at age 6 in year 2030.
    // Emits not_started with firstCycleStartAge 6, firstCycleStartYear 2030,
    // continues annual calculation normally (targetYear 2026) with no fabricated active decadal fields.
    const profile = createProfile({ date: "2025-06-15", localTime: "12:00" });
    const result = await calculateIztroReportSnapshot({
      chartVersionId: "chart-pre-decadal-infant",
      birthProfile: profile,
      asOfDate: "2026-09-12",
      targetYear: 2026,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(ZiweiReportSnapshotV1Schema.safeParse(result.value).success).toBe(true);
    expect(result.value.timing.decadal.state).toBe("not_started");
    if (result.value.timing.decadal.state === "not_started") {
      expect(result.value.timing.decadal.firstCycleStartAge).toBe(6);
      expect(result.value.timing.decadal.firstCycleStartYear).toBe(2030);
    }

    // Assert no fabricated active fields
    expect("palaceId" in result.value.timing.decadal).toBe(false);
    expect("heavenlyStemId" in result.value.timing.decadal).toBe(false);
    expect("earthlyBranchId" in result.value.timing.decadal).toBe(false);
    expect("palaces" in result.value.timing.decadal).toBe(false);
    expect("index" in result.value.timing.decadal).toBe(false);
    expect("ageRange" in result.value.timing.decadal).toBe(false);
    expect("yearRange" in result.value.timing.decadal).toBe(false);

    // Assert annual and sensitivity proceed normally
    expect(result.value.timing.annual.targetYear).toBe(2026);
    expect(result.value.timing.annual.palaces).toHaveLength(12);
    expect(result.value.sensitivity.selectedFrame.vendorTimeIndex).toBe(6);
  });

  it("returns fail-closed ENGINE_INPUT_INVALID when targetYear is after all supported decadal cycles", async () => {
    const profile = createProfile({ date: "1995-06-15", localTime: "12:00" });
    // Evaluated in year 2200, which exceeds 120+ years of decadalList
    const result = await calculateIztroReportSnapshot({
      chartVersionId: "chart-post-decadal-expired",
      birthProfile: profile,
      asOfDate: "2200-09-12",
      targetYear: 2200,
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("ENGINE_INPUT_INVALID");
  });

  it("produces deterministic identical snapshotHash on replay", async () => {
    const profile = createProfile({ date: "1988-10-20", localTime: "16:45" });
    const input = {
      chartVersionId: "chart-replay-uuid",
      birthProfile: profile,
      asOfDate: "2026-09-12",
      targetYear: 2026,
    };

    const run1 = await calculateIztroReportSnapshot(input);
    const run2 = await calculateIztroReportSnapshot(input);

    expect(run1.ok).toBe(true);
    expect(run2.ok).toBe(true);
    if (!run1.ok || !run2.ok) return;

    expect(run1.value.provenance.snapshotHash).toBe(run2.value.provenance.snapshotHash);
    expect(run1.value).toEqual(run2.value);
  });

  it("rejects mismatch between targetYear and asOfDate year", async () => {
    const profile = createProfile();
    const result = await calculateIztroReportSnapshot({
      chartVersionId: "chart-mismatch",
      birthProfile: profile,
      asOfDate: "2026-09-12",
      targetYear: 2025,
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("ENGINE_INPUT_INVALID");
  });

  it("strictly excludes raw profile PII fields and distinct fixture values from serialized output", async () => {
    const distinctPlace = "HA_NOI_DISTINCT_LOCATION_TOKEN_987";
    const distinctName = "NGUYEN_VAN_DISTINCT_NAME_TOKEN_654";
    const distinctDate = "1993-07-21";
    const distinctTime = "14:27";

    const profile = createProfile({
      date: distinctDate,
      localTime: distinctTime,
      gender: "female",
      placeLabel: distinctPlace,
      displayName: distinctName,
    });

    const result = await calculateIztroReportSnapshot({
      chartVersionId: "chart-pii-check",
      birthProfile: profile,
      asOfDate: "2026-09-12",
      targetYear: 2026,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const serialized = JSON.stringify(result.value);

    // Literal value checks
    expect(serialized.includes(distinctPlace)).toBe(false);
    expect(serialized.includes(distinctName)).toBe(false);
    expect(serialized.includes(distinctDate)).toBe(false);
    expect(serialized.includes(distinctTime)).toBe(false);
    expect(serialized.includes("female")).toBe(false);

    // Recursive key check
    const forbiddenKeys = new Set([
      "calendar",
      "date",
      "localTime",
      "placeLabel",
      "displayName",
      "originalInput",
      "normalizedTime",
      "timezoneProvenance",
      "gender",
    ]);

    function assertNoForbiddenKeys(obj: unknown, path: string = ""): void {
      if (obj !== null && typeof obj === "object") {
        if (Array.isArray(obj)) {
          obj.forEach((item, idx) => assertNoForbiddenKeys(item, path + "[" + idx + "]"));
        } else {
          for (const key of Object.keys(obj)) {
            if (forbiddenKeys.has(key)) {
              throw new Error("Forbidden PII key " + key + " found at path " + path + "." + key);
            }
            assertNoForbiddenKeys((obj as Record<string, unknown>)[key], path + "." + key);
          }
        }
      }
    }

    expect(() => assertNoForbiddenKeys(result.value)).not.toThrow();
  });

  it("enforces no overlap between stableFactKeys and sensitiveFacts keys", async () => {
    const profile = createProfile({ date: "1992-04-10", localTime: "06:15" });
    const result = await calculateIztroReportSnapshot({
      chartVersionId: "chart-key-overlap-check",
      birthProfile: profile,
      asOfDate: "2026-09-12",
      targetYear: 2026,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const stableSet = new Set(result.value.sensitivity.stableFactKeys);
    expect(stableSet.size).toBe(result.value.sensitivity.stableFactKeys.length); // no duplicates
    expect(stableSet.size).toBeGreaterThanOrEqual(1);

    const sensitiveSet = new Set<string>();
    for (const sf of result.value.sensitivity.sensitiveFacts) {
      expect(sensitiveSet.has(sf.factKey)).toBe(false); // no duplicates
      expect(stableSet.has(sf.factKey)).toBe(false); // no overlap
      sensitiveSet.add(sf.factKey);

      expect(sf.variants).toHaveLength(3);
      expect(sf.variants[0]!.position).toBe("previous");
      expect(sf.variants[1]!.position).toBe("selected");
      expect(sf.variants[2]!.position).toBe("next");
    }
  });

  it("rejects profiles with unknown time precision", async () => {
    const profile = createProfile({ timePrecision: "unknown" });
    const result = await calculateIztroReportSnapshot({
      chartVersionId: "chart-unknown-time",
      birthProfile: profile,
      asOfDate: "2026-09-12",
      targetYear: 2026,
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("ENGINE_INPUT_INVALID");
  });

  it("rejects unsupported engine configuration", async () => {
    const profile = createProfile();
    const result = await calculateIztroReportSnapshot(
      {
        chartVersionId: "chart-bad-config",
        birthProfile: profile,
        asOfDate: "2026-09-12",
        targetYear: 2026,
      },
      { dayDivide: "exact" as any },
    );

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("ENGINE_INPUT_INVALID");
  });
});
