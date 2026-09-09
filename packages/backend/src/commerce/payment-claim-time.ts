export const VIETNAM_OFFSET_HOURS = 7;
export const VIETNAM_OFFSET_MS = VIETNAM_OFFSET_HOURS * 60 * 60 * 1000;
export const CLAIM_WINDOW_MINUTES = 15;
export const CLAIM_WINDOW_MS = CLAIM_WINDOW_MINUTES * 60 * 1000;

function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

function daysInMonth(year: number, month: number): number {
  switch (month) {
    case 1: case 3: case 5: case 7: case 8: case 10: case 12:
      return 31;
    case 4: case 6: case 9: case 11:
      return 30;
    case 2:
      return isLeapYear(year) ? 29 : 28;
    default:
      return 0;
  }
}

export type ParsedClaimTime = {
  utcInstant: Date;
  windowStart: Date;
  windowEnd: Date;
};

export function parseTransferredAtLocal(transferredAtLocal: string): ParsedClaimTime {
  if (typeof transferredAtLocal !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(transferredAtLocal)) {
    throw new Error("INVALID_TRANSFERRED_AT_LOCAL_FORMAT");
  }

  const [datePart, timePart] = transferredAtLocal.split("T");
  if (!datePart || !timePart) {
    throw new Error("INVALID_TRANSFERRED_AT_LOCAL_PARTS");
  }

  const [yearStr, monthStr, dayStr] = datePart.split("-");
  const [hourStr, minuteStr] = timePart.split(":");
  if (!yearStr || !monthStr || !dayStr || !hourStr || !minuteStr) {
    throw new Error("INVALID_TRANSFERRED_AT_LOCAL_FIELDS");
  }

  const year = Number(yearStr);
  const month = Number(monthStr);
  const day = Number(dayStr);
  const hour = Number(hourStr);
  const minute = Number(minuteStr);

  if (month < 1 || month > 12) {
    throw new Error("INVALID_TRANSFERRED_AT_LOCAL_MONTH");
  }
  if (day < 1 || day > daysInMonth(year, month)) {
    throw new Error("INVALID_TRANSFERRED_AT_LOCAL_DAY");
  }
  if (hour < 0 || hour > 23) {
    throw new Error("INVALID_TRANSFERRED_AT_LOCAL_HOUR");
  }
  if (minute < 0 || minute > 59) {
    throw new Error("INVALID_TRANSFERRED_AT_LOCAL_MINUTE");
  }

  const localUtcMs = Date.UTC(year, month - 1, day, hour, minute, 0, 0);
  const utcMs = localUtcMs - VIETNAM_OFFSET_MS;
  const utcInstant = new Date(utcMs);
  const windowStart = new Date(utcMs - CLAIM_WINDOW_MS);
  const windowEnd = new Date(utcMs + CLAIM_WINDOW_MS);

  return {
    utcInstant,
    windowStart,
    windowEnd,
  };
}

export type VietnamCalendarDayBounds = {
  startUtc: Date;
  endUtc: Date;
  nextDayStartUtc: Date;
  localDateKey: string;
};

export function getVietnamCalendarDayBounds(now: Date): VietnamCalendarDayBounds {
  const localDate = new Date(now.getTime() + VIETNAM_OFFSET_MS);
  const year = localDate.getUTCFullYear();
  const month = localDate.getUTCMonth();
  const day = localDate.getUTCDate();

  const startUtc = new Date(Date.UTC(year, month, day, 0, 0, 0, 0) - VIETNAM_OFFSET_MS);
  const nextDayStartUtc = new Date(startUtc.getTime() + 24 * 60 * 60 * 1000);
  const endUtc = new Date(nextDayStartUtc.getTime() - 1);
  const localDateKey = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

  return {
    startUtc,
    endUtc,
    nextDayStartUtc,
    localDateKey,
  };
}
