import type { BirthTimeState } from "./birth-profile-input";
import {
  getBranchOptionLabel,
  isValidSolarDate,
} from "./homepage-birth-prefill";

export function splitIsoDateToParts(isoDate: string): {
  day: string;
  month: string;
  year: string;
} {
  if (!isoDate || typeof isoDate !== "string") {
    return { day: "", month: "", year: "" };
  }
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate.trim());
  if (!match) {
    return { day: "", month: "", year: "" };
  }
  const [, y, m, d] = match;
  return {
    day: d ?? "",
    month: m ?? "",
    year: y ?? "",
  };
}

export type WizardDateValidationResult =
  | { valid: true; isoDate: string }
  | {
      valid: false;
      error: "EMPTY" | "INVALID_FORMAT" | "IMPOSSIBLE_DATE" | "FUTURE_DATE";
    };

export function validateWizardDate(
  dayStr: string,
  monthStr: string,
  yearStr: string,
  referenceDate?: Date,
): WizardDateValidationResult {
  const dTrim = dayStr.trim();
  const mTrim = monthStr.trim();
  const yTrim = yearStr.trim();

  if (dTrim === "" || mTrim === "" || yTrim === "") {
    return { valid: false, error: "EMPTY" };
  }

  if (!/^\d+$/.test(dTrim) || !/^\d+$/.test(mTrim) || !/^\d+$/.test(yTrim)) {
    return { valid: false, error: "INVALID_FORMAT" };
  }

  const d = Number.parseInt(dTrim, 10);
  const m = Number.parseInt(mTrim, 10);
  const y = Number.parseInt(yTrim, 10);

  if (d < 1 || d > 31 || m < 1 || m > 12) {
    return { valid: false, error: "INVALID_FORMAT" };
  }

  if (!isValidSolarDate(y, m, d)) {
    return { valid: false, error: "IMPOSSIBLE_DATE" };
  }

  const ref = referenceDate ?? new Date();
  const refLimit = Math.max(
    Date.UTC(ref.getFullYear(), ref.getMonth(), ref.getDate()),
    Date.UTC(ref.getUTCFullYear(), ref.getUTCMonth(), ref.getUTCDate()),
  );
  const inputUtc = Date.UTC(y, m - 1, d);

  if (inputUtc > refLimit) {
    return { valid: false, error: "FUTURE_DATE" };
  }

  const isoDate = `${y.toString().padStart(4, "0")}-${m
    .toString()
    .padStart(2, "0")}-${d.toString().padStart(2, "0")}`;

  return { valid: true, isoDate };
}

export function canAdvanceStep1(input: {
  forWhom: "self" | "other" | null;
  consentOther: boolean;
}): boolean {
  if (!input.forWhom) return false;
  if (input.forWhom === "other") return input.consentOther;
  return true;
}

export function canAdvanceStep2(input: {
  dateValid: boolean;
  gender: "male" | "female" | null;
  timeState: BirthTimeState;
}): boolean {
  if (!input.dateValid || input.gender === null) {
    return false;
  }

  if (input.timeState.precision === "unknown") {
    return true;
  }

  if (input.timeState.precision === "branch_only") {
    return input.timeState.branch !== undefined;
  }

  if (input.timeState.precision === "exact_minute") {
    const hTrim = input.timeState.hour.trim();
    const mTrim = input.timeState.minute.trim();
    if (hTrim === "" || mTrim === "") return false;
    if (!/^\d+$/.test(hTrim) || !/^\d+$/.test(mTrim)) return false;
    const h = Number.parseInt(hTrim, 10);
    const mi = Number.parseInt(mTrim, 10);
    return h >= 0 && h <= 23 && mi >= 0 && mi <= 59;
  }

  return false;
}

export function canSubmitWizard(input: {
  step: number;
  pending: boolean;
  consent: boolean;
  forWhom: "self" | "other" | null;
  consentOther: boolean;
  dateValid: boolean;
  gender: "male" | "female" | null;
  timeState: BirthTimeState;
}): boolean {
  if (input.step !== 3) return false;
  if (input.pending) return false;
  if (!input.consent) return false;
  if (
    !canAdvanceStep1({
      forWhom: input.forWhom,
      consentOther: input.consentOther,
    })
  ) {
    return false;
  }
  if (!input.dateValid || input.gender === null) {
    return false;
  }
  if (
    !canAdvanceStep2({
      dateValid: input.dateValid,
      gender: input.gender,
      timeState: input.timeState,
    })
  ) {
    return false;
  }
  return true;
}

export function formatReviewTimeSummary(
  state: BirthTimeState,
  locale: "en" | "vi",
): string {
  if (state.precision === "unknown") {
    return locale === "en" ? "Birth time unknown" : "Không rõ giờ sinh";
  }
  if (state.precision === "branch_only") {
    return getBranchOptionLabel(state.branch, locale);
  }
  const h = state.hour.trim().padStart(2, "0");
  const m = state.minute.trim().padStart(2, "0");
  return `${h}:${m}`;
}

export function formatDateSummary(
  day: string,
  month: string,
  year: string,
): string {
  const d = day.trim();
  const m = month.trim();
  const y = year.trim();
  if (d && m && y) {
    return `${d.padStart(2, "0")}/${m.padStart(2, "0")}/${y}`;
  }
  return "—";
}