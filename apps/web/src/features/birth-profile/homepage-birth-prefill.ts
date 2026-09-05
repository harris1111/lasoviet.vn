export const HOMEPAGE_BIRTH_PREFILL_STORAGE_KEY = "lasoviet:birth-prefill:v1";
export const HOMEPAGE_BIRTH_PREFILL_VERSION = 1 as const;
export const PREFILL_MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours

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

export type HomepageBirthPrefill = {
  version: typeof HOMEPAGE_BIRTH_PREFILL_VERSION;
  date: string; // ISO date YYYY-MM-DD
  time:
    | { precision: "branch_only"; branch: CanonicalBranchId }
    | { precision: "unknown" };
  createdAt: number;
};

export function saveHomepageBirthPrefill(
  input: {
    date: string;
    time:
      | { precision: "branch_only"; branch: CanonicalBranchId }
      | { precision: "unknown" };
  },
  storage?: Storage,
): boolean {
  try {
    const targetStorage =
      storage ?? (typeof window !== "undefined" ? window.sessionStorage : undefined);
    if (!targetStorage) return false;

    const payload: HomepageBirthPrefill = {
      version: HOMEPAGE_BIRTH_PREFILL_VERSION,
      date: input.date,
      time: input.time,
      createdAt: Date.now(),
    };

    targetStorage.setItem(
      HOMEPAGE_BIRTH_PREFILL_STORAGE_KEY,
      JSON.stringify(payload),
    );
    return true;
  } catch {
    return false;
  }
}

export function consumeHomepageBirthPrefill(
  storage?: Storage,
): HomepageBirthPrefill | null {
  try {
    const targetStorage =
      storage ?? (typeof window !== "undefined" ? window.sessionStorage : undefined);
    if (!targetStorage) return null;

    const raw = targetStorage.getItem(HOMEPAGE_BIRTH_PREFILL_STORAGE_KEY);
    if (!raw) return null;

    // Consume-once: remove immediately upon reading
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

    // Check age (24 hours expiry)
    if (Date.now() - parsed.createdAt > PREFILL_MAX_AGE_MS) {
      return null;
    }

    // Check date validity (exact YYYY-MM-DD format)
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

    // Check time precision validity
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
