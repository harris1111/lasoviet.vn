import { validateWizardDate } from "../birth-profile/birth-wizard-state";
import { CANONICAL_BRANCH_IDS } from "../birth-profile/homepage-birth-prefill";
import { getHeroLogoStage, type HeroLogoStage } from "./hero-logo/hero-logo-progress";
import type { HomepageV3BirthValues } from "./homepage-v3-birth-profile";

/** 0 empty, 1 valid date, 2 valid time (or explicit unknown), 3 a name as well. */
export type HeroPaintStage = 0 | 1 | 2 | 3;

export type HeroTime =
  | { kind: "exact"; hour: string; minute: string }
  | { kind: "branch"; index: number }
  | { kind: "unknown" };

export type HeroStage = {
  stage: HeroPaintStage;
  logoStage: HeroLogoStage;
  dateValid: boolean;
  timeValid: boolean;
  genderSelected: boolean;
  date: { day: string; month: string; year: string; calendarType: "solar" | "lunar"; isLeapMonth: boolean } | null;
  time: HeroTime | null;
  /** Earthly branch of the birth hour to highlight. Null for unknown time or an incomplete form. */
  branchIndex: number | null;
  name: string;
};

/** Tý covers 23:00-00:59, so the hour is shifted by one before halving. */
export function hourToBranchIndex(hour: number): number {
  return Math.floor(((hour + 1) % 24) / 2);
}

const ONE_OR_TWO = /^\d{1,2}$/;

function isDateValid(values: HomepageV3BirthValues, now: Date): boolean {
  const { day, month, year, calendarType } = values;
  if (!ONE_OR_TWO.test(day) || !ONE_OR_TWO.test(month) || !/^\d{4}$/.test(year)) return false;
  if (!validateWizardDate(day, month, year, { referenceDate: now, calendarType }).valid) return false;
  return !(calendarType === "lunar" && Number(year) > now.getFullYear());
}

function readTime(values: HomepageV3BirthValues): HeroTime | null {
  if (values.timeUnknown) return { kind: "unknown" };
  if (values.timeMode === "branch_only") {
    const index = CANONICAL_BRANCH_IDS.indexOf(values.branch as (typeof CANONICAL_BRANCH_IDS)[number]);
    return index >= 0 ? { kind: "branch", index } : null;
  }
  const { hour, minute } = values;
  if (!ONE_OR_TWO.test(hour) || !ONE_OR_TWO.test(minute)) return null;
  if (Number(hour) > 23 || Number(minute) > 59) return null;
  return { kind: "exact", hour, minute };
}

/**
 * Single source of truth for how far the hero art and logo are revealed.
 * Pure and driven only by the form values, so restoring a draft lands on the saved stage.
 */
export function deriveHeroStage(values: HomepageV3BirthValues, now: Date): HeroStage {
  const dateValid = isDateValid(values, now);
  const time = readTime(values);
  const timeValid = time !== null;
  const genderSelected = values.gender === "male" || values.gender === "female";
  const name = values.displayName.trim();

  const stage: HeroPaintStage = !dateValid ? 0 : !timeValid ? 1 : !name ? 2 : 3;
  let branchIndex: number | null = null;
  if (dateValid && time?.kind === "exact") branchIndex = hourToBranchIndex(Number(time.hour));
  if (dateValid && time?.kind === "branch") branchIndex = time.index;

  return {
    stage,
    logoStage: getHeroLogoStage({ dateValid, timeValid, genderSelected }),
    dateValid,
    timeValid,
    genderSelected,
    date: dateValid
      ? {
          day: values.day,
          month: values.month,
          year: values.year,
          calendarType: values.calendarType,
          isLeapMonth: values.calendarType === "lunar" && values.isLeapMonth,
        }
      : null,
    time: dateValid ? time : null,
    branchIndex,
    name: dateValid ? name : "",
  };
}
