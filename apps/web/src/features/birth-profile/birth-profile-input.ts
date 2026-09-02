export type BirthProfileInput = {
  date: string;
  hour: string;
  minute: string;
  timeUnknown: boolean;
  locale: "en" | "vi";
};

export function buildBirthProfile(input: BirthProfileInput) {
  return {
    version: 1 as const,
    calendar: { kind: "solar" as const, date: input.date },
    time: input.timeUnknown
      ? { precision: "unknown" as const }
      : {
          precision: "exact_minute" as const,
          localTime: `${input.hour.padStart(2, "0")}:${input.minute.padStart(2, "0")}`,
        },
    timezone: { offsetMinutes: 420 },
    consentVersion: "2026-09-01",
    locale: input.locale,
  };
}
