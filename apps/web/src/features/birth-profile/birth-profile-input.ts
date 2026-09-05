import type { CanonicalBranchId } from "./homepage-birth-prefill";

export type BirthTimeState =
  | { precision: "exact_minute"; hour: string; minute: string }
  | { precision: "branch_only"; branch: CanonicalBranchId }
  | { precision: "unknown" };

export type BirthProfileInput = {
  date: string;
  hour?: string;
  minute?: string;
  timeUnknown?: boolean;
  branch?: CanonicalBranchId;
  time?: BirthTimeState;
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

  return {
    version: 1 as const,
    calendar: { kind: "solar" as const, date: input.date },
    time,
    timezone: { offsetMinutes: 420 },
    gender: input.gender,
    consentVersion: "2026-09-01",
    locale: input.locale,
  };
}
