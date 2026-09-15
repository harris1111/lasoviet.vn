import {
  LifeStageV1Schema,
  type LifeStageV1,
  TopConcernV1Schema,
  type TopConcernV1,
} from "@lasoviet/contracts";
import { z } from "zod";

import type { BirthTimeState } from "./birth-profile-input";
import {
  getBranchOptionLabel,
  isValidSolarDate,
} from "./homepage-birth-prefill";

export type WizardReadingContextDraft = {
  lifeStage?: LifeStageV1;
  topConcern?: TopConcernV1;
  skippedQuestions: {
    lifeStage: boolean;
    topConcern: boolean;
  };
};

export type WizardDraftV2 = {
  version: 2;
  step: 1 | 2 | 3;
  subject: NonNullable<unknown> | null;
  birth: NonNullable<unknown> | null;
  readingContext?: WizardReadingContextDraft;
  updatedAt: string;
};

const persistedOpaqueValueSchema = z
  .unknown()
  .refine((value) => value !== undefined, "Persisted value cannot be undefined");

export const WizardReadingContextDraftSchema = z
  .object({
    lifeStage: LifeStageV1Schema.optional(),
    topConcern: TopConcernV1Schema.optional(),
    skippedQuestions: z
      .object({
        lifeStage: z.boolean(),
        topConcern: z.boolean(),
      })
      .strict(),
  })
  .strict()
  .superRefine((context, issue) => {
    if (context.lifeStage !== undefined && context.skippedQuestions.lifeStage) {
      issue.addIssue({
        code: "custom",
        message: "lifeStage cannot be selected and skipped",
        path: ["skippedQuestions", "lifeStage"],
      });
    }
    if (context.topConcern !== undefined && context.skippedQuestions.topConcern) {
      issue.addIssue({
        code: "custom",
        message: "topConcern cannot be selected and skipped",
        path: ["skippedQuestions", "topConcern"],
      });
    }
  });

export const WizardDraftV2Schema = z
  .object({
    version: z.literal(2),
    step: z.union([z.literal(1), z.literal(2), z.literal(3)]),
    subject: persistedOpaqueValueSchema,
    birth: persistedOpaqueValueSchema,
    readingContext: WizardReadingContextDraftSchema.optional(),
    updatedAt: z.string().datetime({ offset: true }),
  })
  .strict()
  .superRefine((draft, issue) => {
    if (!Object.prototype.hasOwnProperty.call(draft, "subject")) {
      issue.addIssue({
        code: "custom",
        message: "subject is required",
        path: ["subject"],
      });
    }
    if (!Object.prototype.hasOwnProperty.call(draft, "birth")) {
      issue.addIssue({
        code: "custom",
        message: "birth is required",
        path: ["birth"],
      });
    }
  });

export function parseWizardDraftV2(input: unknown): WizardDraftV2 | null {
  const parsed = WizardDraftV2Schema.safeParse(input);
  return parsed.success ? (parsed.data as WizardDraftV2) : null;
}

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

export type WizardDateValidationOptions = {
  referenceDate?: Date;
  calendarType?: "solar" | "lunar";
};

export function isValidLunarDate(
  year: number,
  month: number,
  day: number,
): boolean {
  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    !Number.isInteger(day) ||
    year < 1000 ||
    year > 9999 ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 30
  ) {
    return false;
  }
  return true;
}

export function validateWizardDate(
  dayStr: string,
  monthStr: string,
  yearStr: string,
  referenceDateOrOptions?: Date | WizardDateValidationOptions,
  calendarTypeParam?: "solar" | "lunar",
): WizardDateValidationResult {
  let referenceDate: Date | undefined;
  let calendarType: "solar" | "lunar" = "solar";

  if (referenceDateOrOptions instanceof Date) {
    referenceDate = referenceDateOrOptions;
    if (calendarTypeParam) {
      calendarType = calendarTypeParam;
    }
  } else if (
    referenceDateOrOptions &&
    typeof referenceDateOrOptions === "object"
  ) {
    referenceDate = referenceDateOrOptions.referenceDate;
    if (referenceDateOrOptions.calendarType) {
      calendarType = referenceDateOrOptions.calendarType;
    }
  } else if (calendarTypeParam) {
    calendarType = calendarTypeParam;
  }

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

  if (calendarType === "lunar") {
    if (d < 1 || d > 31 || m < 1 || m > 12) {
      return { valid: false, error: "INVALID_FORMAT" };
    }
    if (y < 1000 || y > 9999 || d > 30) {
      return { valid: false, error: "IMPOSSIBLE_DATE" };
    }
    const isoDate = `${y.toString().padStart(4, "0")}-${m
      .toString()
      .padStart(2, "0")}-${d.toString().padStart(2, "0")}`;
    return { valid: true, isoDate };
  }

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
  options?: {
    calendarType?: "solar" | "lunar";
    isLeapMonth?: boolean;
    locale?: "en" | "vi";
  },
): string {
  const d = day.trim();
  const m = month.trim();
  const y = year.trim();
  if (d && m && y) {
    const formatted = `${d.padStart(2, "0")}/${m.padStart(2, "0")}/${y}`;
    if (options?.calendarType === "lunar" && options?.isLeapMonth) {
      const suffix = options.locale === "en" ? " (leap month)" : " (tháng nhuận)";
      return `${formatted}${suffix}`;
    }
    return formatted;
  }
  return "—";
}
