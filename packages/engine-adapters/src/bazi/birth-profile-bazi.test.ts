import { describe, expect, it } from "vitest";
import { type BirthCalendarInput, type BirthTimeInput, type BirthTimezoneInput, type NormalizedBirthProfileV1 } from "@lasoviet/contracts";
import { resolveBaziBirthProfileInput, calculateBaziBirthProfile } from "./birth-profile-bazi.js";
import { baziCalculationKey, calculateNormalizedBaziChart } from "./normalized-bazi-chart.js";

const at = new Date("2026-10-09T00:00:00Z");
function profile(calendar: BirthCalendarInput = {kind: "solar", date: "1992-06-15"},
  time: BirthTimeInput = {precision: "exact_minute", localTime: "08:30"},
  timezone: BirthTimezoneInput = {offsetMinutes: 420}): NormalizedBirthProfileV1 {
  return {version: 1, originalInput: {version: 1, calendar, time, timezone, consentVersion: "synthetic",
    displayName: "PRIVATE_DISPLAY", placeLabel: "PRIVATE_PLACE"}, normalizedCalendar: calendar, normalizedTime: time,
    timezoneProvenance: timezone.offsetMinutes !== undefined ? {source: "offset", offsetMinutes: timezone.offsetMinutes}
      : {source: "iana", ianaZone: timezone.ianaZone!, runtime: "Intl"}, normalizationWarnings: [], limitations: []};
}
const error = (code: string) => ({ok: false, error: {code}});

describe("private Bazi normalized profile mapping", () => {
  it("preserves actual fixed-offset exact-minute calculation and redacts private inputs", () => {
    const p = profile(), result = calculateBaziBirthProfile(p, at);
    expect(result.ok).toBe(true); if (!result.ok) throw new Error("expected calculation");
    expect(result.value).toEqual(calculateNormalizedBaziChart({localSolarDate: "1992-06-15", localTime: "08:30", offsetMinutes: 420}, at));
    for (const secret of ["1992-06-15", "08:30", "PRIVATE_DISPLAY", "PRIVATE_PLACE", "originalInput"])
      expect(JSON.stringify(result)).not.toContain(secret);
  });
  it("converts a genuine leap lunar month to the same solar calculation key", () => {
    const lunar = profile({kind: "lunar", date: "2023-02-01", isLeapMonth: true});
    expect(resolveBaziBirthProfileInput(lunar)).toEqual({ok: true, value: {localSolarDate: "2023-03-22", localTime: "08:30", offsetMinutes: 420}});
    const a = calculateBaziBirthProfile(lunar, at), b = calculateBaziBirthProfile(profile({kind: "solar", date: "2023-03-22"}), at);
    expect(a.ok && b.ok).toBe(true); if (!a.ok || !b.ok) throw new Error("expected calendar equivalence");
    expect(baziCalculationKey(a.value)).toBe(baziCalculationKey(b.value)); expect(a.value).toEqual(b.value);
  });
  it("keeps unknown hour absent through lunar conversion", () => {
    const result = calculateBaziBirthProfile(profile({kind: "lunar", date: "2023-02-01", isLeapMonth: true}, {precision: "unknown"}), at);
    expect(result.ok).toBe(true); if (!result.ok) throw new Error("expected date-only source");
    expect(result.value.facts.pillars.hour).toBeNull(); expect(result.value.structure.visibleElementInventory?.characterCount).toBe(6);
    expect(result.value.timePrecision).toBe("unknown"); expect(result.value.provisional).toBe(true);
  });
  it.each([
    {kind: "lunar" as const, date: "2023-03-01", isLeapMonth: true},
    {kind: "lunar" as const, date: "2023-02-30", isLeapMonth: true},
  ])("refuses nonexistent lunar day or leap month %j", calendar => {
    expect(resolveBaziBirthProfileInput(profile(calendar))).toEqual(error("BAZI_PROFILE_CALENDAR_INVALID"));
  });
  it.each([
    ["Asia/Ho_Chi_Minh", 420], ["Asia/Kathmandu", 345], ["America/New_York", -240],
  ] as const)("resolves actual unique Intl offset %s", (ianaZone, offsetMinutes) => {
    const result = resolveBaziBirthProfileInput(profile(undefined, undefined, {ianaZone}));
    expect(result).toEqual({ok: true, value: {localSolarDate: "1992-06-15", localTime: "08:30", offsetMinutes}});
  });
  it("resolves IANA using the converted solar date for lunar profiles", () => {
    const result = resolveBaziBirthProfileInput(profile({kind: "lunar", date: "2023-02-01", isLeapMonth: true}, undefined, {ianaZone: "America/New_York"}));
    expect(result).toEqual({ok: true, value: {localSolarDate: "2023-03-22", localTime: "08:30", offsetMinutes: -240}});
  });
  it.each([
    ["2026-03-08", "02:30", "America/New_York"], ["2026-11-01", "01:30", "America/New_York"],
    ["2011-12-30", "08:30", "Pacific/Apia"], ["1900-06-15", "08:30", "Europe/Paris"],
  ])("refuses DST gap/fold/skipped day or historical seconds %s %s %s", (date, localTime, ianaZone) => {
    expect(resolveBaziBirthProfileInput(profile({kind: "solar", date}, {precision: "exact_minute", localTime}, {ianaZone})))
      .toEqual(error("BAZI_PROFILE_TIMEZONE_UNRESOLVED"));
  });
  it.each([{precision: "branch_only" as const, branch: "zi" as const},
    {precision: "range" as const, startLocalTime: "08:00", endLocalTime: "10:00"}])("does not invent a representative hour for %j", time => {
    expect(resolveBaziBirthProfileInput(profile(undefined, time))).toEqual(error("BAZI_PROFILE_TIME_PRECISION_UNSUPPORTED"));
  });
  it("does not invent an offset for unknown-hour IANA profiles", () => {
    expect(resolveBaziBirthProfileInput(profile(undefined, {precision: "unknown"}, {ianaZone: "Asia/Ho_Chi_Minh"})))
      .toEqual(error("BAZI_PROFILE_TIMEZONE_UNRESOLVED"));
  });
  it("refuses substituted normalized calendar, time or timezone", () => {
    for (const changed of [{normalizedCalendar: {kind: "solar", date: "1993-06-15"}},
      {normalizedTime: {precision: "exact_minute", localTime: "10:30"}}, {timezoneProvenance: {source: "offset", offsetMinutes: 480}}])
      expect(resolveBaziBirthProfileInput({...profile(), ...changed})).toEqual(error("BAZI_PROFILE_BINDING_MISMATCH"));
  });
  it.each([{offsetMinutes: 420}, {ianaZone: "Asia/Ho_Chi_Minh"}])("binds optional stored UTC instant to actual local time %j", timezone => {
    const p = {...profile(undefined, undefined, timezone), utcInstant: "1992-06-15T01:30:00Z"};
    expect(resolveBaziBirthProfileInput(p).ok).toBe(true);
    expect(resolveBaziBirthProfileInput({...p, utcInstant: "1992-06-15T02:30:00Z"})).toEqual(error("BAZI_PROFILE_BINDING_MISMATCH"));
  });
  it("refuses representative UTC with unknown hour and never returns input details in errors", () => {
    expect(resolveBaziBirthProfileInput({...profile(undefined, {precision: "unknown"}), utcInstant: "1992-06-15T01:30:00Z"}))
      .toEqual(error("BAZI_PROFILE_TIMEZONE_UNRESOLVED"));
    const result = resolveBaziBirthProfileInput({...profile(), privateField: "PRIVATE_SECRET"});
    expect(result).toEqual(error("BAZI_PROFILE_INVALID")); expect(JSON.stringify(result)).not.toContain("PRIVATE");
  });
});
