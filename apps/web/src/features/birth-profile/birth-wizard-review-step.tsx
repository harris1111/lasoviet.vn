"use client";

import type { LifeStageV1, TopConcernV1 } from "@lasoviet/contracts";
import { Icon } from "../../components/icon";
import type { WizardReadingContextDraft } from "./birth-wizard-state";

export const LIFE_STAGE_OPTIONS: readonly LifeStageV1[] = [
  "studying",
  "early_career",
  "established_career",
  "business_owner",
  "between_paths",
  "retired",
];

export const TOP_CONCERN_OPTIONS: readonly TopConcernV1[] = [
  "career",
  "money",
  "love",
  "family",
  "wellbeing",
  "self_understanding",
];

export type ReadingContextLabels = {
  title: string;
  subtitle: string;
  skip: string;
  lifeStageTitle: string;
  topConcernTitle: string;
  lifeStage: Record<LifeStageV1, string>;
  topConcern: Record<TopConcernV1, string>;
};

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
  consentLabel: React.ReactNode;
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

  // Reading context (FD-078)
  readingContext?: WizardReadingContextDraft;
  readingContextLabels?: ReadingContextLabels;
  onReadingContextChange?(value: WizardReadingContextDraft): void;
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
  readingContext,
  readingContextLabels,
  onReadingContextChange,
}: BirthWizardReviewStepProps) {
  function handleSelectLifeStage(stage: LifeStageV1) {
    if (!onReadingContextChange) return;
    const current = readingContext ?? {
      skippedQuestions: { lifeStage: false, topConcern: false },
    };
    if (current.lifeStage === stage) {
      onReadingContextChange({
        ...current,
        lifeStage: undefined,
        skippedQuestions: { ...current.skippedQuestions, lifeStage: false },
      });
    } else {
      onReadingContextChange({
        ...current,
        lifeStage: stage,
        skippedQuestions: { ...current.skippedQuestions, lifeStage: false },
      });
    }
  }

  function handleSkipLifeStage() {
    if (!onReadingContextChange) return;
    const current = readingContext ?? {
      skippedQuestions: { lifeStage: false, topConcern: false },
    };
    onReadingContextChange({
      ...current,
      lifeStage: undefined,
      skippedQuestions: { ...current.skippedQuestions, lifeStage: true },
    });
  }

  function handleSelectTopConcern(concern: TopConcernV1) {
    if (!onReadingContextChange) return;
    const current = readingContext ?? {
      skippedQuestions: { lifeStage: false, topConcern: false },
    };
    if (current.topConcern === concern) {
      onReadingContextChange({
        ...current,
        topConcern: undefined,
        skippedQuestions: { ...current.skippedQuestions, topConcern: false },
      });
    } else {
      onReadingContextChange({
        ...current,
        topConcern: concern,
        skippedQuestions: { ...current.skippedQuestions, topConcern: false },
      });
    }
  }

  function handleSkipTopConcern() {
    if (!onReadingContextChange) return;
    const current = readingContext ?? {
      skippedQuestions: { lifeStage: false, topConcern: false },
    };
    onReadingContextChange({
      ...current,
      topConcern: undefined,
      skippedQuestions: { ...current.skippedQuestions, topConcern: true },
    });
  }

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

      {readingContextLabels && onReadingContextChange ? (
        <div className="wizard-context-section" data-testid="reading-context-section">
          <h2 className="wizard-context-heading">{readingContextLabels.title}</h2>
          <p className="wizard-context-sub">{readingContextLabels.subtitle}</p>

          <div className="wizard-context-group">
            <div className="wizard-context-group-header">
              <span className="wizard-context-question-title">
                {readingContextLabels.lifeStageTitle}
              </span>
              <button
                aria-pressed={Boolean(readingContext?.skippedQuestions.lifeStage)}
                className={`wizard-context-skip-btn${
                  readingContext?.skippedQuestions.lifeStage ? " is-active" : ""
                }`}
                disabled={disabled || pending}
                onClick={handleSkipLifeStage}
                type="button"
              >
                {readingContextLabels.skip}
              </button>
            </div>
            <div className="wizard-context-choices">
              {LIFE_STAGE_OPTIONS.map((stage) => {
                const isSelected = readingContext?.lifeStage === stage;
                return (
                  <button
                    aria-pressed={isSelected}
                    className={`wizard-context-choice-btn${
                      isSelected ? " is-active" : ""
                    }`}
                    disabled={disabled || pending}
                    key={stage}
                    onClick={() => handleSelectLifeStage(stage)}
                    type="button"
                  >
                    {readingContextLabels.lifeStage[stage]}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="wizard-context-group">
            <div className="wizard-context-group-header">
              <span className="wizard-context-question-title">
                {readingContextLabels.topConcernTitle}
              </span>
              <button
                aria-pressed={Boolean(readingContext?.skippedQuestions.topConcern)}
                className={`wizard-context-skip-btn${
                  readingContext?.skippedQuestions.topConcern ? " is-active" : ""
                }`}
                disabled={disabled || pending}
                onClick={handleSkipTopConcern}
                type="button"
              >
                {readingContextLabels.skip}
              </button>
            </div>
            <div className="wizard-context-choices">
              {TOP_CONCERN_OPTIONS.map((concern) => {
                const isSelected = readingContext?.topConcern === concern;
                return (
                  <button
                    aria-pressed={isSelected}
                    className={`wizard-context-choice-btn${
                      isSelected ? " is-active" : ""
                    }`}
                    disabled={disabled || pending}
                    key={concern}
                    onClick={() => handleSelectTopConcern(concern)}
                    type="button"
                  >
                    {readingContextLabels.topConcern[concern]}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}

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
