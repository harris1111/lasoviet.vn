import { Solar } from "lunar-typescript";

/** Calendar-only key shared by commerce and frozen period snapshots. */
export function lunarPeriodPurchaseKey(asOfDate: string): string {
  const [year, month, day] = asOfDate.split("-").map(Number);
  const solar = Solar.fromYmd(year!, month!, day!);
  if (solar.toYmd() !== asOfDate) throw new Error("PERIOD_DATE_INVALID");
  const lunar = solar.getLunar();
  return `${lunar.getYear()}-${String(Math.abs(lunar.getMonth())).padStart(2, "0")}-${lunar.getMonth() < 0 ? "leap" : "regular"}`;
}

/** The worker uses the same calendar package as immutable report-period facts. */
export function lunarReminderDay(asOfDate: string) {
  const [year, month, day] = asOfDate.split("-").map(Number);
  const solar = Solar.fromYmd(year!, month!, day!);
  if (solar.toYmd() !== asOfDate) throw new Error("PERIOD_DATE_INVALID");
  const lunar = solar.getLunar();
  return { year: lunar.getYear(), month: Math.abs(lunar.getMonth()), isLeapMonth: lunar.getMonth() < 0, day: lunar.getDay() };
}
