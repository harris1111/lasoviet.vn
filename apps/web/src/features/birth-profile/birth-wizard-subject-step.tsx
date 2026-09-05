"use client";

import { Icon } from "../../components/icon";

export type BirthWizardSubjectStepProps = {
  title: string;
  subtitle: string;
  nameLabel: string;
  nameOptional: string;
  namePlaceholder: string;
  targetLabel: string;
  selfLabel: string;
  otherLabel: string;
  otherConsentCopy: string;
  otherConsentLabel: string;
  otherConsentError: string;
  genderLabel: string;
  genderHelp: string;
  maleLabel: string;
  femaleLabel: string;

  displayName: string;
  forWhom: "self" | "other";
  consentOther: boolean;
  gender: "male" | "female" | null;
  showConsentError: boolean;

  onDisplayNameChange(value: string): void;
  onForWhomChange(value: "self" | "other"): void;
  onConsentOtherChange(value: boolean): void;
  onGenderChange(value: "male" | "female"): void;
};

export function BirthWizardSubjectStep({
  title,
  subtitle,
  nameLabel,
  nameOptional,
  namePlaceholder,
  targetLabel,
  selfLabel,
  otherLabel,
  otherConsentCopy,
  otherConsentLabel,
  otherConsentError,
  genderLabel,
  genderHelp,
  maleLabel,
  femaleLabel,
  displayName,
  forWhom,
  consentOther,
  gender,
  showConsentError,
  onDisplayNameChange,
  onForWhomChange,
  onConsentOtherChange,
  onGenderChange,
}: BirthWizardSubjectStepProps) {
  const isSelf = forWhom === "self";
  const isOther = forWhom === "other";

  return (
    <section
      aria-labelledby="wizard-step-title"
      className="wizard-section wizard-subject-step"
    >
      <h1 className="wizard-step-title" id="wizard-step-title">
        {title}
      </h1>
      <p className="wizard-step-subtitle">{subtitle}</p>

      <div className="wizard-field-group">
        <label className="wizard-field-label" htmlFor="displayName">
          {nameLabel} <span>{nameOptional}</span>
        </label>
        <input
          id="displayName"
          maxLength={80}
          name="displayName"
          onChange={(event) => onDisplayNameChange(event.target.value)}
          placeholder={namePlaceholder}
          type="text"
          value={displayName}
        />
      </div>

      <div className="wizard-field-group">
        <span className="wizard-field-label">{targetLabel}</span>
        <div className="wizard-choice-row">
          <button
            aria-pressed={isSelf}
            className={`wizard-choice-button${isSelf ? " is-active" : ""}`}
            onClick={() => onForWhomChange("self")}
            type="button"
          >
            <Icon name="user-circle" />
            <span>{selfLabel}</span>
          </button>
          <button
            aria-pressed={isOther}
            className={`wizard-choice-button${isOther ? " is-active" : ""}`}
            onClick={() => onForWhomChange("other")}
            type="button"
          >
            <Icon name="user" />
            <span>{otherLabel}</span>
          </button>
        </div>

        {isOther ? (
          <div className="wizard-consent-panel">
            <p>{otherConsentCopy}</p>
            <label className="wizard-check">
              <input
                checked={consentOther}
                onChange={(event) => onConsentOtherChange(event.target.checked)}
                type="checkbox"
              />
              <span>{otherConsentLabel}</span>
            </label>
            {showConsentError ? (
              <p role="alert">{otherConsentError}</p>
            ) : null}
          </div>
        ) : null}
      </div>

      <fieldset
        aria-describedby="wizard-gender-help"
        className="wizard-fieldset wizard-gender-fieldset"
      >
        <legend className="wizard-field-label">{genderLabel}</legend>
        <p className="wizard-help" id="wizard-gender-help">
          {genderHelp}
        </p>
        <div className="wizard-segmented-control">
          <label className="wizard-segment">
            <input
              checked={gender === "male"}
              name="gender"
              onChange={() => onGenderChange("male")}
              type="radio"
              value="male"
            />
            <span>{maleLabel}</span>
          </label>
          <label className="wizard-segment">
            <input
              checked={gender === "female"}
              name="gender"
              onChange={() => onGenderChange("female")}
              type="radio"
              value="female"
            />
            <span>{femaleLabel}</span>
          </label>
        </div>
      </fieldset>
    </section>
  );
}
