import type { BirthTimeState } from "./birth-profile-input";
import { isCanonicalBranchId } from "./homepage-birth-prefill";
import {
  canAdvanceStep1,
  canAdvanceStep2,
  validateWizardDate,
} from "./birth-wizard-state";

export const BIRTH_PROFILE_DRAFT_STORAGE_KEY = "lasoviet:birth-wizard-draft:v1";
export const BIRTH_PROFILE_DRAFT_VERSION = 1 as const;
export const BIRTH_PROFILE_DRAFT_MAX_AGE_MS = 24 * 60 * 60 * 1000;

export type BirthProfileDraftInput = {
  step?: 1 | 2 | 3;
  displayName?: string;
  forWhom?: "self" | "other";
  consentOther?: boolean;
  gender?: "male" | "female" | null;
  calendarType?: "solar" | "lunar";
  isLeapMonth?: boolean;
  day?: string;
  month?: string;
  year?: string;
  timeState?: BirthTimeState;
  place?: string;
};

export type ValidatedBirthProfileDraft = {
  version: typeof BIRTH_PROFILE_DRAFT_VERSION;
  step: 1 | 2 | 3;
  displayName: string;
  forWhom: "self" | "other";
  consentOther: boolean;
  gender: "male" | "female" | null;
  calendarType: "solar" | "lunar";
  isLeapMonth: boolean;
  day: string;
  month: string;
  year: string;
  timeState: BirthTimeState;
  place: string;
  createdAt: number;
  updatedAt: number;
};

export type HomepageDraftInput = {
  day: string;
  month: string;
  year: string;
  timeMode: "branch_only" | "exact_minute" | "unknown";
  hour?: string;
  minute?: string;
  branch?: string;
};

export type DraftAutosaveController<T> = {
  schedule(value: T): void;
  flush(): void;
  cancelAndClear(): void;
  dispose(): void;
};

export function bindDraftPagehideFlush(
  controller: Pick<DraftAutosaveController<unknown>, "flush">,
  target: Pick<EventTarget, "addEventListener" | "removeEventListener">,
): () => void {
  const handlePagehide = () => {
    controller.flush();
  };

  target.addEventListener("pagehide", handlePagehide);
  return () => {
    target.removeEventListener("pagehide", handlePagehide);
  };
}

const DRAFT_KEYS = new Set([
  "version",
  "step",
  "displayName",
  "forWhom",
  "consentOther",
  "gender",
  "calendarType",
  "isLeapMonth",
  "day",
  "month",
  "year",
  "timeState",
  "place",
  "createdAt",
  "updatedAt",
]);

function getStorage(storage?: Storage): Storage | undefined {
  return storage ?? (typeof window !== "undefined" ? window.localStorage : undefined);
}

function removeDraft(storage: Storage): void {
  try {
    storage.removeItem(BIRTH_PROFILE_DRAFT_STORAGE_KEY);
  } catch {
    // Browser storage is optional and must not break the wizard.
  }
}

function isFutureLunarYear(year: string, now: number): boolean {
  if (!/^\d{4}$/.test(year)) return false;
  const reference = new Date(now);
  const referenceYear = Math.max(reference.getFullYear(), reference.getUTCFullYear());
  return Number.parseInt(year, 10) > referenceYear;
}

function parseTimeState(value: unknown): BirthTimeState | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const candidate = value as Record<string, unknown>;

  if (candidate.precision === "unknown") {
    return Object.keys(candidate).length === 1 ? { precision: "unknown" } : null;
  }
  if (candidate.precision === "branch_only") {
    return Object.keys(candidate).length === 2 && isCanonicalBranchId(candidate.branch)
      ? { precision: "branch_only", branch: candidate.branch }
      : null;
  }
  if (candidate.precision !== "exact_minute" || Object.keys(candidate).length !== 3) {
    return null;
  }
  if (typeof candidate.hour !== "string" || typeof candidate.minute !== "string") {
    return null;
  }

  const hour = candidate.hour.trim();
  const minute = candidate.minute.trim();
  const validHour =
    hour === "" ||
    (/^\d{1,2}$/.test(hour) &&
      Number.parseInt(hour, 10) >= 0 &&
      Number.parseInt(hour, 10) <= 23);
  const validMinute =
    minute === "" ||
    (/^\d{1,2}$/.test(minute) &&
      Number.parseInt(minute, 10) >= 0 &&
      Number.parseInt(minute, 10) <= 59);

  return validHour && validMinute ? { precision: "exact_minute", hour, minute } : null;
}

function hasOnlyDraftKeys(value: Record<string, unknown>): boolean {
  return Object.keys(value).every((key) => DRAFT_KEYS.has(key));
}

export function isMeaningfulBirthProfileDraft(input: BirthProfileDraftInput): boolean {
  const timeState = input.timeState;
  const hasMeaningfulTime =
    timeState?.precision === "unknown" ||
    timeState?.precision === "branch_only" ||
    (timeState?.precision === "exact_minute" &&
      Boolean(timeState.hour.trim() || timeState.minute.trim()));

  return Boolean(
    input.displayName?.trim() ||
      input.forWhom === "other" ||
      input.consentOther ||
      input.gender ||
      input.calendarType === "lunar" ||
      input.isLeapMonth ||
      input.day?.trim() ||
      input.month?.trim() ||
      input.year?.trim() ||
      hasMeaningfulTime ||
      input.place?.trim() ||
      (input.step !== undefined && input.step > 1),
  );
}

export function isMeaningfulHomepageDraft(input: HomepageDraftInput): boolean {
  return Boolean(
    input.day.trim() ||
      input.month.trim() ||
      input.year.trim() ||
      input.timeMode !== "branch_only" ||
      input.branch ||
      input.hour?.trim() ||
      input.minute?.trim(),
  );
}

export function createDraftAutosaveController<T>(options: {
  delayMs?: number;
  save(value: T): void;
  clear(): void;
  isMeaningful(value: T): boolean;
}): DraftAutosaveController<T> {
  const delayMs = options.delayMs ?? 300;
  let pendingTimer: ReturnType<typeof setTimeout> | null = null;
  let latestValue: T | null = null;
  let dirty = false;
  let suppressFlush = false;

  function cancelTimer() {
    if (pendingTimer !== null) {
      clearTimeout(pendingTimer);
      pendingTimer = null;
    }
  }

  function persistLatest() {
    cancelTimer();
    if (suppressFlush || !dirty || latestValue === null) return;

    dirty = false;
    if (options.isMeaningful(latestValue)) {
      options.save(latestValue);
    } else {
      options.clear();
    }
  }

  return {
    schedule(value) {
      cancelTimer();
      latestValue = value;
      dirty = true;
      suppressFlush = false;
      if (!options.isMeaningful(value)) {
        persistLatest();
        return;
      }
      pendingTimer = setTimeout(persistLatest, delayMs);
    },
    flush: persistLatest,
    cancelAndClear() {
      cancelTimer();
      latestValue = null;
      dirty = false;
      suppressFlush = true;
      options.clear();
    },
    dispose() {
      persistLatest();
      cancelTimer();
    },
  };
}

export function resolveRestorableWizardStep(
  data: {
    step?: 1 | 2 | 3;
    forWhom?: "self" | "other";
    consentOther?: boolean;
    gender?: "male" | "female" | null;
    calendarType?: "solar" | "lunar";
    day?: string;
    month?: string;
    year?: string;
    timeState?: BirthTimeState;
  },
  nowMs = Date.now(),
): 1 | 2 | 3 {
  const stepTarget = data.step ?? 1;
  const forWhom = data.forWhom ?? "self";
  const gender = data.gender ?? null;
  if (!canAdvanceStep1({ forWhom, consentOther: Boolean(data.consentOther) }) || !gender) {
    return 1;
  }
  if (stepTarget === 1) return 1;

  const calendarType = data.calendarType ?? "solar";
  const dateResult = validateWizardDate(data.day ?? "", data.month ?? "", data.year ?? "", {
    referenceDate: new Date(nowMs),
    calendarType,
  });
  const timeState = data.timeState ?? { precision: "exact_minute", hour: "", minute: "" };
  if (
    !dateResult.valid ||
    isFutureLunarYear(calendarType === "lunar" ? data.year ?? "" : "", nowMs) ||
    !canAdvanceStep2({ dateValid: true, gender, timeState })
  ) {
    return 2;
  }

  return stepTarget === 3 ? 3 : 2;
}

export function readBirthProfileDraft(options?: {
  localStorage?: Storage;
  now?: number;
}): ValidatedBirthProfileDraft | null {
  const now = options?.now ?? Date.now();
  const storage = getStorage(options?.localStorage);
  if (!storage) return null;

  try {
    const raw = storage.getItem(BIRTH_PROFILE_DRAFT_STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      removeDraft(storage);
      return null;
    }
    const data = parsed as Record<string, unknown>;
    if (
      !hasOnlyDraftKeys(data) ||
      data.version !== BIRTH_PROFILE_DRAFT_VERSION ||
      typeof data.createdAt !== "number" ||
      typeof data.updatedAt !== "number" ||
      !Number.isFinite(data.createdAt) ||
      !Number.isFinite(data.updatedAt) ||
      data.createdAt <= 0 ||
      data.updatedAt < data.createdAt ||
      data.updatedAt > now ||
      data.createdAt > now ||
      now - data.updatedAt > BIRTH_PROFILE_DRAFT_MAX_AGE_MS ||
      now - data.createdAt > BIRTH_PROFILE_DRAFT_MAX_AGE_MS
    ) {
      removeDraft(storage);
      return null;
    }

    const step = data.step === undefined ? 1 : data.step;
    const displayName = data.displayName === undefined ? "" : data.displayName;
    const forWhom = data.forWhom === undefined ? "self" : data.forWhom;
    const consentOther = data.consentOther === undefined ? false : data.consentOther;
    const gender = data.gender === undefined ? null : data.gender;
    const calendarType = data.calendarType === undefined ? "solar" : data.calendarType;
    const isLeapMonth = data.isLeapMonth === undefined ? false : data.isLeapMonth;
    const day = data.day === undefined ? "" : data.day;
    const month = data.month === undefined ? "" : data.month;
    const year = data.year === undefined ? "" : data.year;
    const place = data.place === undefined ? "" : data.place;
    const timeState: BirthTimeState | null =
      data.timeState === undefined
        ? { precision: "exact_minute" as const, hour: "", minute: "" }
        : parseTimeState(data.timeState);

    if (
      (step !== 1 && step !== 2 && step !== 3) ||
      typeof displayName !== "string" ||
      displayName.length > 80 ||
      (forWhom !== "self" && forWhom !== "other") ||
      typeof consentOther !== "boolean" ||
      (gender !== null && gender !== "male" && gender !== "female") ||
      (calendarType !== "solar" && calendarType !== "lunar") ||
      typeof isLeapMonth !== "boolean" ||
      typeof day !== "string" ||
      !/^\d{0,2}$/.test(day) ||
      typeof month !== "string" ||
      !/^\d{0,2}$/.test(month) ||
      typeof year !== "string" ||
      !/^\d{0,4}$/.test(year) ||
      typeof place !== "string" ||
      place.length > 120 ||
      !timeState ||
      (calendarType === "solar" && isLeapMonth) ||
      (calendarType === "lunar" && isFutureLunarYear(year, now))
    ) {
      removeDraft(storage);
      return null;
    }

    if (day && month && year) {
      const date = validateWizardDate(day, month, year, {
        referenceDate: new Date(now),
        calendarType,
      });
      if (!date.valid) {
        removeDraft(storage);
        return null;
      }
    }

    return {
      version: BIRTH_PROFILE_DRAFT_VERSION,
      step: resolveRestorableWizardStep(
        { step, forWhom, consentOther, gender, calendarType, day, month, year, timeState },
        now,
      ),
      displayName,
      forWhom,
      consentOther,
      gender,
      calendarType,
      isLeapMonth,
      day,
      month,
      year,
      timeState,
      place,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    };
  } catch {
    removeDraft(storage);
    return null;
  }
}

export function saveBirthProfileDraft(
  input: BirthProfileDraftInput,
  options?: { localStorage?: Storage; now?: number },
): boolean {
  const now = options?.now ?? Date.now();
  const storage = getStorage(options?.localStorage);
  if (!storage) return false;

  try {
    const existing = readBirthProfileDraft({ localStorage: storage, now });
    const payload = {
      version: BIRTH_PROFILE_DRAFT_VERSION,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
      ...(input.step === undefined ? {} : { step: input.step }),
      ...(input.displayName === undefined ? {} : { displayName: input.displayName.slice(0, 80) }),
      ...(input.forWhom === undefined ? {} : { forWhom: input.forWhom }),
      ...(input.consentOther === undefined ? {} : { consentOther: Boolean(input.consentOther) }),
      ...(input.gender === undefined || input.gender === null ? {} : { gender: input.gender }),
      ...(input.calendarType === undefined ? {} : { calendarType: input.calendarType }),
      ...(input.isLeapMonth === undefined ? {} : { isLeapMonth: Boolean(input.isLeapMonth) }),
      ...(input.day === undefined ? {} : { day: input.day.slice(0, 2) }),
      ...(input.month === undefined ? {} : { month: input.month.slice(0, 2) }),
      ...(input.year === undefined ? {} : { year: input.year.slice(0, 4) }),
      ...(input.timeState === undefined ? {} : { timeState: input.timeState }),
      ...(input.place === undefined ? {} : { place: input.place.slice(0, 120) }),
    };
    storage.setItem(BIRTH_PROFILE_DRAFT_STORAGE_KEY, JSON.stringify(payload));
    return true;
  } catch {
    return false;
  }
}

export function saveHomepageDraft(
  input: HomepageDraftInput,
  options?: { localStorage?: Storage; now?: number },
): boolean {
  const storage = getStorage(options?.localStorage);
  if (!storage) return false;

  const timeState: BirthTimeState =
    input.timeMode === "exact_minute"
      ? {
          precision: "exact_minute" as const,
          hour: (input.hour ?? "").trim(),
          minute: (input.minute ?? "").trim(),
        }
      : input.timeMode === "branch_only" && isCanonicalBranchId(input.branch)
        ? { precision: "branch_only", branch: input.branch }
        : { precision: "unknown" };
  const existing = readBirthProfileDraft(options);
  const merged: BirthProfileDraftInput = {
    step: existing?.step ?? 1,
    displayName: existing?.displayName ?? "",
    forWhom: existing?.forWhom ?? "self",
    consentOther: existing?.consentOther ?? false,
    gender: existing?.gender ?? null,
    calendarType: "solar",
    isLeapMonth: false,
    day: input.day,
    month: input.month,
    year: input.year,
    timeState,
    place: existing?.place ?? "",
  };

  merged.step = resolveRestorableWizardStep(merged, options?.now);
  return saveBirthProfileDraft(merged, options);
}

export function clearBirthProfileDraft(options?: { localStorage?: Storage }): void {
  const storage = getStorage(options?.localStorage);
  if (storage) removeDraft(storage);
}
