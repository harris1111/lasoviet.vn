import type {
  BirthTimeInput,
  NormalizedBirthProfileV1,
  Result,
} from "@lasoviet/contracts";

export type TimePrecisionError =
  | "TIME_UNKNOWN"
  | "TIME_RANGE_MULTIPLE_BRANCHES"
  | "INVALID_TIMEZONE"
  | "INVALID_CALENDAR_INPUT";

const branchIndexes = {
  zi: 0,
  chou: 1,
  yin: 2,
  mao: 3,
  chen: 4,
  si: 5,
  wu: 6,
  wei: 7,
  shen: 8,
  you: 9,
  xu: 10,
  hai: 11,
} as const;

function error(code: TimePrecisionError): Result<never, TimePrecisionError> {
  return {
    ok: false,
    error: {
      code,
      messageKey: `birthProfile.${code.toLowerCase()}`,
      retryable: false,
    },
  };
}

function minutes(localTime: string): number {
  const [hours, minute] = localTime.split(":");
  return Number(hours!) * 60 + Number(minute!);
}

export function ziweiTimeIndex(localTime: string): number {
  return Math.floor((minutes(localTime) + 60) / 120) % 12;
}

function indexFor(time: BirthTimeInput): number | TimePrecisionError {
  switch (time.precision) {
    case "exact_minute":
      return ziweiTimeIndex(time.localTime);
    case "branch_only":
      return branchIndexes[time.branch];
    case "range": {
      const start = ziweiTimeIndex(time.startLocalTime);
      const end = ziweiTimeIndex(time.endLocalTime);
      return start === end ? start : "TIME_RANGE_MULTIPLE_BRANCHES";
    }
    case "unknown":
      return "TIME_UNKNOWN";
  }
}

export function resolveZiweiTimeIndex(
  profile: NormalizedBirthProfileV1,
): Result<number, TimePrecisionError> {
  const index = indexFor(profile.normalizedTime);
  return typeof index === "number" ? { ok: true, value: index } : error(index);
}
