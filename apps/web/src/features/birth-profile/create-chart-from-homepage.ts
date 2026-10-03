import type { ReadingContextV1, TopConcernV1 } from "@lasoviet/contracts";
import { z } from "zod";

import { buildBirthProfile, type BirthTimeState } from "./birth-profile-input";
import { CANONICAL_BRANCH_IDS } from "./homepage-birth-prefill";

/**
 * One server round trip from the homepage form to a calculated chart: save the birth
 * profile (with the visitor's explicit consent), then calculate the Zi Wei chart. The
 * wizard makes the same two calls from the browser; this keeps the homepage path to a
 * single request and keeps consent enforcement on the server.
 */
export type CreateChartFromHomepageInput = {
  locale: "vi" | "en";
  /** Calendar date as `YYYY-MM-DD` in the calendar named by `calendarType`. */
  date: string;
  calendarType: "solar" | "lunar";
  isLeapMonth: boolean;
  time: BirthTimeState;
  gender: "male" | "female";
  displayName?: string;
  consent: boolean;
  forOther: boolean;
  consentOther: boolean;
  topConcern?: TopConcernV1 | null;
};

export type CreateChartFromHomepageResult =
  | { ok: true; chartId: string }
  | {
      ok: false;
      code:
        | "INVALID_INPUT"
        | "CONSENT_REQUIRED"
        | "CONSENT_OTHER_REQUIRED"
        | "PROFILE_FAILED"
        // Profile saved but no chart can be drawn without a known birth time or branch.
        | "TIME_UNKNOWN_SAVED"
        | "CALCULATION_FAILED";
    };

type SaveResult = {
  ok: boolean;
  value?: { revisionId: string; ziweiEligibility: { eligible: boolean } };
  error?: { code: string };
};

type CalculateResult = {
  ok: boolean;
  value?: { chartId: string };
  error?: { code: string };
};

export type CreateChartFromHomepageDependencies = {
  saveBirthProfile(input: {
    profile: unknown;
    explicitConsent: boolean;
    readingContext?: ReadingContextV1;
  }): Promise<SaveResult>;
  calculateZiweiChart(locale: "vi" | "en", revisionId: string): Promise<CalculateResult>;
};

const TOP_CONCERNS = ["self_understanding", "career", "love"] as const;

const inputSchema = z
  .object({
    locale: z.enum(["vi", "en"]),
    date: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/),
    calendarType: z.enum(["solar", "lunar"]),
    isLeapMonth: z.boolean(),
    time: z.discriminatedUnion("precision", [
      z.object({
        precision: z.literal("exact_minute"),
        hour: z.string().regex(/^([01]?\d|2[0-3])$/),
        minute: z.string().regex(/^[0-5]?\d$/),
      }),
      z.object({ precision: z.literal("branch_only"), branch: z.enum(CANONICAL_BRANCH_IDS) }),
      z.object({ precision: z.literal("unknown") }),
    ]),
    gender: z.enum(["male", "female"]),
    displayName: z.string().trim().max(80).optional(),
    consent: z.boolean(),
    forOther: z.boolean(),
    consentOther: z.boolean(),
    topConcern: z.enum(TOP_CONCERNS).nullish(),
  })
  .strict();

export function createChartFromHomepage(dependencies: CreateChartFromHomepageDependencies) {
  return async function create(input: CreateChartFromHomepageInput): Promise<CreateChartFromHomepageResult> {
    const parsed = inputSchema.safeParse(input);
    if (!parsed.success) return { ok: false, code: "INVALID_INPUT" };
    const value = parsed.data;
    if (!value.consent) return { ok: false, code: "CONSENT_REQUIRED" };
    if (value.forOther && !value.consentOther) return { ok: false, code: "CONSENT_OTHER_REQUIRED" };

    const profile = buildBirthProfile({
      displayName: value.displayName ? value.displayName : undefined,
      date: value.date,
      calendarType: value.calendarType,
      isLeapMonth: value.calendarType === "lunar" ? value.isLeapMonth : false,
      time: value.time,
      gender: value.gender,
      locale: value.locale,
    });
    const readingContext: ReadingContextV1 | undefined = value.topConcern
      ? { version: 1, topConcern: value.topConcern }
      : undefined;

    const saved = await dependencies.saveBirthProfile({
      profile,
      explicitConsent: value.consent,
      ...(readingContext ? { readingContext } : {}),
    });
    if (!saved.ok || !saved.value) {
      return { ok: false, code: saved.error?.code === "VALIDATION_FAILED" ? "INVALID_INPUT" : "PROFILE_FAILED" };
    }
    if (!saved.value.ziweiEligibility.eligible) return { ok: false, code: "TIME_UNKNOWN_SAVED" };
    if (!saved.value.revisionId) return { ok: false, code: "PROFILE_FAILED" };

    const calculated = await dependencies.calculateZiweiChart(value.locale, saved.value.revisionId);
    if (!calculated.ok) {
      return {
        ok: false,
        code: calculated.error?.code === "ZIWEI_TIME_INELIGIBLE" ? "TIME_UNKNOWN_SAVED" : "CALCULATION_FAILED",
      };
    }
    if (!calculated.value?.chartId) return { ok: false, code: "CALCULATION_FAILED" };
    return { ok: true, chartId: calculated.value.chartId };
  };
}
