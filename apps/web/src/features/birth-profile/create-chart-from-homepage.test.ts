import { describe, expect, it, vi } from "vitest";


import {
  createChartFromHomepage,
  type CreateChartFromHomepageDependencies,
  type CreateChartFromHomepageInput,
} from "./create-chart-from-homepage";

const base: CreateChartFromHomepageInput = {
  locale: "vi",
  date: "1993-07-25",
  calendarType: "solar",
  isLeapMonth: false,
  time: { precision: "exact_minute", hour: "6", minute: "40" },
  gender: "female",
  displayName: "Lan",
  consent: true,
  forOther: false,
  consentOther: false,
  topConcern: "career",
};

function setup(overrides: {
  save?: ReturnType<typeof vi.fn>;
  calculate?: ReturnType<typeof vi.fn>;
} = {}) {
  const saveBirthProfile =
    overrides.save ??
    vi.fn().mockResolvedValue({ ok: true, value: { revisionId: "rev-1", ziweiEligibility: { eligible: true } } });
  const calculateZiweiChart =
    overrides.calculate ?? vi.fn().mockResolvedValue({ ok: true, value: { chartId: "chart-9" } });
  return {
    saveBirthProfile,
    calculateZiweiChart,
    create: createChartFromHomepage({
      saveBirthProfile: saveBirthProfile as unknown as CreateChartFromHomepageDependencies["saveBirthProfile"],
      calculateZiweiChart: calculateZiweiChart as unknown as CreateChartFromHomepageDependencies["calculateZiweiChart"],
    }),
  };
}

describe("createChartFromHomepage", () => {
  it("saves the profile with consent and the concern, then returns the chart id", async () => {
    const { create, saveBirthProfile, calculateZiweiChart } = setup();
    await expect(create(base)).resolves.toEqual({ ok: true, chartId: "chart-9" });
    const saved = saveBirthProfile.mock.calls[0]![0];
    expect(saved.explicitConsent).toBe(true);
    expect(saved.readingContext).toEqual({ version: 1, topConcern: "career" });
    expect(saved.profile).toMatchObject({
      calendar: { kind: "solar", date: "1993-07-25" },
      time: { precision: "exact_minute", localTime: "06:40" },
      timezone: { ianaZone: "Asia/Ho_Chi_Minh" },
      gender: "female",
      displayName: "Lan",
    });
    expect(calculateZiweiChart).toHaveBeenCalledWith("vi", "rev-1");
  });

  it("never saves anything without the visitor's consent", async () => {
    const { create, saveBirthProfile } = setup();
    await expect(create({ ...base, consent: false })).resolves.toEqual({ ok: false, code: "CONSENT_REQUIRED" });
    expect(saveBirthProfile).not.toHaveBeenCalled();
  });

  it("requires the other person's consent when the chart is for someone else", async () => {
    const { create, saveBirthProfile } = setup();
    await expect(create({ ...base, forOther: true, consentOther: false })).resolves.toEqual({
      ok: false,
      code: "CONSENT_OTHER_REQUIRED",
    });
    expect(saveBirthProfile).not.toHaveBeenCalled();
    await expect(create({ ...base, forOther: true, consentOther: true })).resolves.toMatchObject({ ok: true });
  });

  it("rejects malformed input before any call", async () => {
    const { create, saveBirthProfile } = setup();
    await expect(create({ ...base, date: "1993-13-40" })).resolves.toEqual({ ok: false, code: "INVALID_INPUT" });
    await expect(create({ ...base, time: { precision: "exact_minute", hour: "25", minute: "0" } })).resolves.toEqual({
      ok: false,
      code: "INVALID_INPUT",
    });
    expect(saveBirthProfile).not.toHaveBeenCalled();
  });

  it("omits the reading context when no concern was chosen", async () => {
    const { create, saveBirthProfile } = setup();
    await create({ ...base, topConcern: null });
    expect(saveBirthProfile.mock.calls[0]![0].readingContext).toBeUndefined();
  });

  it("reports an unknown birth time as saved without a chart", async () => {
    const save = vi.fn().mockResolvedValue({ ok: true, value: { revisionId: "rev-2", ziweiEligibility: { eligible: false } } });
    const { create, calculateZiweiChart } = setup({ save });
    await expect(create({ ...base, time: { precision: "unknown" } })).resolves.toEqual({
      ok: false,
      code: "TIME_UNKNOWN_SAVED",
    });
    expect(calculateZiweiChart).not.toHaveBeenCalled();
  });

  it("maps save and calculation failures to distinct codes", async () => {
    await expect(setup({ save: vi.fn().mockResolvedValue({ ok: false }) }).create(base)).resolves.toEqual({
      ok: false,
      code: "PROFILE_FAILED",
    });
    await expect(
      setup({ save: vi.fn().mockResolvedValue({ ok: false, error: { code: "VALIDATION_FAILED" } }) }).create(base),
    ).resolves.toEqual({ ok: false, code: "INVALID_INPUT" });
    await expect(
      setup({ calculate: vi.fn().mockResolvedValue({ ok: false, error: { code: "CALCULATION_FAILED" } }) }).create(base),
    ).resolves.toEqual({ ok: false, code: "CALCULATION_FAILED" });
    await expect(
      setup({ calculate: vi.fn().mockResolvedValue({ ok: false, error: { code: "ZIWEI_TIME_INELIGIBLE" } }) }).create(base),
    ).resolves.toEqual({ ok: false, code: "TIME_UNKNOWN_SAVED" });
  });
});
