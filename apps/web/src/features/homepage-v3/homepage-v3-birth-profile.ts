import type { BirthProfileDraftInput } from "../birth-profile/birth-profile-draft";
import { validateWizardDate } from "../birth-profile/birth-wizard-state";
import type { CanonicalBranchId, ReusableBirthTime } from "../birth-profile/homepage-birth-prefill";

/** Pure adapter between the V3 hero controls and the existing birth wizard. */
export type HomepageV3BirthValues = {
  displayName: string;
  gender: "male" | "female" | null;
  calendarType: "solar" | "lunar";
  isLeapMonth: boolean;
  day: string;
  month: string;
  year: string;
  timeMode: "exact_minute" | "branch_only";
  hour: string;
  minute: string;
  branch: CanonicalBranchId | "";
  timeUnknown: boolean;
  /** Topic picked on the hero paper; becomes the wizard's "top concern". Null means the visitor did not choose. */
  topConcern?: HomepageV3Interest | null;
};

export type HomepageV3Interest = "self_understanding" | "career" | "love";
export const HOMEPAGE_V3_INTERESTS: readonly HomepageV3Interest[] = ["self_understanding", "career", "love"];
const INTERESTS: readonly string[] = HOMEPAGE_V3_INTERESTS;

const BRANCHES: readonly string[] = [
  "zi", "chou", "yin", "mao", "chen", "si", "wu", "wei", "shen", "you", "xu", "hai",
];

function getTimeState(values: HomepageV3BirthValues): ReusableBirthTime | null {
  if (values.timeUnknown) return { precision: "unknown" };
  if (values.timeMode === "branch_only") {
    return BRANCHES.includes(values.branch)
      ? { precision: "branch_only", branch: values.branch as CanonicalBranchId }
      : null;
  }
  const hour = values.hour.trim();
  const minute = values.minute.trim();
  if (!/^\d{1,2}$/.test(hour) || !/^\d{1,2}$/.test(minute)) return null;
  if (Number(hour) > 23 || Number(minute) > 59) return null;
  return { precision: "exact_minute", hour: hour.padStart(2, "0"), minute: minute.padStart(2, "0") };
}

function hasValidBirthDate(values: HomepageV3BirthValues, now: Date): boolean {
  const { day, month, year } = values;
  if (!/^\d{1,2}$/.test(day) || !/^\d{1,2}$/.test(month) || !/^\d{4}$/.test(year)) return false;
  if (values.calendarType === "lunar" && Number(year) > now.getFullYear()) return false;
  return validateWizardDate(day, month, year, { referenceDate: now, calendarType: values.calendarType }).valid;
}

/**
 * `existing` is the draft already on disk (if any) before this submission. The V3 hero form
 * only ever collects birth fields, gender and an optional top concern — it has no UI for
 * "who is this for" or life stage, so a bare `toHomepageV3Draft(values)` used to hardcode
 * `forWhom: "self", consentOther: false` on every save. Since `saveBirthProfileDraft` replaces
 * the stored draft wholesale (not a deep merge), that silently reassigned an in-progress
 * "someone else" chart back to "self" the moment the hero form was resubmitted (2026-10-01
 * audit, Review Focus #1). Carrying `existing` forward preserves forWhom/consentOther/place
 * and the life-stage half of readingContext across that resubmit.
 */
export function toHomepageV3Draft(
  values: HomepageV3BirthValues,
  now: Date = new Date(),
  existing?: Pick<BirthProfileDraftInput, "forWhom" | "consentOther" | "place" | "readingContext"> | null,
): BirthProfileDraftInput | null {
  const timeState = getTimeState(values);
  if (!timeState || !values.gender || !hasValidBirthDate(values, now)) return null;

  const existingContext = existing?.readingContext;
  // An explicit non-null concern from this submission overrides topConcern and marks it
  // answered; otherwise keep whatever readingContext already existed (including a prior
  // topConcern) untouched rather than inventing or erasing one.
  const readingContext =
    values.topConcern && INTERESTS.includes(values.topConcern)
      ? {
          ...(existingContext?.lifeStage !== undefined ? { lifeStage: existingContext.lifeStage } : {}),
          topConcern: values.topConcern,
          skippedQuestions: {
            lifeStage: existingContext?.skippedQuestions?.lifeStage ?? false,
            topConcern: false,
          },
        }
      : existingContext;

  return {
    // Land on step 1 so the visitor can still choose "for someone else" before reviewing.
    step: 1,
    displayName: values.displayName.trim().slice(0, 80),
    forWhom: existing?.forWhom ?? "self",
    consentOther: existing?.consentOther ?? false,
    ...(existing?.place !== undefined ? { place: existing.place } : {}),
    gender: values.gender,
    calendarType: values.calendarType,
    isLeapMonth: values.calendarType === "lunar" && values.isLeapMonth,
    day: values.day.trim(),
    month: values.month.trim(),
    year: values.year.trim(),
    timeState,
    ...(readingContext ? { readingContext } : {}),
  };
}

/** V2 birth cache accepts solar ISO dates. Lunar values remain solely in the draft. */
export function toHomepageV3Prefill(values: HomepageV3BirthValues): {
  date: string;
  time: ReusableBirthTime;
  gender: "male" | "female";
  displayName: string;
} | null {
  const draft = toHomepageV3Draft(values);
  const time = getTimeState(values);
  if (!draft || !time || draft.calendarType !== "solar" || !draft.gender) return null;
  return {
    date: `${values.year.trim().padStart(4, "0")}-${values.month.trim().padStart(2, "0")}-${values.day.trim().padStart(2, "0")}`,
    time,
    gender: draft.gender,
    displayName: draft.displayName ?? "",
  };
}
