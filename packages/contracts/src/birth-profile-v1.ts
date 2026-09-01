import { z } from "zod";

const localDateSchema = z.iso.date();
const localTimeSchema = z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/);

export const BirthCalendarInputSchema = z.discriminatedUnion("kind", [
  z
    .object({
      kind: z.literal("solar"),
      date: localDateSchema,
    })
    .strict(),
  z
    .object({
      kind: z.literal("lunar"),
      date: localDateSchema,
      isLeapMonth: z.boolean(),
    })
    .strict(),
]);
export type BirthCalendarInput = z.infer<typeof BirthCalendarInputSchema>;

export const BirthTimeInputSchema = z.discriminatedUnion("precision", [
  z
    .object({
      precision: z.literal("exact_minute"),
      localTime: localTimeSchema,
    })
    .strict(),
  z
    .object({
      precision: z.literal("branch_only"),
      branch: z.enum([
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
      ]),
    })
    .strict(),
  z
    .object({
      precision: z.literal("range"),
      startLocalTime: localTimeSchema,
      endLocalTime: localTimeSchema,
    })
    .strict(),
  z.object({ precision: z.literal("unknown") }).strict(),
]);
export type BirthTimeInput = z.infer<typeof BirthTimeInputSchema>;

export const BirthTimezoneInputSchema = z
  .object({
    offsetMinutes: z.number().int().min(-840).max(840).optional(),
    ianaZone: z.string().trim().min(1).optional(),
  })
  .strict()
  .refine(
    (timezone) =>
      (timezone.offsetMinutes === undefined) !== (timezone.ianaZone === undefined),
    "Timezone requires exactly one offset or IANA zone",
  );
export type BirthTimezoneInput = z.infer<typeof BirthTimezoneInputSchema>;

export const BirthProfileV1Schema = z
  .object({
    version: z.literal(1),
    calendar: BirthCalendarInputSchema,
    time: BirthTimeInputSchema,
    timezone: BirthTimezoneInputSchema,
    consentVersion: z.string().trim().min(1),
    locale: z.string().trim().min(1).optional(),
    gender: z.string().trim().min(1).optional(),
    location: z
      .object({
        latitude: z.number().min(-90).max(90),
        longitude: z.number().min(-180).max(180),
      })
      .strict()
      .optional(),
  })
  .strict();
export type BirthProfileV1 = z.infer<typeof BirthProfileV1Schema>;

export type NormalizedBirthProfileV1 = {
  version: 1;
  originalInput: BirthProfileV1;
  normalizedCalendar: BirthCalendarInput;
  normalizedTime: BirthTimeInput;
  timezoneProvenance:
    | { source: "offset"; offsetMinutes: number }
    | { source: "iana"; ianaZone: string; runtime: "Intl" };
  utcInstant?: string;
  normalizationWarnings: string[];
  limitations: string[];
};

export type BirthProfileRequestV1 = BirthProfileV1;
export const BirthProfileRequestV1Schema = BirthProfileV1Schema;
