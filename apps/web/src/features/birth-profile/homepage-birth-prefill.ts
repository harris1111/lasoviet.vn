export const HOMEPAGE_BIRTH_PREFILL_STORAGE_KEY = "lasoviet:birth-prefill:v1";
export const HOMEPAGE_BIRTH_PREFILL_VERSION = 1 as const;
export const BIRTH_CACHE_STORAGE_KEY_V2 = "lasoviet:birth-cache:v2";
export const BIRTH_CACHE_STORAGE_KEY = BIRTH_CACHE_STORAGE_KEY_V2;
export const BIRTH_CACHE_VERSION_V2 = 2 as const;
export const BIRTH_CACHE_VERSION = BIRTH_CACHE_VERSION_V2;
export const PREFILL_MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours
export const BIRTH_CACHE_MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours

export const CANONICAL_BRANCH_IDS = [
  "zi",
  "chou",
  "yin",
  "mao",
  "chen",
  "si",
  "wu",
  "wei",
  "shen",
  "you",
  "xu",
  "hai",
] as const;

export type CanonicalBranchId = (typeof CANONICAL_BRANCH_IDS)[number];

export const BRANCH_METADATA: Record<
  CanonicalBranchId,
  {
    range: string;
    viName: string;
    enName: string;
  }
> = {
  zi: { range: "23:00 - 01:00", viName: "Tý", enName: "Zi" },
  chou: { range: "01:00 - 03:00", viName: "Sửu", enName: "Chou" },
  yin: { range: "03:00 - 05:00", viName: "Dần", enName: "Yin" },
  mao: { range: "05:00 - 07:00", viName: "Mão", enName: "Mao" },
  chen: { range: "07:00 - 09:00", viName: "Thìn", enName: "Chen" },
  si: { range: "09:00 - 11:00", viName: "Tỵ", enName: "Si" },
  wu: { range: "11:00 - 13:00", viName: "Ngọ", enName: "Wu" },
  wei: { range: "13:00 - 15:00", viName: "Mùi", enName: "Wei" },
  shen: { range: "15:00 - 17:00", viName: "Thân", enName: "Shen" },
  you: { range: "17:00 - 19:00", viName: "Dậu", enName: "You" },
  xu: { range: "19:00 - 21:00", viName: "Tuất", enName: "Xu" },
  hai: { range: "21:00 - 23:00", viName: "Hợi", enName: "Hai" },
};

export function getBranchTwoHourRange(branch: CanonicalBranchId): string {
  return BRANCH_METADATA[branch]?.range ?? "";
}

export function getBranchDisplayName(
  branch: CanonicalBranchId,
  locale: "en" | "vi",
): string {
  const meta = BRANCH_METADATA[branch];
  if (!meta) return branch;
  return locale === "en" ? meta.enName : meta.viName;
}

export function getBranchOptionLabel(
  branch: CanonicalBranchId,
  locale: "en" | "vi",
): string {
  const name = getBranchDisplayName(branch, locale);
  const range = getBranchTwoHourRange(branch);
  return `${name} (${range})`;
}

export function isCanonicalBranchId(value: unknown): value is CanonicalBranchId {
  return (
    typeof value === "string" &&
    (CANONICAL_BRANCH_IDS as readonly string[]).includes(value)
  );
}

export function isValidSolarDate(
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
    day > 31
  ) {
    return false;
  }

  const isLeap = (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
  const daysInMonth: readonly number[] = [
    31,
    isLeap ? 29 : 28,
    31,
    30,
    31,
    30,
    31,
    31,
    30,
    31,
    30,
    31,
  ];

  const maxDays = daysInMonth[month - 1];
  return maxDays !== undefined && day <= maxDays;
}

export function isFutureSolarDate(
  year: number,
  month: number,
  day: number,
  nowMs?: number,
): boolean {
  const ref = nowMs !== undefined ? new Date(nowMs) : new Date();
  const refLimit = Math.max(
    Date.UTC(ref.getFullYear(), ref.getMonth(), ref.getDate()),
    Date.UTC(ref.getUTCFullYear(), ref.getUTCMonth(), ref.getUTCDate()),
  );
  const inputUtc = Date.UTC(year, month - 1, day);
  return inputUtc > refLimit;
}

export function parseAndValidateDateParts(
  dayStr: string,
  monthStr: string,
  yearStr: string,
):
  | { valid: true; isoDate: string; day: number; month: number; year: number }
  | { valid: false; error: "INVALID_DATE_FORMAT" | "IMPOSSIBLE_DATE" } {
  const trimmedDay = dayStr.trim();
  const trimmedMonth = monthStr.trim();
  const trimmedYear = yearStr.trim();

  if (
    trimmedDay === "" ||
    trimmedMonth === "" ||
    trimmedYear === "" ||
    !/^\d+$/.test(trimmedDay) ||
    !/^\d+$/.test(trimmedMonth) ||
    !/^\d+$/.test(trimmedYear)
  ) {
    return { valid: false, error: "INVALID_DATE_FORMAT" };
  }

  const day = Number.parseInt(trimmedDay, 10);
  const month = Number.parseInt(trimmedMonth, 10);
  const year = Number.parseInt(trimmedYear, 10);

  if (!isValidSolarDate(year, month, day)) {
    return { valid: false, error: "IMPOSSIBLE_DATE" };
  }

  const isoDate = `${year.toString().padStart(4, "0")}-${month
    .toString()
    .padStart(2, "0")}-${day.toString().padStart(2, "0")}`;

  return { valid: true, isoDate, day, month, year };
}

export type ReusableBirthTime =
  | { precision: "exact_minute"; hour: string; minute: string }
  | { precision: "branch_only"; branch: CanonicalBranchId }
  | { precision: "unknown" };

export function isValidReusableTime(time: unknown): time is ReusableBirthTime {
  if (!time || typeof time !== "object") return false;
  const t = time as Partial<ReusableBirthTime>;
  if (t.precision === "unknown") return true;
  if (t.precision === "branch_only") {
    return isCanonicalBranchId(t.branch);
  }
  if (t.precision === "exact_minute") {
    if (typeof t.hour !== "string" || typeof t.minute !== "string") return false;
    const hTrim = t.hour.trim();
    const mTrim = t.minute.trim();
    if (!/^\d{1,2}$/.test(hTrim) || !/^\d{1,2}$/.test(mTrim)) return false;
    const h = Number.parseInt(hTrim, 10);
    const m = Number.parseInt(mTrim, 10);
    return h >= 0 && h <= 23 && m >= 0 && m <= 59;
  }
  return false;
}

export type ReusableBirthProfileV2 = {
  version: typeof BIRTH_CACHE_VERSION_V2;
  date: string; // ISO date YYYY-MM-DD
  time: ReusableBirthTime;
  gender?: "male" | "female";
  place?: string;
  displayName?: string;
  createdAt: number;
};

export type HomepageBirthPrefill = {
  version: typeof HOMEPAGE_BIRTH_PREFILL_VERSION;
  date: string; // ISO date YYYY-MM-DD
  time:
    | { precision: "branch_only"; branch: CanonicalBranchId }
    | { precision: "unknown" };
  createdAt: number;
};

function readValidV2BirthCache(
  local: Storage | undefined,
  now: number,
): ReusableBirthProfileV2 | null {
  if (!local) return null;

  try {
    const rawV2 = local.getItem(BIRTH_CACHE_STORAGE_KEY_V2);
    if (!rawV2) return null;

    let parsed: Partial<ReusableBirthProfileV2>;
    try {
      parsed = JSON.parse(rawV2);
    } catch {
      local.removeItem(BIRTH_CACHE_STORAGE_KEY_V2);
      return null;
    }

    if (
      !parsed ||
      typeof parsed !== "object" ||
      parsed.version !== BIRTH_CACHE_VERSION_V2 ||
      typeof parsed.createdAt !== "number" ||
      now - parsed.createdAt < 0 ||
      now - parsed.createdAt > BIRTH_CACHE_MAX_AGE_MS ||
      typeof parsed.date !== "string" ||
      !/^\d{4}-\d{2}-\d{2}$/.test(parsed.date)
    ) {
      local.removeItem(BIRTH_CACHE_STORAGE_KEY_V2);
      return null;
    }

    const parts = parsed.date.split("-");
    const yStr = parts[0];
    const mStr = parts[1];
    const dStr = parts[2];
    if (yStr === undefined || mStr === undefined || dStr === undefined) {
      local.removeItem(BIRTH_CACHE_STORAGE_KEY_V2);
      return null;
    }

    const y = Number.parseInt(yStr, 10);
    const m = Number.parseInt(mStr, 10);
    const d = Number.parseInt(dStr, 10);
    if (!isValidSolarDate(y, m, d) || isFutureSolarDate(y, m, d, now)) {
      local.removeItem(BIRTH_CACHE_STORAGE_KEY_V2);
      return null;
    }

    if (!isValidReusableTime(parsed.time)) {
      local.removeItem(BIRTH_CACHE_STORAGE_KEY_V2);
      return null;
    }

    const gender =
      parsed.gender === "male" || parsed.gender === "female"
        ? parsed.gender
        : undefined;
    if (parsed.gender !== undefined && !gender) {
      local.removeItem(BIRTH_CACHE_STORAGE_KEY_V2);
      return null;
    }

    const place =
      typeof parsed.place === "string" && parsed.place.trim().length > 0
        ? parsed.place.trim().slice(0, 120)
        : undefined;
    if (parsed.place !== undefined && typeof parsed.place !== "string") {
      local.removeItem(BIRTH_CACHE_STORAGE_KEY_V2);
      return null;
    }

    const displayName =
      typeof parsed.displayName === "string" && parsed.displayName.trim().length > 0
        ? parsed.displayName.trim().slice(0, 80)
        : undefined;
    if (parsed.displayName !== undefined && typeof parsed.displayName !== "string") {
      local.removeItem(BIRTH_CACHE_STORAGE_KEY_V2);
      return null;
    }

    const normalizedTime: ReusableBirthTime =
      parsed.time.precision === "exact_minute"
        ? {
            precision: "exact_minute",
            hour: parsed.time.hour.trim().padStart(2, "0"),
            minute: parsed.time.minute.trim().padStart(2, "0"),
          }
        : parsed.time;

    return {
      version: BIRTH_CACHE_VERSION_V2,
      date: `${y.toString().padStart(4, "0")}-${m.toString().padStart(2, "0")}-${d.toString().padStart(2, "0")}`,
      time: normalizedTime,
      ...(gender ? { gender } : {}),
      ...(place ? { place } : {}),
      ...(displayName ? { displayName } : {}),
      createdAt: parsed.createdAt,
    };
  } catch {
    return null;
  }
}

export function saveBirthCache(
  input: {
    date: string;
    time: ReusableBirthTime;
    gender?: "male" | "female" | null;
    place?: string;
    displayName?: string;
  },
  options?: {
    localStorage?: Storage;
    now?: number;
  },
): boolean {
  try {
    const targetStorage =
      options?.localStorage ??
      (typeof window !== "undefined" ? window.localStorage : undefined);
    if (!targetStorage) return false;

    const now = options?.now ?? Date.now();

    if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date)) return false;
    const parts = input.date.split("-");
    const yStr = parts[0];
    const mStr = parts[1];
    const dStr = parts[2];
    if (yStr === undefined || mStr === undefined || dStr === undefined) return false;
    const y = Number.parseInt(yStr, 10);
    const m = Number.parseInt(mStr, 10);
    const d = Number.parseInt(dStr, 10);
    if (!isValidSolarDate(y, m, d) || isFutureSolarDate(y, m, d, now)) return false;

    if (!isValidReusableTime(input.time)) return false;

    const normalizedTime: ReusableBirthTime =
      input.time.precision === "exact_minute"
        ? {
            precision: "exact_minute",
            hour: input.time.hour.trim().padStart(2, "0"),
            minute: input.time.minute.trim().padStart(2, "0"),
          }
        : input.time;

    const validGender =
      input.gender === "male" || input.gender === "female"
        ? input.gender
        : undefined;

    const trimmedPlace =
      typeof input.place === "string" && input.place.trim().length > 0
        ? input.place.trim().slice(0, 120)
        : undefined;

    const trimmedDisplayName =
      typeof input.displayName === "string" && input.displayName.trim().length > 0
        ? input.displayName.trim().slice(0, 80)
        : undefined;

    const payload: ReusableBirthProfileV2 = {
      version: BIRTH_CACHE_VERSION_V2,
      date: input.date,
      time: normalizedTime,
      ...(validGender ? { gender: validGender } : {}),
      ...(trimmedPlace ? { place: trimmedPlace } : {}),
      ...(trimmedDisplayName ? { displayName: trimmedDisplayName } : {}),
      createdAt: now,
    };

    targetStorage.setItem(BIRTH_CACHE_STORAGE_KEY_V2, JSON.stringify(payload));
    return true;
  } catch {
    return false;
  }
}

export function readBirthCache(options?: {
  localStorage?: Storage;
  sessionStorage?: Storage;
  now?: number;
}): ReusableBirthProfileV2 | null {
  const now = options?.now ?? Date.now();
  const local =
    options?.localStorage ??
    (typeof window !== "undefined" ? window.localStorage : undefined);
  const session =
    options?.sessionStorage ??
    (typeof window !== "undefined" ? window.sessionStorage : undefined);

  // Prefer the richer reusable cache. Legacy migration is only a fallback.
  const validV2 = readValidV2BirthCache(local, now);
  if (validV2) return validV2;

  // Check legacy V1 in sessionStorage only after V2 is absent or invalid.
  if (session) {
    try {
      const rawV1 = session.getItem(HOMEPAGE_BIRTH_PREFILL_STORAGE_KEY);
      if (rawV1) {
        session.removeItem(HOMEPAGE_BIRTH_PREFILL_STORAGE_KEY);
        try {
          const parsedV1 = JSON.parse(rawV1) as Partial<HomepageBirthPrefill>;
          if (
            parsedV1 &&
            typeof parsedV1 === "object" &&
            parsedV1.version === HOMEPAGE_BIRTH_PREFILL_VERSION &&
            typeof parsedV1.date === "string" &&
            typeof parsedV1.createdAt === "number" &&
            now - parsedV1.createdAt >= 0 &&
            now - parsedV1.createdAt <= PREFILL_MAX_AGE_MS &&
            /^\d{4}-\d{2}-\d{2}$/.test(parsedV1.date)
          ) {
            const parts = parsedV1.date.split("-");
            const yStr = parts[0];
            const mStr = parts[1];
            const dStr = parts[2];
            if (yStr !== undefined && mStr !== undefined && dStr !== undefined) {
              const y = Number.parseInt(yStr, 10);
              const m = Number.parseInt(mStr, 10);
              const d = Number.parseInt(dStr, 10);
              if (isValidSolarDate(y, m, d) && !isFutureSolarDate(y, m, d, now)) {
                let validTime: ReusableBirthTime | null = null;
                if (
                  parsedV1.time &&
                  parsedV1.time.precision === "branch_only" &&
                  isCanonicalBranchId(parsedV1.time.branch)
                ) {
                  validTime = {
                    precision: "branch_only",
                    branch: parsedV1.time.branch,
                  };
                } else if (
                  parsedV1.time &&
                  parsedV1.time.precision === "unknown"
                ) {
                  validTime = { precision: "unknown" };
                }
                if (validTime) {
                  const migratedV2: ReusableBirthProfileV2 = {
                    version: BIRTH_CACHE_VERSION_V2,
                    date: `${y.toString().padStart(4, "0")}-${m.toString().padStart(2, "0")}-${d.toString().padStart(2, "0")}`,
                    time: validTime,
                    createdAt: parsedV1.createdAt,
                  };
                  if (local) {
                    local.setItem(
                      BIRTH_CACHE_STORAGE_KEY_V2,
                      JSON.stringify(migratedV2),
                    );
                  }
                  return migratedV2;
                }
              }
            }
          }
        } catch {
          // Ignored malformed V1
        }
      }
    } catch {
      // Storage access restricted
    }
  }

  // 2. Read V2 from localStorage (non-destructive)
  return readValidV2BirthCache(local, now);
}

export function clearBirthCache(options?: {
  localStorage?: Storage;
  sessionStorage?: Storage;
}): void {
  try {
    const local =
      options?.localStorage ??
      (typeof window !== "undefined" ? window.localStorage : undefined);
    const session =
      options?.sessionStorage ??
      (typeof window !== "undefined" ? window.sessionStorage : undefined);
    local?.removeItem(BIRTH_CACHE_STORAGE_KEY_V2);
    session?.removeItem(HOMEPAGE_BIRTH_PREFILL_STORAGE_KEY);
  } catch {
    // Storage access might be restricted
  }
}

export function saveHomepageBirthPrefill(
  input: {
    date: string;
    time: ReusableBirthTime;
    gender?: "male" | "female" | null;
    place?: string;
    displayName?: string;
  },
  storageOrOptions?:
    | Storage
    | { localStorage?: Storage; sessionStorage?: Storage; now?: number },
  nowParam?: number,
): boolean {
  const now =
    nowParam ??
    (typeof storageOrOptions === "object" && storageOrOptions !== null && "now" in storageOrOptions && typeof (storageOrOptions as { now?: number }).now === "number"
      ? (storageOrOptions as { now: number }).now
      : Date.now());

  if (
    storageOrOptions &&
    "getItem" in storageOrOptions &&
    typeof storageOrOptions.setItem === "function"
  ) {
    const legacyStorage = storageOrOptions as Storage;
    try {
      const v1Payload: HomepageBirthPrefill = {
        version: HOMEPAGE_BIRTH_PREFILL_VERSION,
        date: input.date,
        time:
          input.time.precision === "branch_only"
            ? input.time
            : { precision: "unknown" },
        createdAt: now,
      };
      legacyStorage.setItem(
        HOMEPAGE_BIRTH_PREFILL_STORAGE_KEY,
        JSON.stringify(v1Payload),
      );
      const v2Payload: ReusableBirthProfileV2 = {
        version: BIRTH_CACHE_VERSION_V2,
        date: input.date,
        time: input.time,
        ...(input.gender === "male" || input.gender === "female"
          ? { gender: input.gender }
          : {}),
        ...(typeof input.place === "string" && input.place.trim()
          ? { place: input.place.trim().slice(0, 120) }
          : {}),
        createdAt: now,
      };
      legacyStorage.setItem(BIRTH_CACHE_STORAGE_KEY_V2, JSON.stringify(v2Payload));
      return true;
    } catch {
      return false;
    }
  }

  const opts = storageOrOptions && !("getItem" in storageOrOptions)
    ? storageOrOptions
    : undefined;

  const savedV2 = saveBirthCache(input, {
    localStorage: opts?.localStorage,
    now,
  });

  try {
    const session =
      opts?.sessionStorage ??
      (typeof window !== "undefined" ? window.sessionStorage : undefined);
    if (session) {
      const v1Payload: HomepageBirthPrefill = {
        version: HOMEPAGE_BIRTH_PREFILL_VERSION,
        date: input.date,
        time:
          input.time.precision === "branch_only"
            ? input.time
            : { precision: "unknown" },
        createdAt: now,
      };
      session.setItem(
        HOMEPAGE_BIRTH_PREFILL_STORAGE_KEY,
        JSON.stringify(v1Payload),
      );
    }
  } catch {
    // Ignore session storage failure
  }

  return savedV2;
}

export function consumeHomepageBirthPrefill(
  storage?: Storage,
  nowParam?: number,
): HomepageBirthPrefill | null {
  try {
    const targetStorage =
      storage ?? (typeof window !== "undefined" ? window.sessionStorage : undefined);
    if (!targetStorage) return null;

    const raw = targetStorage.getItem(HOMEPAGE_BIRTH_PREFILL_STORAGE_KEY);
    if (!raw) return null;

    targetStorage.removeItem(HOMEPAGE_BIRTH_PREFILL_STORAGE_KEY);

    const parsed = JSON.parse(raw) as Partial<HomepageBirthPrefill>;
    if (
      !parsed ||
      typeof parsed !== "object" ||
      parsed.version !== HOMEPAGE_BIRTH_PREFILL_VERSION ||
      typeof parsed.date !== "string" ||
      typeof parsed.createdAt !== "number" ||
      !parsed.time ||
      typeof parsed.time !== "object"
    ) {
      return null;
    }

    const now = nowParam ?? Date.now();
    if (now - parsed.createdAt > PREFILL_MAX_AGE_MS || now - parsed.createdAt < 0) {
      return null;
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(parsed.date)) {
      return null;
    }
    const dateParts = parsed.date.split("-");
    const yStr = dateParts[0];
    const mStr = dateParts[1];
    const dStr = dateParts[2];
    if (yStr === undefined || mStr === undefined || dStr === undefined) {
      return null;
    }
    const y = Number.parseInt(yStr, 10);
    const m = Number.parseInt(mStr, 10);
    const d = Number.parseInt(dStr, 10);
    if (Number.isNaN(y) || Number.isNaN(m) || Number.isNaN(d) || !isValidSolarDate(y, m, d)) {
      return null;
    }
    const canonicalIsoDate = `${y.toString().padStart(4, "0")}-${m
      .toString()
      .padStart(2, "0")}-${d.toString().padStart(2, "0")}`;

    if (parsed.time.precision === "branch_only") {
      const b = (parsed.time as { branch?: unknown }).branch;
      if (!isCanonicalBranchId(b)) {
        return null;
      }
      return {
        version: HOMEPAGE_BIRTH_PREFILL_VERSION,
        date: canonicalIsoDate,
        time: {
          precision: "branch_only",
          branch: b,
        },
        createdAt: parsed.createdAt,
      };
    }

    if (parsed.time.precision === "unknown") {
      return {
        version: HOMEPAGE_BIRTH_PREFILL_VERSION,
        date: canonicalIsoDate,
        time: { precision: "unknown" },
        createdAt: parsed.createdAt,
      };
    }

    return null;
  } catch {
    return null;
  }
}
