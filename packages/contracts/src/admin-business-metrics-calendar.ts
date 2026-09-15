const VIETNAM_OFFSET_HOURS = 7;
const VIETNAM_OFFSET_MS = VIETNAM_OFFSET_HOURS * 60 * 60 * 1000;

export function getVietnamLocalDateKey(now: Date): string {
  const local = new Date(now.getTime() + VIETNAM_OFFSET_MS);
  const year = local.getUTCFullYear();
  const month = String(local.getUTCMonth() + 1).padStart(2, "0");
  const day = String(local.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function addCalendarDays(dateStr: string, days: number): string {
  const [y = 0, m = 1, d = 1] = dateStr.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d + days));
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function countInclusiveCalendarDays(from: string, to: string): number {
  const [y1 = 0, m1 = 1, d1 = 1] = from.split("-").map(Number);
  const [y2 = 0, m2 = 1, d2 = 1] = to.split("-").map(Number);
  const ms1 = Date.UTC(y1, m1 - 1, d1);
  const ms2 = Date.UTC(y2, m2 - 1, d2);
  return Math.round((ms2 - ms1) / (24 * 60 * 60 * 1000)) + 1;
}

export function isValidCalendarDate(dateStr: string): boolean {
  if (typeof dateStr !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return false;
  }
  const parts = dateStr.split("-");
  const yStr = parts[0];
  const mStr = parts[1];
  const dStr = parts[2];
  if (!yStr || !mStr || !dStr) return false;
  const y = Number(yStr);
  const m = Number(mStr);
  const d = Number(dStr);
  if (!Number.isInteger(y) || !Number.isInteger(m) || !Number.isInteger(d)) {
    return false;
  }
  if (m < 1 || m > 12) return false;
  const maxDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return d >= 1 && d <= maxDay;
}

export function generateCalendarDayRange(
  fromDate: string,
  toDate: string,
): string[] {
  const dates: string[] = [];
  let current = fromDate;
  while (current <= toDate) {
    dates.push(current);
    current = addCalendarDays(current, 1);
  }
  return dates;
}
