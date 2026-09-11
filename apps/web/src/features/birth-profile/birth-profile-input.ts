import type { CanonicalBranchId } from "./homepage-birth-prefill";

export type BirthTimeState =
  | { precision: "exact_minute"; hour: string; minute: string }
  | { precision: "branch_only"; branch: CanonicalBranchId }
  | { precision: "unknown" };

export type BirthCalendarType = "solar" | "lunar";

export type BirthProfileInput = {
  displayName?: string;
  date: string;
  calendarType?: BirthCalendarType;
  isLeapMonth?: boolean;
  hour?: string;
  minute?: string;
  timeUnknown?: boolean;
  branch?: CanonicalBranchId;
  time?: BirthTimeState;
  placeLabel?: string;
  gender: "male" | "female";
  locale: "en" | "vi";
};

export function buildBirthProfile(input: BirthProfileInput) {
  let time:
    | { precision: "exact_minute"; localTime: string }
    | { precision: "branch_only"; branch: CanonicalBranchId }
    | { precision: "unknown" };

  if (input.time) {
    if (input.time.precision === "unknown") {
      time = { precision: "unknown" };
    } else if (input.time.precision === "branch_only") {
      time = { precision: "branch_only", branch: input.time.branch };
    } else {
      time = {
        precision: "exact_minute",
        localTime: `${input.time.hour.padStart(2, "0")}:${input.time.minute.padStart(2, "0")}`,
      };
    }
  } else if (input.branch) {
    time = { precision: "branch_only", branch: input.branch };
  } else if (input.timeUnknown) {
    time = { precision: "unknown" };
  } else {
    time = {
      precision: "exact_minute",
      localTime: `${(input.hour ?? "").padStart(2, "0")}:${(input.minute ?? "").padStart(2, "0")}`,
    };
  }

  const calendar =
    input.calendarType === "lunar"
      ? {
          kind: "lunar" as const,
          date: input.date,
          isLeapMonth: Boolean(input.isLeapMonth),
        }
      : {
          kind: "solar" as const,
          date: input.date,
        };

  return {
    version: 1 as const,
    calendar,
    time,
    timezone: { ianaZone: "Asia/Ho_Chi_Minh" },
    ...(input.placeLabel?.trim()
      ? { placeLabel: input.placeLabel.trim() }
      : {}),
    ...(input.displayName?.trim()
      ? { displayName: input.displayName.trim() }
      : {}),
    gender: input.gender,
    consentVersion: "2026-09-01",
    locale: input.locale,
  };
}
