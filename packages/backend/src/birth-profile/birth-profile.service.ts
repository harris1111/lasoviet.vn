import {
  type CurrentActor,
  BirthProfileV1Schema,
  type BirthProfileV1,
  type NormalizedBirthProfileV1,
  type Result,
} from "@lasoviet/contracts";

import {
  resolveZiweiTimeIndex,
  type TimePrecisionError,
  ziweiTimeIndex,
} from "./time-precision.js";
import type {
  BirthProfileRecord,
  BirthProfileRepository,
} from "./birth-profile.repository.js";

export type BirthProfileNormalizationError =
  | "INVALID_TIMEZONE"
  | "INVALID_CALENDAR_INPUT";

export type BirthProfileServiceError =
  | BirthProfileNormalizationError
  | "PROFILE_NOT_FOUND"
  | "ANONYMOUS_EXPIRED";

export type BirthProfileServiceOptions = {
  repository: BirthProfileRepository;
  now?: () => Date;
};

type LocalDateTime = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
};

function error(
  code: BirthProfileNormalizationError,
): Result<never, BirthProfileNormalizationError> {
  return {
    ok: false,
    error: {
      code,
      messageKey: `birthProfile.${code.toLowerCase()}`,
      retryable: false,
    },
  };
}

function serviceError(
  code: BirthProfileServiceError,
): Result<never, BirthProfileServiceError> {
  return {
    ok: false,
    error: {
      code,
      messageKey: `birthProfile.${code.toLowerCase()}`,
      retryable: false,
    },
  };
}

function localDateTime(date: string, time: string): LocalDateTime {
  const [year, month, day] = date.split("-");
  const [hour, minute] = time.split(":");
  return {
    year: Number(year!),
    month: Number(month!),
    day: Number(day!),
    hour: Number(hour!),
    minute: Number(minute!),
  };
}

function formatLocalDateTime(
  instant: Date,
  ianaZone: string,
): LocalDateTime {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: ianaZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(instant);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value);
  return {
    year: value("year"),
    month: value("month"),
    day: value("day"),
    hour: value("hour"),
    minute: value("minute"),
  };
}

function equalDateTime(left: LocalDateTime, right: LocalDateTime): boolean {
  return (
    left.year === right.year &&
    left.month === right.month &&
    left.day === right.day &&
    left.hour === right.hour &&
    left.minute === right.minute
  );
}

function validIanaZone(ianaZone: string): boolean {
  try {
    new Intl.DateTimeFormat("en-CA", { timeZone: ianaZone }).format();
    return true;
  } catch {
    return false;
  }
}

function resolveIanaInstant(
  local: LocalDateTime,
  ianaZone: string,
): Date | undefined {
  if (!validIanaZone(ianaZone)) {
    return undefined;
  }

  const localUtc = Date.UTC(
    local.year,
    local.month - 1,
    local.day,
    local.hour,
    local.minute,
  );
  const candidates: Date[] = [];
  for (
    let timestamp = localUtc - 16 * 60 * 60 * 1000;
    timestamp <= localUtc + 16 * 60 * 60 * 1000;
    timestamp += 60 * 1000
  ) {
    const instant = new Date(timestamp);
    if (equalDateTime(formatLocalDateTime(instant, ianaZone), local)) {
      candidates.push(instant);
    }
  }
  return candidates.length === 1 ? candidates[0] : undefined;
}

function timeLimitations(input: BirthProfileV1): string[] {
  switch (input.time.precision) {
    case "branch_only":
      return ["TIME_BRANCH_ONLY"];
    case "range":
      return ziweiTimeIndex(input.time.startLocalTime) ===
        ziweiTimeIndex(input.time.endLocalTime)
        ? ["TIME_RANGE_WITHIN_SINGLE_BRANCH"]
        : ["TIME_RANGE_CROSSES_BRANCHES"];
    case "unknown":
      return ["TIME_UNKNOWN"];
    case "exact_minute":
      return [];
  }
}

export function normalizeBirthProfile(
  input: unknown,
): Result<NormalizedBirthProfileV1, BirthProfileNormalizationError> {
  const parsed = BirthProfileV1Schema.safeParse(input);
  if (!parsed.success) {
    return error("INVALID_CALENDAR_INPUT");
  }
  const profile = parsed.data;
  if (
    profile.timezone.ianaZone !== undefined &&
    !validIanaZone(profile.timezone.ianaZone)
  ) {
    return error("INVALID_TIMEZONE");
  }
  const limitations = [
    ...(profile.calendar.kind === "lunar"
      ? ["LUNAR_CALENDAR_CONVERSION_DEFERRED"]
      : []),
    ...timeLimitations(profile),
  ];
  const timezoneProvenance =
    profile.timezone.offsetMinutes !== undefined
      ? {
          source: "offset" as const,
          offsetMinutes: profile.timezone.offsetMinutes,
        }
      : {
          source: "iana" as const,
          ianaZone: profile.timezone.ianaZone!,
          runtime: "Intl" as const,
        };

  let utcInstant: string | undefined;
  if (
    profile.calendar.kind === "solar" &&
    profile.time.precision === "exact_minute"
  ) {
    const local = localDateTime(profile.calendar.date, profile.time.localTime);
    const instant =
      profile.timezone.offsetMinutes !== undefined
        ? new Date(
            Date.UTC(
              local.year,
              local.month - 1,
              local.day,
              local.hour,
              local.minute,
            ) -
              profile.timezone.offsetMinutes * 60 * 1000,
          )
        : resolveIanaInstant(local, profile.timezone.ianaZone!);
    if (instant === undefined) {
      return error("INVALID_TIMEZONE");
    }
    utcInstant = instant.toISOString();
  }

  return {
    ok: true,
    value: {
      version: 1,
      originalInput: profile,
      normalizedCalendar: profile.calendar,
      normalizedTime: profile.time,
      timezoneProvenance,
      ...(utcInstant === undefined ? {} : { utcInstant }),
      normalizationWarnings: [],
      limitations,
    },
  };
}

export { resolveZiweiTimeIndex };
export type { TimePrecisionError };

function anonymousExpired(actor: CurrentActor, now: Date): boolean {
  return actor.kind === "anonymous" && new Date(actor.expiresAt) <= now;
}

function profileResult(record: BirthProfileRecord) {
  return {
    profileId: record.profileId,
    revisionId: record.revisionId,
    revisionNumber: record.revisionNumber,
    originalInput: record.originalInput,
    normalizedInput: record.normalizedInput,
    normalizationWarnings: record.normalizationWarnings ?? [],
    limitations: record.limitations ?? [],
  };
}

export function createBirthProfileService(
  options: BirthProfileServiceOptions,
) {
  const now = options.now ?? (() => new Date());

  async function normalized(
    input: unknown,
  ): Promise<
    Result<NormalizedBirthProfileV1, BirthProfileServiceError>
  > {
    const result = normalizeBirthProfile(input);
    return result.ok ? result : serviceError(result.error.code);
  }

  return {
    async create(actor: CurrentActor, input: unknown) {
      const currentTime = now();
      if (anonymousExpired(actor, currentTime)) {
        return serviceError("ANONYMOUS_EXPIRED");
      }
      const result = await normalized(input);
      if (!result.ok) {
        return result;
      }
      const record = await options.repository.create({
        actor,
        revisionNumber: 1,
        originalInput: result.value.originalInput,
        normalized: result.value,
        now: currentTime,
      });
      return record === null
        ? serviceError("ANONYMOUS_EXPIRED")
        : { ok: true as const, value: profileResult(record) };
    },

    async read(actor: CurrentActor, profileId: string) {
      const currentTime = now();
      if (anonymousExpired(actor, currentTime)) {
        return serviceError("ANONYMOUS_EXPIRED");
      }
      const record = await options.repository.read(actor, profileId, currentTime);
      return record === null
        ? serviceError("PROFILE_NOT_FOUND")
        : { ok: true as const, value: profileResult(record) };
    },

    async update(actor: CurrentActor, profileId: string, input: unknown) {
      const currentTime = now();
      if (anonymousExpired(actor, currentTime)) {
        return serviceError("ANONYMOUS_EXPIRED");
      }
      const existing = await options.repository.read(actor, profileId, currentTime);
      if (existing === null) {
        return serviceError("PROFILE_NOT_FOUND");
      }
      const result = await normalized(input);
      if (!result.ok) {
        return result;
      }
      const record = await options.repository.update({
        actor,
        profileId,
        revisionNumber: existing.revisionNumber + 1,
        originalInput: result.value.originalInput,
        normalized: result.value,
        now: currentTime,
      });
      return record === null
        ? serviceError("PROFILE_NOT_FOUND")
        : { ok: true as const, value: profileResult(record) };
    },

    async archive(actor: CurrentActor, profileId: string) {
      const currentTime = now();
      if (anonymousExpired(actor, currentTime)) {
        return serviceError("ANONYMOUS_EXPIRED");
      }
      return (await options.repository.archive(actor, profileId, currentTime))
        ? { ok: true as const, value: { profileId } }
        : serviceError("PROFILE_NOT_FOUND");
    },
  };
}
