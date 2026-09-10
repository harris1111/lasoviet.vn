import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { BirthWizardReviewStep } from "./birth-wizard-review-step";
import { describe, expect, it } from "vitest";

import { buildBirthProfile } from "./birth-profile-input";
import {
  getWizardSubmitGuard,
  resolveWizardSubmitAction,
  getWizardSubmitButtonLabel,
  decideProfileSubmitOutcome,
  resolveUnknownTimePersistence,
  UnknownTimeSavedPresenter,
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

describe("BirthWizardReviewStep place rendering (TDD)", () => {
  const baseReviewProps = {
    title: "Kiểm tra thông tin",
    subtitle: "Rà soát lại toàn bộ thông tin",
    subjectSectionTitle: "Người được lập",
    birthSectionTitle: "Ngày, giờ sinh",
    editLabel: "Sửa",
    displayNameLabel: "Tên hiển thị",
    forWhomLabel: "Người được lập",
    dateLabel: "Ngày sinh dương lịch",
    timeLabel: "Giờ sinh",
    genderLabel: "Giới tính",
    placeLabel: "Nơi sinh",
    timezoneLabel: "Múi giờ tính toán",
    disclosure: "Thông tin sinh chỉ được xử lý...",
    guestNotice: "Dữ liệu tạm thời...",
    consentLabel: "Tôi đồng ý...",
    duplicateNotice: "Đang tiến hành...",
    displayName: "Bản thân",
    forWhom: "Bản thân",
    date: "18/08/1992",
    time: "09:30",
    gender: "Nam",
    timezone: "Asia/Ho_Chi_Minh",
    consent: true,
    pending: false,
    onEditSubject: () => {},
    onEditBirth: () => {},
    onConsentChange: () => {},
  };

  it("does not render the place row when place is empty or omitted", () => {
    const html = renderToStaticMarkup(
      createElement(BirthWizardReviewStep, {
        ...baseReviewProps,
        place: undefined,
      }),
    );
    expect(html).not.toContain("Nơi sinh");
    expect(html).not.toContain("—");
  });

  it("renders the place row when place is present", () => {
    const html = renderToStaticMarkup(
      createElement(BirthWizardReviewStep, {
        ...baseReviewProps,
        place: "Hà Nội, Việt Nam",
      }),
    );
    expect(html).toContain("Nơi sinh");
    expect(html).toContain("Hà Nội, Việt Nam");
  });
});

describe("WP-11 unknown birth time UX flow (TDD focused acceptance)", () => {
  const viLabels = {
    submit: "Lập lá số",
    submitting: "Đang lập lá số...",
    saveProfile: "Lưu hồ sơ",
    savingProfile: "Đang lưu hồ sơ...",
  };

  const enLabels = {
    submit: "Create chart",
    submitting: "Creating chart...",
    saveProfile: "Save profile",
    savingProfile: "Saving profile...",
  };

  it("Test 1: keeps honest unknown-time payload and remains valid for profile saving", () => {
    const honestProfile = buildBirthProfile({
      date: "1995-10-20",
      time: { precision: "unknown" },
      gender: "female",
      locale: "vi",
    });

    expect(honestProfile).toEqual({
      version: 1,
      calendar: { kind: "solar", date: "1995-10-20" },
      time: { precision: "unknown" },
      timezone: { ianaZone: "Asia/Ho_Chi_Minh" },
      gender: "female",
      consentVersion: "2026-09-01",
      locale: "vi",
    });
    expect(honestProfile.time).not.toHaveProperty("hour");
    expect(honestProfile.time).not.toHaveProperty("minute");
    expect(honestProfile.time).not.toHaveProperty("branch");

    // Proves unknown time is valid to submit from the review step
    expect(
      canSubmitWizard({
        step: 3,
        pending: false,
        consent: true,
        forWhom: "self",
        consentOther: false,
        dateValid: true,
        gender: "female",
        timeState: { precision: "unknown" },
      }),
    ).toBe(true);
  });

  it("Test 2: selects the save-profile labels when time precision is unknown", () => {
    // Vietnamese unknown-time labels
    expect(
      getWizardSubmitButtonLabel("unknown", false, viLabels),
    ).toBe("Lưu hồ sơ");
    expect(
      getWizardSubmitButtonLabel("unknown", true, viLabels),
    ).toBe("Đang lưu hồ sơ...");

    // English unknown-time labels
    expect(
      getWizardSubmitButtonLabel("unknown", false, enLabels),
    ).toBe("Save profile");
    expect(
      getWizardSubmitButtonLabel("unknown", true, enLabels),
    ).toBe("Saving profile...");

    // Contrasted with eligible exact-minute and branch-only labels
    expect(
      getWizardSubmitButtonLabel("exact_minute", false, viLabels),
    ).toBe("Lập lá số");
    expect(
      getWizardSubmitButtonLabel("exact_minute", true, viLabels),
    ).toBe("Đang lập lá số...");
    expect(
      getWizardSubmitButtonLabel("branch_only", false, enLabels),
    ).toBe("Create chart");
    expect(
      getWizardSubmitButtonLabel("branch_only", true, enLabels),
    ).toBe("Creating chart...");
  });

  it("Test 3: resolveUnknownTimePersistence confirms reusable persistence only for self + successful cache write", () => {
    // 1. self + successful cache write confirms browser persistence
    expect(
      resolveUnknownTimePersistence({ forWhom: "self", cacheSaved: true }),
    ).toBe(true);

    // 2. other-person input never claims browser persistence, even if cache write was attempted
    expect(
      resolveUnknownTimePersistence({ forWhom: "other", cacheSaved: true }),
    ).toBe(false);
    expect(
      resolveUnknownTimePersistence({ forWhom: "other", cacheSaved: false }),
    ).toBe(false);

    // 3. self + failed cache write does not claim browser persistence
    expect(
      resolveUnknownTimePersistence({ forWhom: "self", cacheSaved: false }),
    ).toBe(false);
  });

  it("Test 3a: self + successful cache write renders browser-saved confirmation and return-later action (vi)", () => {
    const onAddBirthTime = () => {};
    const onReturnHome = () => {};

    const html = renderToStaticMarkup(
      createElement(UnknownTimeSavedPresenter, {
        locale: "vi",
        isBrowserPersisted: true,
        onAddBirthTime,
        onReturnHome,
      }),
    );

    // Truthful browser persistence confirmation
    expect(html).toContain("Đã lưu hồ sơ sinh");
    expect(html).toContain("Thông tin sinh của bạn đã được lưu an toàn trên trình duyệt.");

    // Explanation of 2-hour branch requirement
    expect(html).toContain("12 Địa Chi");
    expect(html).toContain("khung 2 tiếng");

    // All 3 practical guidance sources
    expect(html).toContain("Giấy khai sinh");
    expect(html).toContain("bệnh viện");
    expect(html).toContain("Người thân trong gia đình");

    // Both actions present: add time now & return home
    expect(html).toContain("Bổ sung giờ sinh ngay");
    expect(html).toContain("Về trang chủ (đã lưu hồ sơ)");
    expect(html).toContain('href="/"');

    // Strict negative checks: No paid price, checkout, report selector, or chart created claims
    expect(html).not.toContain("19.000");
    expect(html).not.toContain("79.000");
    expect(html).not.toContain("19k");
    expect(html).not.toContain("79k");
    expect(html).not.toContain("60k");
    expect(html).not.toContain("₫");
    expect(html).not.toContain("thanh-toan");
    expect(html).not.toContain("checkout");
    expect(html).not.toContain("chon-luan-giai");
    expect(html).not.toContain("đã lập lá số");
    expect(html).not.toContain("đã tạo lá số");
    expect(html).not.toContain("lá số đã được lập");
  });

  it("Test 3b: self + successful cache write renders browser-saved confirmation and return-later action (en)", () => {
    const html = renderToStaticMarkup(
      createElement(UnknownTimeSavedPresenter, {
        locale: "en",
        isBrowserPersisted: true,
        onAddBirthTime: () => {},
        onReturnHome: () => {},
      }),
    );

    // Truthful browser persistence confirmation
    expect(html).toContain("Birth profile saved");
    expect(html).toContain("Your birth details have been securely saved in your browser.");

    // Requirement explanation
    expect(html).toContain("2-hour branch");

    // All 3 practical guidance sources
    expect(html).toContain("Birth certificate");
    expect(html).toContain("Hospital birth records");
    expect(html).toContain("Close family members");

    // Actions
    expect(html).toContain("Add birth time now");
    expect(html).toContain("Return to home (saved for later)");
    expect(html).toContain('href="/en"');

    // Strict negative checks
    expect(html).not.toContain("$");
    expect(html).not.toContain("19,000");
    expect(html).not.toContain("79,000");
    expect(html).not.toContain("checkout");
    expect(html).not.toContain("chon-luan-giai");
    expect(html).not.toContain("chart created");
    expect(html).not.toContain("chart has been created");
  });

  it("Test 3c: other-person input or failed cache write renders session-only copy and OMITS return-later action (vi)", () => {
    const onAddBirthTime = () => {};
    const onReturnHome = () => {};

    const html = renderToStaticMarkup(
      createElement(UnknownTimeSavedPresenter, {
        locale: "vi",
        isBrowserPersisted: false,
        onAddBirthTime,
        onReturnHome,
      }),
    );

    // Truthful session-only confirmation
    expect(html).toContain("Đã lưu hồ sơ sinh");
    expect(html).toContain("Thông tin sinh đã được ghi nhận trong phiên hiện tại.");

    // OMIT browser persistence claims
    expect(html).not.toContain("trình duyệt");
    expect(html).not.toContain("lưu an toàn trên trình duyệt");

    // OMIT return-later / return-home action
    expect(html).not.toContain("Về trang chủ");
    expect(html).not.toContain("đã lưu hồ sơ");
    expect(html).not.toContain("wizard-action-return-home");

    // RETAIN add birth time now action
    expect(html).toContain("Bổ sung giờ sinh ngay");

    // RETAIN all 3 practical guidance sources
    expect(html).toContain("Giấy khai sinh");
    expect(html).toContain("bệnh viện");
    expect(html).toContain("Người thân trong gia đình");

    // Strict negative checks: No paid price, checkout, or chart created claims
    expect(html).not.toContain("19.000");
    expect(html).not.toContain("79.000");
    expect(html).not.toContain("₫");
    expect(html).not.toContain("checkout");
    expect(html).not.toContain("chon-luan-giai");
    expect(html).not.toContain("đã lập lá số");
  });

  it("Test 3d: other-person input or failed cache write renders session-only copy and OMITS return-later action (en)", () => {
    const html = renderToStaticMarkup(
      createElement(UnknownTimeSavedPresenter, {
        locale: "en",
        isBrowserPersisted: false,
        onAddBirthTime: () => {},
        onReturnHome: () => {},
      }),
    );

    // Truthful session-only confirmation
    expect(html).toContain("Birth profile saved");
    expect(html).toContain("Birth details have been recorded for the current session.");

    // OMIT browser persistence claims
    expect(html).not.toContain("browser");
    expect(html).not.toContain("saved in your browser");

    // OMIT return-later / return-home action
    expect(html).not.toContain("Return to home");
    expect(html).not.toContain("saved for later");
    expect(html).not.toContain("wizard-action-return-home");

    // RETAIN add birth time now action
    expect(html).toContain("Add birth time now");

    // RETAIN all 3 practical guidance sources
    expect(html).toContain("Birth certificate");
    expect(html).toContain("Hospital birth records");
    expect(html).toContain("Close family members");

    // Strict negative checks
    expect(html).not.toContain("$");
    expect(html).not.toContain("19,000");
    expect(html).not.toContain("79,000");
    expect(html).not.toContain("checkout");
    expect(html).not.toContain("chart created");
  });

  it("Test 4: unknown-time post-save transition cannot request Zi Wei calculation", () => {
    // Ineligible profile save (e.g. unknown birth time)
    const unknownSaveResult = {
      ok: true,
      value: {
        revisionId: "rev-unknown-123",
        ziweiEligibility: { eligible: false },
      },
    };

    const outcome = decideProfileSubmitOutcome(unknownSaveResult);
    expect(outcome).toEqual({ kind: "SHOW_UNKNOWN_TIME_SAVED" });

    // Outcome is SHOW_UNKNOWN_TIME_SAVED, which does not contain revisionId or CALCULATE_CHART
    expect(outcome.kind).not.toBe("CALCULATE_CHART");
    expect(outcome).not.toHaveProperty("revisionId");
  });

  it("Test 6: exact-minute and branch-only submit decisions remain eligible for calculation", () => {
    // Exact minute eligible
    const exactSaveResult = {
      ok: true,
      value: {
        revisionId: "rev-exact-456",
        ziweiEligibility: { eligible: true },
      },
    };

    expect(decideProfileSubmitOutcome(exactSaveResult)).toEqual({
      kind: "CALCULATE_CHART",
      revisionId: "rev-exact-456",
    });

    // Branch only eligible
    const branchSaveResult = {
      ok: true,
      value: {
        revisionId: "rev-branch-789",
        ziweiEligibility: { eligible: true },
      },
    };

    expect(decideProfileSubmitOutcome(branchSaveResult)).toEqual({
      kind: "CALCULATE_CHART",
      revisionId: "rev-branch-789",
    });

    // Failed save returns error and does NOT transition to saved state or calculation
    const failedSaveResult = {
      ok: false,
    };
    expect(decideProfileSubmitOutcome(failedSaveResult)).toEqual({
      kind: "SUBMISSION_ERROR",
      errorKey: "errors.profile",
    });
  });
});
