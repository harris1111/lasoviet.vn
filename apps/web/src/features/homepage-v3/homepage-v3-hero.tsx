"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

import { validateWizardDate } from "../birth-profile/birth-wizard-state";
import { saveBirthProfileDraft, readBirthProfileDraft } from "../birth-profile/birth-profile-draft";
import {
  CANONICAL_BRANCH_IDS,
  getBranchOptionLabel,
  saveHomepageBirthPrefill,
  type CanonicalBranchId,
} from "../birth-profile/homepage-birth-prefill";
import { localizedPath } from "../homepage/homepage-utilities";
import { HERO_LENSES } from "./homepage-v3-data";
import { HomepageV3HeroChart } from "./homepage-v3-hero-chart";
import { deriveHeroStage } from "./homepage-v3-hero-stage";
import {
  toHomepageV3Draft,
  toHomepageV3Prefill,
  type HomepageV3BirthValues,
} from "./homepage-v3-birth-profile";

type Locale = "en" | "vi";
type Errors = Partial<Record<"date" | "time" | "gender" | "storage", string>>;

const INITIAL: HomepageV3BirthValues = {
  displayName: "",
  gender: null,
  calendarType: "solar",
  isLeapMonth: false,
  day: "",
  month: "",
  year: "",
  timeMode: "exact_minute",
  hour: "",
  minute: "",
  branch: "",
  timeUnknown: false,
  topConcern: null,
};

const digits = (value: string, max: number) => value.replace(/\D/g, "").slice(0, max);

export function HomepageV3Hero({ locale }: { locale: Locale }) {
  const t = useTranslations("homepage-v3.hero");
  const router = useRouter();
  const [values, setValues] = useState<HomepageV3BirthValues>(INITIAL);
  const [errors, setErrors] = useState<Errors>({});

  // Restore a draft saved by this form or by the wizard so the exact minute survives a round trip.
  useEffect(() => {
    const draft = readBirthProfileDraft();
    if (!draft || !(draft.day || draft.month || draft.year)) return;
    queueMicrotask(() => {
      setValues({
        displayName: draft.displayName,
        gender: draft.gender,
        calendarType: draft.calendarType,
        isLeapMonth: draft.isLeapMonth,
        day: draft.day,
        month: draft.month,
        year: draft.year,
        timeMode: draft.timeState.precision === "branch_only" ? "branch_only" : "exact_minute",
        hour: draft.timeState.precision === "exact_minute" ? draft.timeState.hour : "",
        minute: draft.timeState.precision === "exact_minute" ? draft.timeState.minute : "",
        branch: draft.timeState.precision === "branch_only" ? draft.timeState.branch : "",
        timeUnknown: draft.timeState.precision === "unknown",
        topConcern:
          HERO_LENSES.find((lens) => lens.concern === draft.readingContext?.topConcern)?.concern ?? null,
      });
    });
  }, []);

  function patch(next: Partial<HomepageV3BirthValues>) {
    setValues((current) => ({ ...current, ...next }));
    setErrors({});
  }

  function validate(now: Date): Errors {
    const found: Errors = {};
    const { day, month, year, calendarType } = values;
    if (!/^\d{1,2}$/.test(day) || !/^\d{1,2}$/.test(month) || !/^\d{4}$/.test(year)) {
      found.date = t("errors.dateEmpty");
    } else {
      const result = validateWizardDate(day, month, year, { referenceDate: now, calendarType });
      if (!result.valid) {
        const outOfRange = Number(year) < 1920 || Number(year) > now.getFullYear();
        found.date =
          result.error === "FUTURE_DATE"
            ? t("errors.dateFuture")
            : outOfRange
              ? t("errors.dateRange")
              : t("errors.dateImpossible");
      } else if (calendarType === "lunar" && Number(year) > now.getFullYear()) {
        found.date = t("errors.dateRange");
      }
    }
    if (!values.timeUnknown && values.timeMode === "exact_minute") {
      const { hour, minute } = values;
      if (!/^\d{1,2}$/.test(hour) || !/^\d{1,2}$/.test(minute) || Number(hour) > 23 || Number(minute) > 59) {
        found.time = t("errors.time");
      }
    }
    if (!values.timeUnknown && values.timeMode === "branch_only" && !values.branch) {
      found.time = t("errors.branch");
    }
    if (!values.gender) found.gender = t("errors.gender");
    return found;
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const now = new Date();
    const found = validate(now);
    if (Object.keys(found).length > 0) {
      setErrors(found);
      return;
    }
    const draft = toHomepageV3Draft(values, now);
    if (!draft) {
      setErrors({ date: t("errors.dateImpossible") });
      return;
    }
    // The draft is what the wizard restores first, so it must be saved before we navigate.
    if (!saveBirthProfileDraft(draft)) {
      setErrors({ storage: t("errors.storage") });
      return;
    }
    const prefill = toHomepageV3Prefill(values);
    if (prefill) saveHomepageBirthPrefill({ ...prefill, calendarType: "solar", isLeapMonth: false });
    router.push(localizedPath(locale, "/tao-la-so/tu-vi"));
  }

  const hero = deriveHeroStage(values, new Date());
  const timeDisabled = values.timeUnknown;

  return (
    <div className="hv3-hero-inner">
      <div className="hv3-hero-copy">
        <h1 className="hv3-h1">
          {t("h1a")}
          <br />
          <span className="hv3-accent">{t("h1b")}</span>
        </h1>
        <p className="hv3-sub">{t("sub")}</p>

        <form noValidate onSubmit={onSubmit} aria-label={t("formLabel")} className="hv3-form">
          <div role="group" aria-labelledby="hv3-date-label" className="hv3-field">
            <div className="hv3-field-head">
              <span id="hv3-date-label" className="hv3-label">{t("dateLabel")}</span>
              <div role="group" aria-label={t("calendarLabel")} className="hv3-seg">
                <button type="button" aria-pressed={values.calendarType === "solar"} onClick={() => patch({ calendarType: "solar", isLeapMonth: false })}>{t("solar")}</button>
                <button type="button" aria-pressed={values.calendarType === "lunar"} onClick={() => patch({ calendarType: "lunar" })}>{t("lunar")}</button>
              </div>
            </div>
            <div className="hv3-date-grid">
              <input id="hv3-day" aria-label={t("day")} aria-invalid={Boolean(errors.date)} inputMode="numeric" autoComplete="off" maxLength={2} placeholder={t("day")} value={values.day} onChange={(e) => patch({ day: digits(e.target.value, 2) })} className="hv3-input hv3-center" />
              <input aria-label={t("month")} aria-invalid={Boolean(errors.date)} inputMode="numeric" autoComplete="off" maxLength={2} placeholder={t("month")} value={values.month} onChange={(e) => patch({ month: digits(e.target.value, 2) })} className="hv3-input hv3-center" />
              <input aria-label={t("year")} aria-invalid={Boolean(errors.date)} inputMode="numeric" autoComplete="off" maxLength={4} placeholder={t("year")} value={values.year} onChange={(e) => patch({ year: digits(e.target.value, 4) })} className="hv3-input hv3-center" />
            </div>
            {values.calendarType === "lunar" ? (
              <label className="hv3-check">
                <input type="checkbox" checked={values.isLeapMonth} onChange={() => patch({ isLeapMonth: !values.isLeapMonth })} />
                {t("leap")}
              </label>
            ) : null}
            {errors.date ? <p role="alert" className="hv3-error">{errors.date}</p> : null}
          </div>

          <div className="hv3-field">
            <span id="hv3-time-label" className="hv3-label">{t("timeLabel")}</span>
            <div role="group" aria-labelledby="hv3-time-label" className="hv3-seg">
              <button type="button" aria-pressed={values.timeMode === "exact_minute"} disabled={timeDisabled} onClick={() => patch({ timeMode: "exact_minute" })}>{t("modeExact")}</button>
              <button type="button" aria-pressed={values.timeMode === "branch_only"} disabled={timeDisabled} onClick={() => patch({ timeMode: "branch_only" })}>{t("modeBranch")}</button>
            </div>
            {values.timeMode === "exact_minute" ? (
              <div className="hv3-time-row">
                <label htmlFor="hv3-hour" className="hv3-sr">{t("hourSr")}</label>
                <input id="hv3-hour" inputMode="numeric" autoComplete="off" maxLength={2} placeholder="HH" disabled={timeDisabled} aria-invalid={Boolean(errors.time)} value={values.hour} onChange={(e) => patch({ hour: digits(e.target.value, 2) })} className="hv3-input hv3-center hv3-time-input" />
                <span aria-hidden="true" className="hv3-colon">:</span>
                <label htmlFor="hv3-minute" className="hv3-sr">{t("minuteSr")}</label>
                <input id="hv3-minute" inputMode="numeric" autoComplete="off" maxLength={2} placeholder="MM" disabled={timeDisabled} aria-invalid={Boolean(errors.time)} value={values.minute} onChange={(e) => patch({ minute: digits(e.target.value, 2) })} className="hv3-input hv3-center hv3-time-input" />
              </div>
            ) : (
              <>
                <label htmlFor="hv3-branch" className="hv3-sr">{t("branchSr")}</label>
                <select id="hv3-branch" disabled={timeDisabled} aria-invalid={Boolean(errors.time)} value={values.branch} onChange={(e) => patch({ branch: e.target.value as CanonicalBranchId | "" })} className="hv3-input">
                  <option value="">{t("branchPlaceholder")}</option>
                  {CANONICAL_BRANCH_IDS.map((id) => (
                    <option key={id} value={id}>{getBranchOptionLabel(id, locale)}</option>
                  ))}
                </select>
              </>
            )}
            <label className="hv3-check">
              <input type="checkbox" checked={values.timeUnknown} onChange={() => patch({ timeUnknown: !values.timeUnknown })} />
              {t("unknown")}
            </label>
            {errors.time ? <p role="alert" className="hv3-error">{errors.time}</p> : null}
          </div>

          <div className="hv3-row">
            <div role="group" aria-label={t("genderLabel")} className="hv3-field hv3-grow-sm">
              <span className="hv3-label">{t("genderLabel")}</span>
              <div className="hv3-seg">
                <button type="button" aria-pressed={values.gender === "male"} onClick={() => patch({ gender: "male" })}>{t("male")}</button>
                <button type="button" aria-pressed={values.gender === "female"} onClick={() => patch({ gender: "female" })}>{t("female")}</button>
              </div>
            </div>
            <label className="hv3-field hv3-grow">
              <span className="hv3-label">{t("nameLabel")} <span className="hv3-subtle">{t("nameOptional")}</span></span>
              <input type="text" autoComplete="given-name" maxLength={80} placeholder={t("namePlaceholder")} value={values.displayName} onChange={(e) => patch({ displayName: e.target.value })} className="hv3-input" />
            </label>
          </div>
          {errors.gender ? <p role="alert" className="hv3-error">{errors.gender}</p> : null}
          {errors.storage ? <p role="alert" className="hv3-error">{errors.storage}</p> : null}

          <button type="submit" className="hv3-cta">{t("submit")}</button>
        </form>
      </div>

      <HomepageV3HeroChart hero={hero} locale={locale} />
    </div>
  );
}
