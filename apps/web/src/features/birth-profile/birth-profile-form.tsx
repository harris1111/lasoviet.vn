"use client";


export type WizardSubmitStateInput = {
  step: number;
  pending: boolean;
  consent: boolean;
  forWhom: "self" | "other" | null;
  consentOther: boolean;
  dateValid: boolean;
  gender: "male" | "female" | null;
  timeState: BirthTimeState;
};

export function getWizardSubmitGuard(input: WizardSubmitStateInput): {
  canSubmit: boolean;
  buttonDisabled: boolean;
  canExecuteSubmit: boolean;
} {
  const eligible = canSubmitWizard(input);
  return {
    canSubmit: eligible,
    buttonDisabled: !eligible,
    canExecuteSubmit: eligible,
  };
}

export type WizardSubmitAction =
  | { kind: "ABORT_PENDING" }
  | { kind: "ADVANCE_STEP_1" }
  | { kind: "ADVANCE_STEP_2" }
  | { kind: "ERROR_CONSENT_OTHER" }
  | { kind: "ERROR_GENDER" }
  | { kind: "ERROR_INVALID_DATE" }
  | { kind: "ERROR_PROFILE" }
  | { kind: "PROCEED" };

export function resolveWizardSubmitAction(
  input: WizardSubmitStateInput,
): WizardSubmitAction {
  if (input.pending) {
    return { kind: "ABORT_PENDING" };
  }
  if (input.step === 1) {
    return { kind: "ADVANCE_STEP_1" };
  }
  if (input.step === 2) {
    return { kind: "ADVANCE_STEP_2" };
  }
  if (!canAdvanceStep1({ forWhom: input.forWhom, consentOther: input.consentOther })) {
    return { kind: "ERROR_CONSENT_OTHER" };
  }
  if (input.gender === null) {
    return { kind: "ERROR_GENDER" };
  }
  if (!input.dateValid) {
    return { kind: "ERROR_INVALID_DATE" };
  }
  if (
    !canAdvanceStep2({
      dateValid: input.dateValid,
      gender: input.gender,
      timeState: input.timeState,
    })
  ) {
    return { kind: "ERROR_PROFILE" };
  }
  if (!input.consent) {
    return { kind: "ERROR_PROFILE" };
  }
  return { kind: "PROCEED" };
}
import { useEffect, useState, type FormEvent } from "react";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

import {
  buildBirthProfile,
  type BirthTimeState,
} from "./birth-profile-input";
import {
  clearBirthCache,
  consumeHomepageBirthPrefill,
  readBirthCache,
  saveBirthCache,
  HOMEPAGE_BIRTH_PREFILL_STORAGE_KEY,
} from "./homepage-birth-prefill";
import {
  BirthWizardContextRail,
  BirthWizardHeader,
  BirthWizardProgress,
} from "./birth-wizard-chrome";
import { BirthWizardSubjectStep } from "./birth-wizard-subject-step";
import { BirthWizardBirthStep } from "./birth-wizard-birth-step";
import { BirthWizardReviewStep } from "./birth-wizard-review-step";
import {
  canAdvanceStep1,
  canAdvanceStep2,
  canSubmitWizard,
  formatDateSummary,
  formatReviewTimeSummary,
  splitIsoDateToParts,
  validateWizardDate,
} from "./birth-wizard-state";

type BirthProfileFormProps = {
  locale: "en" | "vi";
  submitBirthProfile(input: {
    profile: unknown;
    explicitConsent: boolean;
  }): Promise<{
    ok: boolean;
    value?: {
      revisionId: string;
      ziweiEligibility: { eligible: boolean };
    };
  }>;
  calculateZiweiChart(revisionId: string): Promise<{
    ok: boolean;
    value?: { chartId: string };
    error?: { code: string };
  }>;
};

export function BirthProfileForm({
  locale,
  submitBirthProfile,
  calculateZiweiChart,
}: BirthProfileFormProps) {
  const t = useTranslations("profile" as never);
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [displayName, setDisplayName] = useState("");
  const [forWhom, setForWhom] = useState<"self" | "other">("self");
  const [consentOther, setConsentOther] = useState(false);
  const [gender, setGender] = useState<"male" | "female" | null>(null);
  const [day, setDay] = useState("");
  const [month, setMonth] = useState("");
  const [year, setYear] = useState("");
  const [timeState, setTimeState] = useState<BirthTimeState>({
    precision: "exact_minute",
    hour: "",
    minute: "",
  });
  const [place, setPlace] = useState("");
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [step1Attempted, setStep1Attempted] = useState(false);
  const [hasReusedCache, setHasReusedCache] = useState(false);

  useEffect(() => {
    let active = true;
    const cached = readBirthCache();
    if (cached) {
      queueMicrotask(() => {
        if (!active) return;
        const parts = splitIsoDateToParts(cached.date);
        setDay(parts.day);
        setMonth(parts.month);
        setYear(parts.year);
        if (cached.time.precision === "branch_only") {
          setTimeState({
            precision: "branch_only",
            branch: cached.time.branch,
          });
        } else if (cached.time.precision === "exact_minute") {
          setTimeState({
            precision: "exact_minute",
            hour: cached.time.hour,
            minute: cached.time.minute,
          });
        } else if (cached.time.precision === "unknown") {
          setTimeState({ precision: "unknown" });
        }
        if (cached.gender) {
          setGender(cached.gender);
        }
        if (cached.place) {
          setPlace(cached.place);
        }
        setHasReusedCache(true);
      });
    } else {
      const prefill = consumeHomepageBirthPrefill();
      if (prefill) {
        queueMicrotask(() => {
          if (!active) return;
          const parts = splitIsoDateToParts(prefill.date);
          setDay(parts.day);
          setMonth(parts.month);
          setYear(parts.year);
          if (prefill.time.precision === "branch_only") {
            setTimeState({
              precision: "branch_only",
              branch: prefill.time.branch,
            });
          } else if (prefill.time.precision === "unknown") {
            setTimeState({ precision: "unknown" });
          }
          setHasReusedCache(true);
        });
      }
    }
    return () => {
      active = false;
    };
  }, []);

  function handleDisplayNameChange(value: string) {
    setDisplayName(value.slice(0, 80));
  }

  function handleForWhomChange(value: "self" | "other") {
    setForWhom(value);
  }

  function handleConsentOtherChange(value: boolean) {
    setConsentOther(value);
  }

  function handleGenderChange(value: "male" | "female") {
    setGender(value);
    if (error === t("errors.gender")) {
      setError(null);
    }
  }

  function handleDayChange(value: string) {
    setDay(value.replace(/\D/g, "").slice(0, 2));
    if (error === t("heroForm.invalidDate")) {
      setError(null);
    }
  }

  function handleMonthChange(value: string) {
    setMonth(value.replace(/\D/g, "").slice(0, 2));
    if (error === t("heroForm.invalidDate")) {
      setError(null);
    }
  }

  function handleYearChange(value: string) {
    setYear(value.replace(/\D/g, "").slice(0, 4));
    if (error === t("heroForm.invalidDate")) {
      setError(null);
    }
  }

  function handleTimeStateChange(value: BirthTimeState) {
    setTimeState(value);
    if (error === t("errors.profile")) {
      setError(null);
    }
  }

  function handlePlaceChange(value: string) {
    setPlace(value.slice(0, 120));
  }

  function handleContinueStep1() {
    if (pending) return;
    const permitted = canAdvanceStep1({ forWhom, consentOther });
    if (!permitted) {
      setStep1Attempted(true);
    }
    if (gender === null) {
      setError(t("errors.gender"));
      return;
    }
    if (!permitted) {
      return;
    }
    setError(null);
    setStep(2);
  }

  function handleContinueStep2() {
    if (pending) return;
    const dateResult = validateWizardDate(day, month, year);
    if (!dateResult.valid) {
      setError(t("heroForm.invalidDate"));
      return;
    }
    if (!canAdvanceStep2({ dateValid: true, gender, timeState })) {
      setError(t("errors.profile"));
      return;
    }
    setError(null);
    setStep(3);
  }

  function handleContinue() {
    if (pending) return;
    if (step === 1) {
      handleContinueStep1();
    } else if (step === 2) {
      handleContinueStep2();
    }
  }

  function handleBack() {
    if (pending) return;
    if (step > 1) {
      setStep((prev) => (prev - 1) as 1 | 2);
      setError(null);
    }
  }

  function handleEditSubject() {
    if (pending) return;
    setStep(1);
    setError(null);
  }

  function handleEditBirth() {
    if (pending) return;
    setStep(2);
    setError(null);
  }

  function handleClearCache() {
    clearBirthCache();
    setDay("");
    setMonth("");
    setYear("");
    setTimeState({ precision: "exact_minute", hour: "", minute: "" });
    setPlace("");
    setGender(null);
    setHasReusedCache(false);
  }

  function handleExit() {
    if (pending) return;
    setStep(1);
    setDisplayName("");
    setForWhom("self");
    setConsentOther(false);
    setGender(null);
    setDay("");
    setMonth("");
    setYear("");
    setTimeState({ precision: "exact_minute", hour: "", minute: "" });
    setPlace("");
    setConsent(false);
    setError(null);
    setPending(false);
    setStep1Attempted(false);
    setHasReusedCache(false);

    clearBirthCache();

    const homeHref = locale === "en" ? "/en" : "/";
    router.push(homeHref);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) {
      return;
    }

    const dateResult = validateWizardDate(day, month, year);
    const action = resolveWizardSubmitAction({
      step,
      pending,
      consent,
      forWhom,
      consentOther,
      dateValid: dateResult.valid,
      gender,
      timeState,
    });

    if (action.kind === "ABORT_PENDING") {
      return;
    }
    if (action.kind === "ADVANCE_STEP_1") {
      handleContinueStep1();
      return;
    }
    if (action.kind === "ADVANCE_STEP_2") {
      handleContinueStep2();
      return;
    }
    if (action.kind === "ERROR_GENDER") {
      setError(t("errors.gender"));
      return;
    }
    if (action.kind === "ERROR_INVALID_DATE") {
      setError(t("heroForm.invalidDate"));
      return;
    }
    if (action.kind === "ERROR_CONSENT_OTHER") {
      setStep1Attempted(true);
      setError(t("subject.consentError"));
      return;
    }
    if (action.kind === "ERROR_PROFILE") {
      setError(t("errors.profile"));
      return;
    }
    if (!dateResult.valid) {
      setError(t("heroForm.invalidDate"));
      return;
    }
    if (gender === null) {
      setError(t("errors.gender"));
      return;
    }

    let navigating = false;
    try {
      setPending(true);
      setError(null);

      const profile = buildBirthProfile({
        date: dateResult.isoDate,
        time: timeState,
        placeLabel: place,
        gender,
        locale,
      });

      const saved = await submitBirthProfile({
        profile,
        explicitConsent: consent,
      });

      if (!saved.ok) {
        setError(t("errors.profile"));
        return;
      }

      if (forWhom === "self") {
        saveBirthCache({
          date: dateResult.isoDate,
          time: timeState,
          gender,
          place: place.trim() ? place.trim() : undefined,
        });
      }

      if (
        !saved.value?.ziweiEligibility.eligible ||
        !saved.value.revisionId
      ) {
        setError(t("errors.timeUnknown"));
        return;
      }

      const calculated = await calculateZiweiChart(saved.value.revisionId);

      if (!calculated.ok) {
        setError(
          calculated.error?.code === "ZIWEI_TIME_INELIGIBLE"
            ? t("errors.timeUnknown")
            : t("errors.calculation"),
        );
        return;
      }

      if (!calculated.value?.chartId) {
        setError(t("errors.calculation"));
        return;
      }

      navigating = true;
      const chartPath =
        locale === "en"
          ? `/en/la-so/${calculated.value.chartId}`
          : `/la-so/${calculated.value.chartId}`;
      router.push(chartPath);
    } catch {
      setError(t("errors.calculation"));
    } finally {
      if (!navigating) {
        setPending(false);
      }
    }
  }


  const dateResultForRender = validateWizardDate(day, month, year);
  const submitGuard = getWizardSubmitGuard({
    step,
    pending,
    consent,
    forWhom,
    consentOther,
    dateValid: dateResultForRender.valid,
    gender,
    timeState,
  });

  const stepTitles = [
    t("steps.subject"),
    t("steps.birth"),
    t("steps.review"),
  ] as const;
  const currentStepTitle = stepTitles[step - 1] ?? "";
  const mobileStepText = t("nav.stepFull", {
    current: step,
    title: currentStepTitle,
  });

  const railBody =
    step === 1
      ? t("rail.step1")
      : step === 2
        ? t("rail.step2")
        : t("rail.step3");

  return (
    <form className="birth-wizard" onSubmit={handleSubmit}>
      <BirthWizardHeader
        backLabel={t("nav.back")}
        exitDisabled={pending}
        exitLabel={t("nav.exit")}
        helpLabel={t("nav.help")}
        locale={locale}
        onBack={handleBack}
        onExit={handleExit}
        step={step}
        stepLabel={t("nav.step", { current: step })}
      />

      <BirthWizardProgress
        ariaLabel={t("steps.label")}
        labels={[t("steps.subject"), t("steps.birth"), t("steps.review")]}
        mobileText={mobileStepText}
        step={step}
      />

      <div className="wizard-main-shell">
        <div className="wizard-main-grid">
          <div className="wizard-form-column">
            {hasReusedCache && step < 3 ? (
              <div className="wizard-cache-notice">
                <span>{locale === "en" ? "Prefilled from saved birth details." : "Đang sử dụng thông tin sinh đã lưu."}</span>
                <button
                  className="wizard-cache-clear"
                  onClick={handleClearCache}
                  type="button"
                >
                  {locale === "en" ? "Clear saved data" : "Xóa dữ liệu đã lưu"}
                </button>
              </div>
            ) : null}
            {step === 1 ? (
              <BirthWizardSubjectStep
                consentOther={consentOther}
                displayName={displayName}
                femaleLabel={t("birth.female")}
                forWhom={forWhom}
                gender={gender}
                genderHelp={t("birth.genderHelp")}
                genderLabel={t("birth.gender")}
                maleLabel={t("birth.male")}
                nameLabel={t("subject.nameLabel")}
                nameOptional={t("subject.nameOptional")}
                namePlaceholder={t("subject.namePlaceholder")}
                onConsentOtherChange={handleConsentOtherChange}
                onDisplayNameChange={handleDisplayNameChange}
                onForWhomChange={handleForWhomChange}
                onGenderChange={handleGenderChange}
                otherConsentCopy={t("subject.otherConsent")}
                otherConsentError={t("subject.consentError")}
                otherConsentLabel={t("subject.consentCheck")}
                otherLabel={t("subject.other")}
                selfLabel={t("subject.self")}
                showConsentError={
                  step1Attempted && forWhom === "other" && !consentOther
                }
                subtitle={t("subject.stepSub")}
                targetLabel={t("subject.targetLabel")}
                title={t("subject.stepTitle")}
              />
            ) : null}

            {step === 2 ? (
              <BirthWizardBirthStep
                calendarLabel={t("birth.calendarType")}
                dateError={error === t("heroForm.invalidDate") ? error : null}
                dateLabel={t("birth.date")}
                day={day}
                dayLabel={t("birth.dayLabel")}
                locale={locale}
                lunarLabel={t("birth.lunar")}
                lunarNotice={t("birth.lunarNotice")}
                month={month}
                monthLabel={t("birth.monthLabel")}
                onDayChange={handleDayChange}
                onMonthChange={handleMonthChange}
                onPlaceChange={handlePlaceChange}
                onTimeStateChange={handleTimeStateChange}
                onYearChange={handleYearChange}
                place={place}
                placeLabel={t("birth.placeLabel")}
                placePlaceholder={t("birth.placePlaceholder")}
                solarLabel={t("birth.solar")}
                subtitle={t("birth.stepSub")}
                timeLabels={{
                  hour: t("birth.hour"),
                  minute: t("birth.minute"),
                  title: t("birth.time"),
                  unknown: t("birth.unknown"),
                  unknownHelp: t("birth.unknownHelp"),
                  exactMode: t("birth.exactMode"),
                  branchMode: t("birth.branchMode"),
                  branch: t("birth.branch"),
                  branchHelp: t("birth.branchHelp"),
                }}
                timeState={timeState}
                timezoneText={t("birth.timezone")}
                title={t("birth.stepTitle")}
                year={year}
                yearLabel={t("birth.yearLabel")}
              />
            ) : null}

            {step === 3 ? (
              <BirthWizardReviewStep
                birthSectionTitle={t("steps.birth")}
                disabled={pending}
                consent={consent}
                consentLabel={t("review.consent")}
                date={formatDateSummary(day, month, year)}
                dateLabel={t("review.solarDate")}
                disclosure={t("review.disclosure")}
                displayName={
                  displayName.trim() ? displayName.trim() : t("review.noName")
                }
                displayNameLabel={t("review.displayName")}
                duplicateNotice={t("review.duplicateNotice")}
                editLabel={t("review.edit")}
                forWhom={
                  forWhom === "other"
                    ? t("review.otherPermitted")
                    : t("review.self")
                }
                forWhomLabel={t("review.forWhom")}
                gender={
                  gender === "male"
                    ? t("birth.male")
                    : gender === "female"
                      ? t("birth.female")
                      : "—"
                }
                genderLabel={t("birth.gender")}
                guestNotice={t("review.guestNotice")}
                onConsentChange={setConsent}
                onEditBirth={handleEditBirth}
                onEditSubject={handleEditSubject}
                pending={pending}
                place={place.trim() ? place.trim() : undefined}
                placeLabel={place.trim() ? t("review.birthPlace") : undefined}
                subjectSectionTitle={t("steps.subject")}
                subtitle={t("review.stepSub")}
                time={formatReviewTimeSummary(timeState, locale)}
                timeLabel={t("review.birthTime")}
                timezone="Asia/Ho_Chi_Minh"
                timezoneLabel={t("review.timezone")}
                title={t("review.stepTitle")}
              />
            ) : null}

            {error && !(step === 2 && error === t("heroForm.invalidDate")) ? (
              <p className="form-error" role="alert">
                {error}
              </p>
            ) : null}

            <div className="wizard-actions">
              {step > 1 ? (
                <button
                  className="button button-secondary wizard-action-back"
                  disabled={pending}
                  onClick={handleBack}
                  type="button"
                >
                  {t("back")}
                </button>
              ) : (
                <span />
              )}
              {step < 3 ? (
                <button
                  className="button wizard-action-continue"
                  onClick={handleContinue}
                  type="button"
                >
                  {t("continue")}
                </button>
              ) : (
                <button
                  className="button wizard-action-submit"
                  disabled={submitGuard.buttonDisabled}
                  type="submit"
                >
                  {pending ? t("submitting") : t("submit")}
                </button>
              )}
            </div>
          </div>

          <BirthWizardContextRail
            body={railBody}
            caption={t("rail.caption")}
            eyebrow={t("rail.eyebrow")}
            step={step}
          />
        </div>
      </div>
    </form>
  );
}
