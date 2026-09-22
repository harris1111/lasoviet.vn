"use client";

import { Icon } from "../../components/icon";
import { BirthDateFields } from "./birth-date-fields";
import type { BirthTimeState } from "./birth-profile-input";
import { TimePrecisionFields } from "./time-precision-fields";

export type BirthDetailsFieldsProps = {
  locale?: "en" | "vi";

  // Name (optional)
  displayName?: string;
  nameLabel?: string;
  nameOptional?: string;
  namePlaceholder?: string;
  onDisplayNameChange?(value: string): void;

  // Gender (optional)
  gender?: "male" | "female" | null;
  genderLabel?: string;
  genderHelp?: string;
  maleLabel?: string;
  femaleLabel?: string;
  onGenderChange?(value: "male" | "female"): void;

  // Date
  day: string;
  month: string;
  year: string;
  calendarType?: "solar" | "lunar";
  isLeapMonth?: boolean;
  dateError?: string | null;
  dateLabel?: string;
  dayLabel?: string;
  monthLabel?: string;
  yearLabel?: string;
  calendarLabel?: string;
  solarLabel?: string;
  lunarLabel?: string;
  leapMonthLabel?: string;
  leapMonthHelp?: string;
  lunarNotice?: string;
  onDayChange(value: string): void;
  onMonthChange(value: string): void;
  onYearChange(value: string): void;
  onCalendarTypeChange?(value: "solar" | "lunar"): void;
  onIsLeapMonthChange?(value: boolean): void;

  // Time
  timeState: BirthTimeState;
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
  onTimeStateChange(value: BirthTimeState): void;

  // Place (optional)
  place?: string;
  placeLabel?: string;
  placePlaceholder?: string;
  timezoneText?: string;
  onPlaceChange?(value: string): void;
};

export function BirthDetailsFields({
  locale = "vi",
  displayName,
  nameLabel,
  nameOptional,
  namePlaceholder,
  onDisplayNameChange,
  gender,
  genderLabel,
  genderHelp,
  maleLabel = locale === "en" ? "Male" : "Nam",
  femaleLabel = locale === "en" ? "Female" : "Nữ",
  onGenderChange,
  day,
  month,
  year,
  calendarType = "solar",
  isLeapMonth = false,
  dateError,
  dateLabel,
  dayLabel,
  monthLabel,
  yearLabel,
  calendarLabel,
  solarLabel,
  lunarLabel,
  leapMonthLabel,
  leapMonthHelp,
  lunarNotice,
  onDayChange,
  onMonthChange,
  onYearChange,
  onCalendarTypeChange,
  onIsLeapMonthChange,
  timeState,
  timeLabels,
  onTimeStateChange,
  place,
  placeLabel,
  placePlaceholder,
  timezoneText,
  onPlaceChange,
}: BirthDetailsFieldsProps) {
  return (
    <div className="birth-details-fields">
      {onDisplayNameChange && nameLabel ? (
        <div className="wizard-field-group">
          <label className="wizard-field-label" htmlFor="birthDetailsDisplayName">
            {nameLabel} {nameOptional ? <span>{nameOptional}</span> : null}
          </label>
          <div className="ui-field-shell__control">
            <span aria-hidden="true" className="ui-field-shell__icon">
              <Icon name="user" />
            </span>
            <input
              className="ui-field-shell__input"
              id="birthDetailsDisplayName"
              maxLength={80}
              name="displayName"
              onChange={(e) => onDisplayNameChange(e.target.value)}
              placeholder={namePlaceholder}
              type="text"
              value={displayName ?? ""}
            />
          </div>
        </div>
      ) : null}

      {onGenderChange && genderLabel ? (
        <fieldset
          aria-describedby={genderHelp ? "birthDetailsGenderHelp" : undefined}
          className="wizard-fieldset wizard-gender-fieldset"
        >
          <legend className="wizard-field-label">{genderLabel}</legend>
          {genderHelp ? (
            <p className="wizard-help" id="birthDetailsGenderHelp">
              {genderHelp}
            </p>
          ) : null}
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
      ) : null}

      <div className="wizard-field-group">
        {dateLabel ? <span className="wizard-field-label">{dateLabel}</span> : null}
        <BirthDateFields
          calendarButtonLabel={locale === "en" ? "Select date from calendar" : "Chọn ngày từ lịch"}
          calendarLabel={calendarLabel}
          calendarType={calendarType}
          day={day}
          dayLabel={dayLabel}
          dayPlaceholder={dayLabel}
          error={dateError}
          locale={locale}
          lunarLabel={lunarLabel}
          month={month}
          monthLabel={monthLabel}
          monthPlaceholder={monthLabel}
          onCalendarTypeChange={onCalendarTypeChange}
          onDayChange={onDayChange}
          onMonthChange={onMonthChange}
          onYearChange={onYearChange}
          solarLabel={solarLabel}
          year={year}
          yearLabel={yearLabel}
          yearPlaceholder={yearLabel}
        />
        {calendarType === "lunar" ? (
          <div className="wizard-lunar-options">
            <label className="wizard-check">
              <input
                checked={isLeapMonth}
                name="isLeapMonth"
                onChange={(event) => onIsLeapMonthChange?.(event.target.checked)}
                type="checkbox"
              />
              <span>{leapMonthLabel ?? (locale === "en" ? "Leap month" : "Tháng nhuận")}</span>
            </label>
            {leapMonthHelp ? (
              <p className="wizard-help">{leapMonthHelp}</p>
            ) : null}
            {lunarNotice ? (
              <p className="wizard-help">{lunarNotice}</p>
            ) : null}
          </div>
        ) : null}
      </div>

      <TimePrecisionFields
        labels={timeLabels}
        locale={locale}
        onTimeStateChange={onTimeStateChange}
        timeState={timeState}
      />

      {onPlaceChange && placeLabel ? (
        <div className="wizard-field-group">
          <label className="wizard-field-label" htmlFor="birthDetailsPlace">
            {placeLabel}
          </label>
          <div className="ui-field-shell__control">
            <span aria-hidden="true" className="ui-field-shell__icon">
              <Icon name="map-pin" />
            </span>
            <input
              className="ui-field-shell__input"
              id="birthDetailsPlace"
              maxLength={120}
              name="place"
              onChange={(event) => onPlaceChange(event.target.value)}
              placeholder={placePlaceholder}
              type="text"
              value={place ?? ""}
            />
          </div>
          {timezoneText ? <p className="wizard-help">{timezoneText}</p> : null}
        </div>
      ) : null}
    </div>
  );
}
