import { describe, expect, it } from "vitest";

import { buildBirthProfile } from "./birth-profile-input";
import {
  getWizardSubmitGuard,
  resolveWizardSubmitAction,
} from "./birth-profile-form";
import {
  canAdvanceStep1,
  canAdvanceStep2,
  canSubmitWizard,
  formatDateSummary,
  formatReviewTimeSummary,
  splitIsoDateToParts,
  validateWizardDate,
} from "./birth-wizard-state";

describe("birth profile form payload", () => {
  it("builds the exact-time happy-path payload with consent version and local timezone", () => {
    expect(
      buildBirthProfile({
        date: "1990-01-01",
        hour: "09",
        minute: "30",
        timeUnknown: false,
        gender: "male",
        locale: "vi",
      }),
    ).toEqual({
      version: 1,
      calendar: { kind: "solar", date: "1990-01-01" },
      time: { precision: "exact_minute", localTime: "09:30" },
      timezone: { ianaZone: "Asia/Ho_Chi_Minh" },
      gender: "male",
      consentVersion: "2026-09-01",
      locale: "vi",
    });
  });

  it("builds an honest unknown-time payload rather than inventing a time", () => {
    expect(
      buildBirthProfile({
        date: "1990-01-01",
        hour: "",
        minute: "",
        timeUnknown: true,
        gender: "female",
        locale: "en",
      }),
    ).toMatchObject({
      time: { precision: "unknown" },
      locale: "en",
    });
  });

  it("builds branch_only payload with canonical branch (si) without synthesizing minute or HH:00", () => {
    const profile = buildBirthProfile({
      date: "1994-04-12",
      time: { precision: "branch_only", branch: "si" },
      gender: "female",
      locale: "vi",
    });

    expect(profile).toEqual({
      version: 1,
      calendar: { kind: "solar", date: "1994-04-12" },
      time: { precision: "branch_only", branch: "si" },
      timezone: { ianaZone: "Asia/Ho_Chi_Minh" },
      gender: "female",
      consentVersion: "2026-09-01",
      locale: "vi",
    });
    expect((profile.time as { localTime?: string }).localTime).toBeUndefined();
  });

  it("preserves trimmed placeLabel when non-empty and submits IANA timezone", () => {
    expect(
      buildBirthProfile({
        date: "1992-08-18",
        time: { precision: "exact_minute", hour: "09", minute: "30" },
        placeLabel: "   Hà Nội, Việt Nam   ",
        gender: "male",
        locale: "vi",
      }),
    ).toMatchObject({
      placeLabel: "Hà Nội, Việt Nam",
      timezone: { ianaZone: "Asia/Ho_Chi_Minh" },
    });
  });

  it("omits placeLabel when empty or only whitespace", () => {
    const profile = buildBirthProfile({
      date: "1992-08-18",
      time: { precision: "exact_minute", hour: "09", minute: "30" },
      placeLabel: "    ",
      gender: "male",
      locale: "vi",
    });
    expect(profile).not.toHaveProperty("placeLabel");
  });

  it("supports discriminated precision state for exact_minute, branch_only, and unknown", () => {
    expect(
      buildBirthProfile({
        date: "1988-08-08",
        time: { precision: "exact_minute", hour: "14", minute: "15" },
        gender: "male",
        locale: "en",
      }),
    ).toMatchObject({
      time: { precision: "exact_minute", localTime: "14:15" },
    });

    expect(
      buildBirthProfile({
        date: "1988-08-08",
        time: { precision: "unknown" },
        gender: "male",
        locale: "en",
      }),
    ).toMatchObject({
      time: { precision: "unknown" },
    });
  });
});

describe("wizard state helpers (TDD)", () => {
  it("splits an ISO date from homepage prefill into visible day, month, and year parts", () => {
    expect(splitIsoDateToParts("1994-04-12")).toEqual({
      day: "12",
      month: "04",
      year: "1994",
    });
    expect(splitIsoDateToParts("1990-01-05")).toEqual({
      day: "05",
      month: "01",
      year: "1990",
    });
    expect(splitIsoDateToParts("")).toEqual({
      day: "",
      month: "",
      year: "",
    });
    expect(splitIsoDateToParts("invalid-date")).toEqual({
      day: "",
      month: "",
      year: "",
    });
  });

  it("validates valid solar dates and pads single-digit values", () => {
    expect(validateWizardDate("12", "04", "1994")).toEqual({
      valid: true,
      isoDate: "1994-04-12",
    });
    expect(validateWizardDate("5", "9", "1990")).toEqual({
      valid: true,
      isoDate: "1990-09-05",
    });
    expect(validateWizardDate("29", "2", "2024")).toEqual({
      valid: true,
      isoDate: "2024-02-29",
    });
    expect(validateWizardDate("1", "1", "1899")).toEqual({
      valid: true,
      isoDate: "1899-01-01",
    });
  });

  it("rejects impossible calendar dates before step advancement", () => {
    expect(validateWizardDate("29", "2", "2023")).toEqual({
      valid: false,
      error: "IMPOSSIBLE_DATE",
    });
    expect(validateWizardDate("31", "4", "2024")).toEqual({
      valid: false,
      error: "IMPOSSIBLE_DATE",
    });
    expect(validateWizardDate("32", "1", "1990")).toEqual({
      valid: false,
      error: "INVALID_FORMAT",
    });
    expect(validateWizardDate("1", "13", "1990")).toEqual({
      valid: false,
      error: "INVALID_FORMAT",
    });
    expect(validateWizardDate("", "4", "1994")).toEqual({
      valid: false,
      error: "EMPTY",
    });
  });
  it("rejects future dates against deterministic reference date", () => {
    const referenceDate = new Date(2026, 8, 5);
    expect(validateWizardDate("5", "9", "2026", referenceDate)).toEqual({
      valid: true,
      isoDate: "2026-09-05",
    });
    expect(validateWizardDate("6", "9", "2026", referenceDate)).toEqual({
      valid: false,
      error: "FUTURE_DATE",
    });
    expect(validateWizardDate("1", "10", "2026", referenceDate)).toEqual({
      valid: false,
      error: "FUTURE_DATE",
    });
    expect(validateWizardDate("1", "1", "2027", referenceDate)).toEqual({
      valid: false,
      error: "FUTURE_DATE",
    });
  });

  it("requires other-person permission only for the other-person path", () => {
    expect(canAdvanceStep1({ forWhom: "self", consentOther: false })).toBe(true);
    expect(canAdvanceStep1({ forWhom: "self", consentOther: true })).toBe(true);
    expect(canAdvanceStep1({ forWhom: "other", consentOther: false })).toBe(false);
    expect(canAdvanceStep1({ forWhom: "other", consentOther: true })).toBe(true);
    expect(canAdvanceStep1({ forWhom: null, consentOther: false })).toBe(false);
  });

  it("validates step 2 advancement across exact, branch-only, and unknown time with gender", () => {
    expect(
      canAdvanceStep2({
        dateValid: true,
        gender: "male",
        timeState: { precision: "exact_minute", hour: "09", minute: "30" },
      }),
    ).toBe(true);
    expect(
      canAdvanceStep2({
        dateValid: true,
        gender: "female",
        timeState: { precision: "branch_only", branch: "si" },
      }),
    ).toBe(true);
    expect(
      canAdvanceStep2({
        dateValid: true,
        gender: "male",
        timeState: { precision: "unknown" },
      }),
    ).toBe(true);
    expect(
      canAdvanceStep2({
        dateValid: false,
        gender: "male",
        timeState: { precision: "exact_minute", hour: "09", minute: "30" },
      }),
    ).toBe(false);
    expect(
      canAdvanceStep2({
        dateValid: true,
        gender: null,
        timeState: { precision: "exact_minute", hour: "09", minute: "30" },
      }),
    ).toBe(false);
    expect(
      canAdvanceStep2({
        dateValid: true,
        gender: "male",
        timeState: { precision: "exact_minute", hour: "25", minute: "30" },
      }),
    ).toBe(false);
  });

  it("formats review time and date summaries accurately", () => {
    expect(
      formatReviewTimeSummary({ precision: "exact_minute", hour: "9", minute: "5" }, "vi"),
    ).toBe("09:05");
    expect(
      formatReviewTimeSummary({ precision: "branch_only", branch: "si" }, "vi"),
    ).toBe("Tỵ (09:00 - 11:00)");
    expect(formatReviewTimeSummary({ precision: "unknown" }, "vi")).toBe("Không rõ giờ sinh");
    expect(formatDateSummary("12", "04", "1994")).toBe("12/04/1994");
    expect(formatDateSummary("", "", "")).toBe("—");
  });

  describe("canSubmitWizard (TDD submit guard)", () => {
    const validBaseline = {
      step: 3,
      pending: false,
      consent: true,
      forWhom: "self" as const,
      consentOther: false,
      dateValid: true,
      gender: "male" as const,
      timeState: { precision: "exact_minute" as const, hour: "09", minute: "30" },
    };

    it("allows submission on step 3 with full consent and valid profile data", () => {
      expect(canSubmitWizard(validBaseline)).toBe(true);
    });

    it("rejects submission if step is not 3", () => {
      expect(canSubmitWizard({ ...validBaseline, step: 1 })).toBe(false);
      expect(canSubmitWizard({ ...validBaseline, step: 2 })).toBe(false);
    });

    it("rejects submission if pending is true", () => {
      expect(canSubmitWizard({ ...validBaseline, pending: true })).toBe(false);
    });

    it("rejects submission if processing consent is false", () => {
      expect(canSubmitWizard({ ...validBaseline, consent: false })).toBe(false);
    });

    it("rejects submission if forWhom is other without consentOther", () => {
      expect(
        canSubmitWizard({
          ...validBaseline,
          forWhom: "other",
          consentOther: false,
        }),
      ).toBe(false);
      expect(
        canSubmitWizard({
          ...validBaseline,
          forWhom: "other",
          consentOther: true,
        }),
      ).toBe(true);
    });

    it("rejects submission if date is not valid", () => {
      expect(canSubmitWizard({ ...validBaseline, dateValid: false })).toBe(false);
    });

    it("rejects submission if gender is null", () => {
      expect(canSubmitWizard({ ...validBaseline, gender: null })).toBe(false);
    });

    it("rejects submission if step 2 time validation fails", () => {
      expect(
        canSubmitWizard({
          ...validBaseline,
          timeState: { precision: "exact_minute", hour: "25", minute: "00" },
        }),
      ).toBe(false);
    });

    it("allows submission for valid branch_only and unknown time states", () => {
      expect(
        canSubmitWizard({
          ...validBaseline,
          gender: "female",
          timeState: { precision: "branch_only", branch: "si" },
        }),
      ).toBe(true);

      expect(
        canSubmitWizard({
          ...validBaseline,
          gender: "female",
          timeState: { precision: "unknown" },
        }),
      ).toBe(true);
    });
  });
  describe("wizard submit guard and action resolver (TDD convergence)", () => {
    const validBaseline = {
      step: 3,
      pending: false,
      consent: true,
      forWhom: "self" as const,
      consentOther: false,
      dateValid: true,
      gender: "male" as const,
      timeState: { precision: "exact_minute" as const, hour: "09", minute: "30" },
    };

    it("guarantees button disabled state and submit execution never diverge across all guard conditions", () => {
      const scenarios = [
        { name: "valid baseline on step 3", input: validBaseline, shouldAllow: true },
        { name: "step 1", input: { ...validBaseline, step: 1 }, shouldAllow: false },
        { name: "step 2", input: { ...validBaseline, step: 2 }, shouldAllow: false },
        { name: "pending active", input: { ...validBaseline, pending: true }, shouldAllow: false },
        { name: "consent missing", input: { ...validBaseline, consent: false }, shouldAllow: false },
        {
          name: "other-person missing consent",
          input: { ...validBaseline, forWhom: "other" as const, consentOther: false },
          shouldAllow: false,
        },
        { name: "invalid date", input: { ...validBaseline, dateValid: false }, shouldAllow: false },
        { name: "missing gender", input: { ...validBaseline, gender: null }, shouldAllow: false },
        {
          name: "invalid exact hour",
          input: {
            ...validBaseline,
            timeState: { precision: "exact_minute" as const, hour: "25", minute: "00" },
          },
          shouldAllow: false,
        },
      ];

      for (const scenario of scenarios) {
        const guard = getWizardSubmitGuard(scenario.input);
        expect(guard.canSubmit, "canSubmit for " + scenario.name).toBe(scenario.shouldAllow);
        expect(guard.buttonDisabled, "buttonDisabled for " + scenario.name).toBe(!scenario.shouldAllow);
        expect(guard.canExecuteSubmit, "canExecuteSubmit for " + scenario.name).toBe(scenario.shouldAllow);
        expect(guard.buttonDisabled).toBe(!guard.canExecuteSubmit);
      }
    });

    it("resolves exact action for step advancement, error fallback, or proceeding to submit", () => {
      expect(resolveWizardSubmitAction(validBaseline)).toEqual({ kind: "PROCEED" });

      expect(resolveWizardSubmitAction({ ...validBaseline, pending: true })).toEqual({
        kind: "ABORT_PENDING",
      });

      expect(resolveWizardSubmitAction({ ...validBaseline, step: 1 })).toEqual({
        kind: "ADVANCE_STEP_1",
      });

      expect(resolveWizardSubmitAction({ ...validBaseline, step: 2 })).toEqual({
        kind: "ADVANCE_STEP_2",
      });

      expect(
        resolveWizardSubmitAction({ ...validBaseline, forWhom: "other", consentOther: false }),
      ).toEqual({ kind: "ERROR_CONSENT_OTHER" });

      expect(resolveWizardSubmitAction({ ...validBaseline, gender: null })).toEqual({
        kind: "ERROR_GENDER",
      });

      expect(resolveWizardSubmitAction({ ...validBaseline, dateValid: false })).toEqual({
        kind: "ERROR_INVALID_DATE",
      });

      expect(
        resolveWizardSubmitAction({ ...validBaseline, consent: false }),
      ).toEqual({ kind: "ERROR_PROFILE" });
    });
  });
});
