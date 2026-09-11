"use client";

import { Icon } from "../../components/icon";

export type BirthWizardReviewStepProps = {
  disabled?: boolean;
  title: string;
  subtitle: string;
  subjectSectionTitle: string;
  birthSectionTitle: string;
  editLabel: string;
  displayNameLabel: string;
  forWhomLabel: string;
  dateLabel: string;
  timeLabel: string;
  genderLabel: string;
  placeLabel?: string;
  timezoneLabel: string;
  disclosure: string;
  guestNotice: string;
  consentLabel: string;
  duplicateNotice: string;

  displayName: string;
  forWhom: string;
  date: string;
  calendarType?: "solar" | "lunar";
  isLeapMonth?: boolean;
  time: string;
  gender: string;
  place?: string;
  timezone: string;

  consent: boolean;
  pending: boolean;

  onEditSubject(): void;
  onEditBirth(): void;
  onConsentChange(value: boolean): void;
};

export function BirthWizardReviewStep({
  title,
  subtitle,
  subjectSectionTitle,
  birthSectionTitle,
  editLabel,
  displayNameLabel,
  forWhomLabel,
  dateLabel,
  timeLabel,
  genderLabel,
  placeLabel,
  timezoneLabel,
  disclosure,
  guestNotice,
  consentLabel,
  duplicateNotice,
  displayName,
  forWhom,
  date,
  time,
  gender,
  place,
  timezone,
  consent,
  pending,
  disabled = false,
  onEditSubject,
  onEditBirth,
  onConsentChange,
}: BirthWizardReviewStepProps) {
  return (
    <section
      aria-labelledby="wizard-step-title"
      className="wizard-section wizard-review-step"
    >
      <h1 className="wizard-step-title" id="wizard-step-title">
        {title}
      </h1>
      <p className="wizard-step-subtitle">{subtitle}</p>

      <div className="wizard-review-panel">
        <div className="wizard-review-panel-header">
          <span>{subjectSectionTitle}</span>
          <button
            className="wizard-edit-button"
            disabled={disabled || pending}
            onClick={onEditSubject}
            type="button"
          >
            <Icon name="pencil" />
            <span>{editLabel}</span>
          </button>
        </div>
        <dl className="wizard-review-list">
          <dt>{displayNameLabel}</dt>
          <dd>{displayName}</dd>
          <dt>{forWhomLabel}</dt>
          <dd>{forWhom}</dd>
        </dl>
      </div>

      <div className="wizard-review-panel">
        <div className="wizard-review-panel-header">
          <span>{birthSectionTitle}</span>
          <button
            className="wizard-edit-button"
            disabled={disabled || pending}
            onClick={onEditBirth}
            type="button"
          >
            <Icon name="pencil" />
            <span>{editLabel}</span>
          </button>
        </div>
        <dl className="wizard-review-list">
          <dt>{dateLabel}</dt>
          <dd>{date}</dd>
          <dt>{timeLabel}</dt>
          <dd>{time}</dd>
          <dt>{genderLabel}</dt>
          <dd>{gender}</dd>
          {place && place.trim() ? (
            <>
              <dt>{placeLabel}</dt>
              <dd>{place.trim()}</dd>
            </>
          ) : null}
          <dt>{timezoneLabel}</dt>
          <dd>{timezone}</dd>
        </dl>
      </div>

      <div className="wizard-disclosure">
        <Icon name="shield-lock" />
        <p>{disclosure}</p>
      </div>

      <label className="wizard-check wizard-processing-consent">
        <input
          checked={consent}
          onChange={(event) => onConsentChange(event.target.checked)}
          type="checkbox"
        />
        <span>{consentLabel}</span>
      </label>

      <p className="wizard-help">{guestNotice}</p>

      {pending ? (
        <p className="wizard-duplicate-notice" role="status">
          {duplicateNotice}
        </p>
      ) : null}
    </section>
  );
}