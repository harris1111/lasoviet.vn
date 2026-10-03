"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

import { saveBirthProfileDraft, readBirthProfileDraft } from "../birth-profile/birth-profile-draft";
import {
  CANONICAL_BRANCH_IDS,
  getBranchOptionLabel,
  saveHomepageBirthPrefill,
  type CanonicalBranchId,
} from "../birth-profile/homepage-birth-prefill";
import { trackChartFormSubmit } from "../analytics/funnel-analytics";
import { localizedPath } from "../homepage/homepage-utilities";
import { useHomepageV3Concern } from "./homepage-v3-concern-context";
import { HERO_LENSES } from "./homepage-v3-data";
import {
  reconcileHomepageV3Errors,
  validateHomepageV3BirthValues,
  type HomepageV3FormErrors,
  type HomepageV3ValidationErrorKey,
} from "./homepage-v3-form-validation";
import { deriveHeroStage } from "./homepage-v3-hero-stage";
import {
  toHomepageV3Draft,
  toHomepageV3Prefill,
  type HomepageV3BirthValues,
  type HomepageV3Interest,
} from "./homepage-v3-birth-profile";

type Locale = "en" | "vi";
type Errors = HomepageV3FormErrors;

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

const two = (n: number | string) => String(n).padStart(2, "0");
const DAY_OPTIONS = Array.from({ length: 31 }, (_, i) => two(i + 1));
const MONTH_OPTIONS = Array.from({ length: 12 }, (_, i) => two(i + 1));
const FIRST_BIRTH_YEAR = 1920;
/** Newest year first: most visitors were born in the last 60 years. */
const yearOptions = () => {
  const latest = new Date().getFullYear();
  return Array.from({ length: latest - FIRST_BIRTH_YEAR + 1 }, (_, i) => latest - i);
};

const digits = (value: string, max: number) => value.replace(/\D/g, "").slice(0, max);


export type HomepageV3BirthFormState = ReturnType<typeof useHomepageV3BirthForm>;

/**
 * Owns the birth-form state. Extracted from the v3 hero so a second hero can render
 * the same form with its own headline, and so the derived `hero` stage stays available
 * to whatever sits beside the form (the v3 chart today, the Trời Nam sky later).
 */
export function useHomepageV3BirthForm(locale: Locale) {
  const t = useTranslations("homepage-v3.hero");
  const router = useRouter();
  const concernCtx = useHomepageV3Concern();
  const [values, setValues] = useState<HomepageV3BirthValues>(INITIAL);
  const [errors, setErrors] = useState<Errors>({});
  const [forOther, setForOther] = useState(false);
  const [consentOther, setConsentOther] = useState(false);
  const [pending, setPending] = useState(false);
  // Armed right before a failing setErrors so the effect below knows to move focus; left
  // false for every reconcile-on-keystroke setErrors so typing never steals focus back.
  const shouldFocusRef = useRef(false);

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

  function message(key: HomepageV3ValidationErrorKey): string {
    return t(`errors.${key}`);
  }

  function patch(next: Partial<HomepageV3BirthValues>) {
    const updated = { ...values, ...next };
    setValues(updated);
    const revalidated = validateHomepageV3BirthValues(updated, new Date(), message);
    setErrors((current) => reconcileHomepageV3Errors(current, revalidated, next));
  }

  // Moves focus to the first invalid group once its error has actually rendered — only when
  // armed by a failed submit (shouldFocusRef), never on an ordinary reconcile-on-keystroke
  // setErrors. Priority date -> time -> gender -> storage; storage's own <p> is the target
  // since there's no single control to blame for a failed save.
  useEffect(() => {
    if (!shouldFocusRef.current) return;
    shouldFocusRef.current = false;
    if (errors.date) {
      document.getElementById("hv3-day")?.focus();
      return;
    }
    if (errors.time) {
      const targetId = values.timeUnknown ? null : values.timeMode === "exact_minute" ? "hv3-hour" : "hv3-branch";
      if (targetId) document.getElementById(targetId)?.focus();
      return;
    }
    if (errors.gender) {
      document.getElementById("hv3-gender-male")?.focus();
      return;
    }
    if (errors.consentOther) {
      document.getElementById("hv3-consent-other")?.focus();
      return;
    }
    if (errors.storage) {
      document.getElementById("hv3-storage-error")?.focus();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [errors]);

  function chooseConcern(concern: HomepageV3Interest) {
    patch({ topConcern: concern });
    concernCtx?.setTopConcern(concern);
  }

  function toggleForOther() {
    const next = !forOther;
    setForOther(next);
    if (!next) {
      setConsentOther(false);
      setErrors((current) => ({ ...current, consentOther: undefined }));
    }
  }

  function changeConsentOther(next: boolean) {
    setConsentOther(next);
    if (next) setErrors((current) => ({ ...current, consentOther: undefined }));
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const now = new Date();
    const found = validateHomepageV3BirthValues(values, now, message);
    if (forOther && !consentOther) found.consentOther = t("errors.consentOther");
    if (Object.keys(found).length > 0) {
      shouldFocusRef.current = true;
      setErrors(found);
      return;
    }
    const existing = readBirthProfileDraft();
    // The visitor's latest explicit pick (chip or needs card) wins; the provider and this form
    // keep each other in sync through chooseConcern, so either source holds the current value.
    const effectiveValues: HomepageV3BirthValues = {
      ...values,
      topConcern: concernCtx?.topConcern ?? values.topConcern,
    };
    // Open the wizard straight on its review step: the visitor confirms and consents there, once.
    const draft = toHomepageV3Draft(effectiveValues, now, existing, {
      forWhom: forOther ? "other" : "self",
      consentOther: forOther && consentOther,
      step: 3,
    });
    if (!draft) {
      shouldFocusRef.current = true;
      setErrors({ date: t("errors.dateImpossible") });
      return;
    }
    // The draft is what the wizard restores first, so it must be saved before we navigate.
    if (!saveBirthProfileDraft(draft)) {
      shouldFocusRef.current = true;
      setErrors({ storage: t("errors.storage") });
      return;
    }
    const prefill = toHomepageV3Prefill(effectiveValues);
    if (prefill && !forOther) saveHomepageBirthPrefill({ ...prefill, calendarType: "solar", isLeapMonth: false });
    setErrors({});
    setPending(true);
    void trackChartFormSubmit({
      locale,
      entry_point: "homepage_hero",
      concern: effectiveValues.topConcern ?? undefined,
      time_precision: effectiveValues.timeUnknown ? "unknown" : effectiveValues.timeMode,
    });
    router.push(localizedPath(locale, "/tao-la-so/tu-vi"));
  }

  const hero = deriveHeroStage(values, new Date());
  const timeDisabled = values.timeUnknown;

  const concern = concernCtx?.topConcern ?? values.topConcern ?? null;
  return {
    t,
    locale,
    values,
    errors,
    patch,
    onSubmit,
    hero,
    timeDisabled,
    forOther,
    toggleForOther,
    consentOther,
    changeConsentOther,
    pending,
    concern,
    chooseConcern,
  };
}

export function HomepageV3BirthForm({ state }: { state: HomepageV3BirthFormState }) {
  const {
    t, locale, values, errors, patch, onSubmit, timeDisabled,
    forOther, toggleForOther, consentOther, changeConsentOther,
    pending, concern, chooseConcern,
  } = state;
  const tp = useTranslations("profile");

  return (
        <form noValidate onSubmit={onSubmit} aria-label={t("formLabel")} aria-busy={pending} className="hv3-form">
          <div role="group" aria-labelledby="hv3-date-label" className="hv3-field">
            <div className="hv3-field-head">
              <span id="hv3-date-label" className="hv3-label">{t("dateLabel")}</span>
              <div role="group" aria-label={t("calendarLabel")} className="hv3-seg">
                <button type="button" aria-pressed={values.calendarType === "solar"} onClick={() => patch({ calendarType: "solar", isLeapMonth: false })}>{t("solar")}</button>
                <button type="button" aria-pressed={values.calendarType === "lunar"} onClick={() => patch({ calendarType: "lunar" })}>{t("lunar")}</button>
              </div>
            </div>
            <div className="hv3-date-grid">
              <select
                id="hv3-day"
                aria-label={t("day")}
                aria-invalid={Boolean(errors.date)}
                aria-describedby={errors.date ? "hv3-date-error" : undefined}
                autoComplete="bday-day"
                value={values.day ? two(values.day) : ""}
                onChange={(e) => patch({ day: e.target.value })}
                className="hv3-input hv3-select"
              >
                <option value="">{t("day")}</option>
                {DAY_OPTIONS.map((n) => (<option key={n} value={n}>{n}</option>))}
              </select>
              <select
                id="hv3-month"
                aria-label={t("month")}
                aria-invalid={Boolean(errors.date)}
                aria-describedby={errors.date ? "hv3-date-error" : undefined}
                autoComplete="bday-month"
                value={values.month ? two(values.month) : ""}
                onChange={(e) => patch({ month: e.target.value })}
                className="hv3-input hv3-select"
              >
                <option value="">{t("month")}</option>
                {MONTH_OPTIONS.map((n) => (<option key={n} value={n}>{n}</option>))}
              </select>
              <select
                id="hv3-year"
                aria-label={t("year")}
                aria-invalid={Boolean(errors.date)}
                aria-describedby={errors.date ? "hv3-date-error" : undefined}
                autoComplete="bday-year"
                value={values.year}
                onChange={(e) => patch({ year: e.target.value })}
                className="hv3-input hv3-select"
              >
                <option value="">{t("year")}</option>
                {yearOptions().map((n) => (<option key={n} value={String(n)}>{n}</option>))}
              </select>
            </div>
            {values.calendarType === "lunar" ? (
              <label className="hv3-check">
                <input type="checkbox" checked={values.isLeapMonth} onChange={() => patch({ isLeapMonth: !values.isLeapMonth })} />
                {t("leap")}
              </label>
            ) : null}
            {errors.date ? <p id="hv3-date-error" role="alert" className="hv3-error">{errors.date}</p> : null}
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
                <input
                  id="hv3-hour"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  autoComplete="off"
                  maxLength={2}
                  placeholder="HH"
                  disabled={timeDisabled}
                  aria-invalid={Boolean(errors.time)}
                  aria-describedby={errors.time ? "hv3-time-error" : undefined}
                  value={values.hour}
                  onChange={(e) => {
                    const val = digits(e.target.value, 2);
                    patch({ hour: val });
                    if (val.length === 2) {
                      document.getElementById("hv3-minute")?.focus();
                    }
                  }}
                  className="hv3-input hv3-center hv3-time-input"
                />
                <span aria-hidden="true" className="hv3-colon">:</span>
                <label htmlFor="hv3-minute" className="hv3-sr">{t("minuteSr")}</label>
                <input
                  id="hv3-minute"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  autoComplete="off"
                  maxLength={2}
                  placeholder="MM"
                  disabled={timeDisabled}
                  aria-invalid={Boolean(errors.time)}
                  aria-describedby={errors.time ? "hv3-time-error" : undefined}
                  value={values.minute}
                  onChange={(e) => patch({ minute: digits(e.target.value, 2) })}
                  onKeyDown={(e) => {
                    if (e.key === "Backspace" && !values.minute) {
                      document.getElementById("hv3-hour")?.focus();
                    }
                  }}
                  className="hv3-input hv3-center hv3-time-input"
                />
              </div>
            ) : (
              <>
                <label htmlFor="hv3-branch" className="hv3-sr">{t("branchSr")}</label>
                <select id="hv3-branch" disabled={timeDisabled} aria-invalid={Boolean(errors.time)} aria-describedby={errors.time ? "hv3-time-error" : undefined} value={values.branch} onChange={(e) => patch({ branch: e.target.value as CanonicalBranchId | "" })} className="hv3-input">
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
            {errors.time ? <p id="hv3-time-error" role="alert" className="hv3-error">{errors.time}</p> : null}
          </div>

          <div role="group" aria-label={t("genderLabel")} aria-describedby={errors.gender ? "hv3-gender-error" : undefined} className="hv3-field">
            <span className="hv3-label">{t("genderLabel")}</span>
            <div className="hv3-seg">
              <button id="hv3-gender-male" type="button" aria-pressed={values.gender === "male"} onClick={() => patch({ gender: "male" })}>{t("male")}</button>
              <button id="hv3-gender-female" type="button" aria-pressed={values.gender === "female"} onClick={() => patch({ gender: "female" })}>{t("female")}</button>
            </div>
            {errors.gender ? <p id="hv3-gender-error" role="alert" className="hv3-error">{errors.gender}</p> : null}
          </div>

          <label className="hv3-field">
            <span className="hv3-label">{t("nameLabel")} <span className="hv3-subtle">{t("nameOptional")}</span></span>
            <input id="hv3-name" type="text" autoComplete="given-name" maxLength={80} placeholder={t("namePlaceholder")} value={values.displayName} onChange={(e) => patch({ displayName: e.target.value })} className="hv3-input" />
          </label>

          <div role="group" aria-labelledby="hv3-concern-label" className="hv3-field">
            <span id="hv3-concern-label" className="hv3-label">{t("concernLabel")}</span>
            <div className="hv3-chips">
              {HERO_LENSES.map((lens) => (
                <button key={lens.id} type="button" className="hv3-chip" aria-pressed={concern === lens.concern} onClick={() => chooseConcern(lens.concern)}>
                  {t(`concern.${lens.id}`)}
                </button>
              ))}
            </div>
            <p className="hv3-hint">{t("concernHint")}</p>
          </div>

          <div className="hv3-field">
            <button type="button" className="hv3-link" aria-expanded={forOther} aria-controls="hv3-other" onClick={toggleForOther}>
              {forOther ? t("forSelf") : t("forOther")}
            </button>
            {forOther ? (
              <div id="hv3-other" className="hv3-other">
                <label className="hv3-check hv3-consent">
                  <input id="hv3-consent-other" type="checkbox" checked={consentOther} aria-invalid={Boolean(errors.consentOther)} aria-describedby={errors.consentOther ? "hv3-consent-other-error" : undefined} onChange={(e) => changeConsentOther(e.target.checked)} />
                  <span>{tp("subject.consentCheck")}</span>
                </label>
                {errors.consentOther ? <p id="hv3-consent-other-error" role="alert" className="hv3-error">{errors.consentOther}</p> : null}
              </div>
            ) : null}
          </div>

          {errors.storage ? <p id="hv3-storage-error" role="alert" tabIndex={-1} className="hv3-error">{errors.storage}</p> : null}
          <button type="submit" className="hv3-cta" disabled={pending} aria-disabled={pending}>
            {pending ? t("submitting") : t("submit")}
          </button>
          {pending ? <p className="hv3-sr" role="status">{t("submitting")}</p> : null}
        </form>
  );
}
