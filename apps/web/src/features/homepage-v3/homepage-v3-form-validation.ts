import { validateWizardDate } from "../birth-profile/birth-wizard-state";
import type { HomepageV3BirthValues } from "./homepage-v3-birth-profile";

export type HomepageV3ValidationErrorKey =
  | "dateEmpty"
  | "dateImpossible"
  | "dateFuture"
  | "dateRange"
  | "time"
  | "branch"
  | "gender";

export type HomepageV3FormErrors = Partial<
  Record<"date" | "time" | "gender" | "storage", string>
>;

type FieldGroup = "date" | "time" | "gender";

/** Which `HomepageV3BirthValues` fields belong to each error group — used by
 * `reconcileHomepageV3Errors` to decide whether an edit touched a group at all. */
const GROUP_FIELDS: Record<FieldGroup, readonly (keyof HomepageV3BirthValues)[]> = {
  date: ["day", "month", "year", "calendarType", "isLeapMonth"],
  time: ["hour", "minute", "branch", "timeMode", "timeUnknown"],
  gender: ["gender"],
};

/** Pure validation, extracted from the hero form so it can run with an injected clock in
 * tests and so the hook can revalidate a single changed group without re-deriving the rest. */
export function validateHomepageV3BirthValues(
  values: HomepageV3BirthValues,
  referenceDate: Date,
  message: (key: HomepageV3ValidationErrorKey) => string,
): HomepageV3FormErrors {
  const found: HomepageV3FormErrors = {};
  const { day, month, year, calendarType } = values;
  if (!/^\d{1,2}$/.test(day) || !/^\d{1,2}$/.test(month) || !/^\d{4}$/.test(year)) {
    found.date = message("dateEmpty");
  } else {
    const result = validateWizardDate(day, month, year, { referenceDate, calendarType });
    if (!result.valid) {
      const outOfRange = Number(year) < 1920 || Number(year) > referenceDate.getFullYear();
      found.date =
        result.error === "FUTURE_DATE"
          ? message("dateFuture")
          : outOfRange
            ? message("dateRange")
            : message("dateImpossible");
    } else if (calendarType === "lunar" && Number(year) > referenceDate.getFullYear()) {
      found.date = message("dateRange");
    }
  }
  if (!values.timeUnknown && values.timeMode === "exact_minute") {
    const { hour, minute } = values;
    if (!/^\d{1,2}$/.test(hour) || !/^\d{1,2}$/.test(minute) || Number(hour) > 23 || Number(minute) > 59) {
      found.time = message("time");
    }
  }
  if (!values.timeUnknown && values.timeMode === "branch_only" && !values.branch) {
    found.time = message("branch");
  }
  if (!values.gender) found.gender = message("gender");
  return found;
}

/**
 * Merges freshly validated errors into the current error set, replacing only the groups
 * whose fields were actually touched by this edit. A bare `setErrors({})` on every keystroke
 * used to wipe out unrelated unresolved errors (2026-10-01 audit, F3) — e.g. fixing the date
 * after a failed submit silently hid the still-missing gender error instead of resolving it.
 * `storage` is never touched here: it is set only by a submit's save attempt and persists
 * across edits until the next submit retries the save.
 */
export function reconcileHomepageV3Errors(
  current: HomepageV3FormErrors,
  validated: HomepageV3FormErrors,
  changed: Partial<HomepageV3BirthValues>,
): HomepageV3FormErrors {
  const next: HomepageV3FormErrors = { ...current };
  const changedKeys = new Set(Object.keys(changed));
  for (const group of Object.keys(GROUP_FIELDS) as FieldGroup[]) {
    const touched = GROUP_FIELDS[group].some((field) => changedKeys.has(field));
    if (!touched) continue;
    if (validated[group]) next[group] = validated[group];
    else delete next[group];
  }
  return next;
}
