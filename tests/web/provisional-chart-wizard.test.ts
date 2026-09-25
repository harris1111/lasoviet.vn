import { describe, expect, it } from "vitest";

import type {
  NormalizedBirthProfileV1,
} from "@lasoviet/contracts";
import { IztroAdapter, iztroDefaultConfig } from "../../packages/engine-adapters/dist/index.js";
import {
  decideProfileSubmitOutcome,
  getWizardSubmitButtonLabel,
} from "../../apps/web/src/features/birth-profile/birth-profile-form";
import { buildFreeInsights } from "../../apps/web/src/features/ziwei/ziwei-free-insights";

describe("Provisional chart wizard and result flow (FD-103)", () => {
  it("determines CALCULATE_CHART outcome when birth time is unknown and provisional eligibility is granted", () => {
    const outcome = decideProfileSubmitOutcome({
      ok: true,
      value: {
        revisionId: "rev-provisional-103",
        ziweiEligibility: { eligible: true, provisional: true },
      },
    });

    expect(outcome).toEqual({
      kind: "CALCULATE_CHART",
      revisionId: "rev-provisional-103",
    });
  });

  it("selects appropriate provisional continuation button label for unknown birth time", () => {
    const labels = {
      submit: "Lập lá số",
      submitting: "Đang lập lá số...",
      saveProfile: "Lập lá số tạm tính (tiếp tục với giờ chưa rõ)",
      savingProfile: "Đang lập lá số tạm tính...",
    };

    expect(getWizardSubmitButtonLabel("unknown", false, labels)).toBe(
      "Lập lá số tạm tính (tiếp tục với giờ chưa rõ)",
    );
    expect(getWizardSubmitButtonLabel("unknown", true, labels)).toBe(
      "Đang lập lá số tạm tính...",
    );
  });

  it("calculates a complete provisional chart from iztro adapter when time precision is unknown", async () => {
    const unknownProfile: NormalizedBirthProfileV1 = {
      version: 1,
      originalInput: {
        version: 1,
        calendar: { kind: "solar", date: "1994-06-15" },
        time: { precision: "unknown" },
        timezone: { offsetMinutes: 420 },
        gender: "female",
        consentVersion: "2026-09-01",
      },
      normalizedCalendar: { kind: "solar", date: "1994-06-15" },
      normalizedTime: { precision: "unknown" },
      timezoneProvenance: { source: "offset", offsetMinutes: 420 },
      utcInstant: "1994-06-15T00:00:00.000Z",
      normalizationWarnings: [],
      limitations: ["TIME_UNKNOWN", "BIRTH_TIME_UNKNOWN_PROVISIONAL"],
    };

    const adapter = new IztroAdapter();
    const calculation = await adapter.calculateWithPrivateSnapshot(
      { birthProfile: unknownProfile },
      iztroDefaultConfig,
    );

    expect(calculation.result.ok).toBe(true);
    if (!calculation.result.ok) return;

    const chart = calculation.result.output;
    expect(chart.provisional).toBe(true);
    expect(chart.timePrecision).toBe("unknown");
    expect(chart.palaces).toHaveLength(12);
    expect(calculation.result.provenance.limitations).toContain(
      "BIRTH_TIME_UNKNOWN_PROVISIONAL",
    );
    expect(
      chart.warnings.some(
        (w) => w.code === "ziwei.warning.birth-time-unknown-provisional",
      ),
    ).toBe(true);

    // Free insights acknowledge provisional status
    const insights = buildFreeInsights(chart, "vi", "Chi");
    expect(insights.items[0]?.description).toContain("Ước tính tạm tính");
  });
});
