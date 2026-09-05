"use client";

import { Icon } from "../../components/icon";
import type { BirthTimeState } from "./birth-profile-input";
import { TimePrecisionFields } from "./time-precision-fields";

export type BirthWizardBirthStepProps = {
  locale: 'en' | 'vi';
  title: string;
  subtitle: string;
  calendarLabel: string;
  solarLabel: string;
  lunarLabel: string;
  lunarNotice: string;
  dateLabel: string;
  formatHint: string;
  dayLabel: string;
  monthLabel: string;
  yearLabel: string;
  placeLabel: string;
  placePlaceholder: string;
  placeNote: string;
  timezoneText: string;
  timeLabels: {
    hour: string;
    minute: string;
    title: string;
    unknown: string;
    unknownHelp: string;
    exactMode?: string;
    branchMode?: string;
    branch?: string;
    branchHelp?: string;
  };

  day: string;
  month: string;
  year: string;
  dateError: string | null;
  timeState: BirthTimeState;
  place: string;

  onDayChange(value: string): void;
  onMonthChange(value: string): void;
  onYearChange(value: string): void;
  onTimeStateChange(value: BirthTimeState): void;
  onPlaceChange(value: string): void;
};

export function BirthWizardBirthStep({
  locale,
  title,
  subtitle,
  calendarLabel,
  solarLabel,
  lunarLabel,
  lunarNotice,
  dateLabel,
  formatHint,
  dayLabel,
  monthLabel,
  yearLabel,
  placeLabel,
  placePlaceholder,
  placeNote,
  timezoneText,
  timeLabels,
  day,
  month,
  year,
  dateError,
  timeState,
  place,
  onDayChange,
  onMonthChange,
  onYearChange,
  onTimeStateChange,
  onPlaceChange,
}: BirthWizardBirthStepProps) {
  return (
    <section
      aria-labelledby="wizard-step-title"
      className="wizard-section wizard-birth-step"
    >
      <h1 className="wizard-step-title" id="wizard-step-title">
        {title}
      </h1>
      <p className="wizard-step-subtitle">{subtitle}</p>

      <div className="wizard-field-group">
        <span className="wizard-field-label">{calendarLabel}</span>
        <div className="wizard-choice-row">
          <button
            aria-pressed={true}
            className="wizard-choice-button is-active"
            type="button"
          >
            <span>{solarLabel}</span>
          </button>
          <button
            aria-pressed={false}
            className="wizard-choice-button is-disabled"
            disabled
            title={lunarNotice}
            type="button"
          >
            <span>{lunarLabel}</span>
          </button>
        </div>
      </div>

      <div className="wizard-field-group">
        <span className="wizard-field-label">
          {dateLabel} <span>{formatHint}</span>
        </span>
        <div className="wizard-date-row">
          <input
            aria-label={dayLabel}
            inputMode="numeric"
            maxLength={2}
            onChange={(event) => onDayChange(event.target.value)}
            pattern="[0-9]*"
            placeholder={dayLabel}
            type="text"
            value={day}
          />
          <span aria-hidden="true" className="wizard-date-separator">
            /
          </span>
          <input
            aria-label={monthLabel}
            inputMode="numeric"
            maxLength={2}
            onChange={(event) => onMonthChange(event.target.value)}
            pattern="[0-9]*"
            placeholder={monthLabel}
            type="text"
            value={month}
          />
          <span aria-hidden="true" className="wizard-date-separator">
            /
          </span>
          <input
            aria-label={yearLabel}
            inputMode="numeric"
            maxLength={4}
            onChange={(event) => onYearChange(event.target.value)}
            pattern="[0-9]*"
            placeholder={yearLabel}
            type="text"
            value={year}
          />
        </div>
        {dateError ? (
          <p className="form-error" role="alert">
            {dateError}
          </p>
        ) : null}
      </div>

      <TimePrecisionFields
        labels={timeLabels}
        locale={locale}
        onTimeStateChange={onTimeStateChange}
        timeState={timeState}
      />

      <div className="wizard-field-group">
        <label className="wizard-field-label" htmlFor="birthPlace">
          {placeLabel}
        </label>
        <div className="wizard-place-input-wrap">
          <Icon name="map-pin" />
          <input
            id="birthPlace"
            maxLength={120}
            name="birthPlace"
            onChange={(event) => onPlaceChange(event.target.value)}
            placeholder={placePlaceholder}
            type="text"
            value={place}
          />
        </div>
        <p className="wizard-help">{placeNote}</p>
        <p className="wizard-help">{timezoneText}</p>
      </div>
    </section>
  );
}