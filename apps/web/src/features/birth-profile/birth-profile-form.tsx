"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

import { buildBirthProfile } from "./birth-profile-input";
import { TimePrecisionFields } from "./time-precision-fields";

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
  const t = useTranslations("profile");
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [date, setDate] = useState("");
  const [hour, setHour] = useState("");
  const [minute, setMinute] = useState("");
  const [timeUnknown, setTimeUnknown] = useState(false);
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  function canContinue() {
    return step === 1 || (date !== "" && (timeUnknown || (hour !== "" && minute !== "")));
  }

  async function submit() {
    setPending(true);
    setError(null);
    const profile = buildBirthProfile({ date, hour, minute, timeUnknown, locale });
    const saved = await submitBirthProfile({ profile, explicitConsent: consent });
    if (!saved.ok) {
      setPending(false);
      setError(t("errors.profile"));
      return;
    }
    if (!saved.value?.ziweiEligibility.eligible || saved.value.revisionId === undefined) {
      setPending(false);
      setError(t("errors.timeUnknown"));
      return;
    }
    const calculated = await calculateZiweiChart(saved.value.revisionId);
    setPending(false);
    if (!calculated.ok) {
      setError(
        calculated.error?.code === "ZIWEI_TIME_INELIGIBLE"
          ? t("errors.timeUnknown")
          : t("errors.calculation"),
      );
      return;
    }
    if (calculated.value?.chartId === undefined) {
      setError(t("errors.calculation"));
      return;
    }
    router.push(locale === "en" ? `/en/la-so/${calculated.value.chartId}` : `/la-so/${calculated.value.chartId}`);
  }

  return (
    <form action={submit} className="birth-wizard">
      <ol aria-label={t("steps.label")} className="wizard-steps">
        {[t("steps.subject"), t("steps.birth"), t("steps.review")].map((label, index) => (
          <li className={index + 1 === step ? "current" : index + 1 < step ? "complete" : ""} key={label}>
            <span>{`0${index + 1}`}</span>{label}
          </li>
        ))}
      </ol>
      {step === 1 ? (
        <section className="wizard-section">
          <p className="eyebrow">{t("eyebrow")}</p>
          <h1>{t("subject.title")}</h1>
          <p>{t("subject.copy")}</p>
          <label className="wizard-check"><input defaultChecked type="radio" />{t("subject.self")}</label>
        </section>
      ) : null}
      {step === 2 ? (
        <section className="wizard-section">
          <p className="eyebrow">{t("eyebrow")}</p>
          <h1>{t("birth.title")}</h1>
          <p>{t("birth.copy")}</p>
          <label>{t("birth.date")}<input onChange={(event) => setDate(event.target.value)} required type="date" value={date} /></label>
          <TimePrecisionFields
            hour={hour}
            labels={{
              title: t("birth.time"),
              unknown: t("birth.unknown"),
              unknownHelp: t("birth.unknownHelp"),
              hour: t("birth.hour"),
              minute: t("birth.minute"),
            }}
            minute={minute}
            onHourChange={setHour}
            onMinuteChange={setMinute}
            onTimeUnknownChange={setTimeUnknown}
            timeUnknown={timeUnknown}
          />
          <p className="wizard-help">{t("birth.timezone")}</p>
        </section>
      ) : null}
      {step === 3 ? (
        <section className="wizard-section">
          <p className="eyebrow">{t("eyebrow")}</p>
          <h1>{t("review.title")}</h1>
          <dl className="wizard-summary">
            <dt>{t("birth.date")}</dt><dd>{date || "-"}</dd>
            <dt>{t("birth.time")}</dt><dd>{timeUnknown ? t("review.unknown") : `${hour}:${minute}`}</dd>
            <dt>{t("birth.timezone")}</dt><dd>UTC+7</dd>
          </dl>
          <label className="wizard-check">
            <input checked={consent} onChange={(event) => setConsent(event.target.checked)} required type="checkbox" />
            {t("review.consent")}
          </label>
          <p className="wizard-help">{t("review.privacy")}</p>
        </section>
      ) : null}
      {error ? <p className="form-error" role="alert">{error}</p> : null}
      <div className="wizard-actions">
        {step > 1 ? <button className="button button-secondary" onClick={() => setStep(step - 1)} type="button">{t("back")}</button> : <span />}
        {step < 3 ? <button className="button" disabled={!canContinue()} onClick={() => setStep(step + 1)} type="button">{t("continue")}</button> : <button className="button" disabled={!consent || pending} type="submit">{pending ? t("submitting") : t("submit")}</button>}
      </div>
    </form>
  );
}
