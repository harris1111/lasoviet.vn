import { BaziFactsInputV1Schema, NormalizedBirthProfileV1Schema,
  type BaziFactsInputV1, type NormalizedBaziChartV1 } from "@lasoviet/contracts";
import { Lunar } from "lunar-typescript";
import { calculateNormalizedBaziChart } from "./normalized-bazi-chart.js";

export type BaziProfileMappingError = "BAZI_PROFILE_INVALID" | "BAZI_PROFILE_BINDING_MISMATCH"
  | "BAZI_PROFILE_CALENDAR_INVALID" | "BAZI_PROFILE_TIME_PRECISION_UNSUPPORTED"
  | "BAZI_PROFILE_TIMEZONE_UNRESOLVED";
type MappingResult<T> = {ok: true; value: T} | {ok: false; error: {code: BaziProfileMappingError}};
const fail = (code: BaziProfileMappingError): MappingResult<never> => ({ok: false, error: {code}});

/** Exact-minute resolution only: folds, gaps and historical second offsets are refused. */
function uniqueIanaInstant(date: string, time: string, zone: string): Date | undefined {
  const [year, month, day] = date.split("-").map(Number), [hour, minute] = time.split(":").map(Number);
  const local = {year, month, day, hour, minute}, nominal = Date.UTC(year!, month! - 1, day!, hour!, minute!);
  let formatter: Intl.DateTimeFormat;
  try {
    formatter = new Intl.DateTimeFormat("en-CA", {timeZone: zone, year: "numeric", month: "2-digit",
      day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23"});
  } catch { return undefined; }
  const matches: number[] = [];
  for (let at = nominal - 16 * 60 * 60 * 1000; at <= nominal + 16 * 60 * 60 * 1000; at += 60 * 1000) {
    const parts = formatter.formatToParts(at);
    const value = (key: Intl.DateTimeFormatPartTypes) => Number(parts.find(part => part.type === key)?.value);
    if (Object.entries(local).every(([key, n]) => value(key as Intl.DateTimeFormatPartTypes) === n)
        && value("second") === 0) matches.push(at);
  }
  return matches.length === 1 ? new Date(matches[0]!) : undefined;
}

/** Private input only; callers must authorize the stored profile before resolving it. */
export function resolveBaziBirthProfileInput(input: unknown): MappingResult<BaziFactsInputV1> {
  const parsed = NormalizedBirthProfileV1Schema.safeParse(input);
  if (!parsed.success) return fail("BAZI_PROFILE_INVALID");
  const p = parsed.data, original = p.originalInput, timezone = p.timezoneProvenance;
  if (JSON.stringify(p.normalizedCalendar) !== JSON.stringify(original.calendar)
      || JSON.stringify(p.normalizedTime) !== JSON.stringify(original.time)
      || (timezone.source === "offset" ? timezone.offsetMinutes !== original.timezone.offsetMinutes
        : timezone.ianaZone !== original.timezone.ianaZone)) return fail("BAZI_PROFILE_BINDING_MISMATCH");
  const time = p.normalizedTime;
  if (time.precision === "branch_only" || time.precision === "range") return fail("BAZI_PROFILE_TIME_PRECISION_UNSUPPORTED");
  if (time.precision === "unknown" && (timezone.source === "iana" || p.utcInstant !== undefined))
    return fail("BAZI_PROFILE_TIMEZONE_UNRESOLVED");
  let date = p.normalizedCalendar.date;
  if (p.normalizedCalendar.kind === "lunar") {
    const [year, month, day] = date.split("-").map(Number);
    const signedMonth = p.normalizedCalendar.isLeapMonth ? -month! : month!;
    try {
      // Midnight is used for calendar conversion only; an unknown birth hour stays absent.
      const lunar = Lunar.fromYmdHms(year!, signedMonth, day!, 0, 0, 0);
      const solar = lunar.getSolar();
      const roundtrip = solar.getLunar();
      if (roundtrip.getYear() !== year || roundtrip.getMonth() !== signedMonth || roundtrip.getDay() !== day)
        return fail("BAZI_PROFILE_CALENDAR_INVALID");
      date = solar.toYmd();
    } catch { return fail("BAZI_PROFILE_CALENDAR_INVALID"); }
  }
  let offsetMinutes: number;
  if (timezone.source === "offset") {
    offsetMinutes = timezone.offsetMinutes;
    if (time.precision === "exact_minute" && p.utcInstant !== undefined) {
      const expected = new Date(`${date}T${time.localTime}:00Z`).getTime() - offsetMinutes * 60 * 1000;
      if (new Date(p.utcInstant).getTime() !== expected) return fail("BAZI_PROFILE_BINDING_MISMATCH");
    }
  } else {
    if (time.precision !== "exact_minute") return fail("BAZI_PROFILE_TIMEZONE_UNRESOLVED");
    const instant = uniqueIanaInstant(date, time.localTime, timezone.ianaZone);
    if (instant === undefined) return fail("BAZI_PROFILE_TIMEZONE_UNRESOLVED");
    if (p.utcInstant !== undefined && new Date(p.utcInstant).getTime() !== instant.getTime())
      return fail("BAZI_PROFILE_BINDING_MISMATCH");
    offsetMinutes = (new Date(`${date}T${time.localTime}:00Z`).getTime() - instant.getTime()) / 60000;
  }
  const resolved = BaziFactsInputV1Schema.safeParse({localSolarDate: date,
    localTime: time.precision === "exact_minute" ? time.localTime : null, offsetMinutes});
  return resolved.success ? {ok: true, value: resolved.data} : fail("BAZI_PROFILE_CALENDAR_INVALID");
}

/** Pure private preparation, with redacted output and an injected provenance timestamp. */
export function calculateBaziBirthProfile(input: unknown, calculatedAt: Date): MappingResult<NormalizedBaziChartV1> {
  const mapped = resolveBaziBirthProfileInput(input);
  if (!mapped.ok) return mapped;
  return {ok: true, value: calculateNormalizedBaziChart(mapped.value, calculatedAt)};
}
