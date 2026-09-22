"use client";

import { BirthDetailsFields } from "./birth-details-fields";
import type { BirthTimeState } from "./birth-profile-input";

export type BirthWizardBirthStepProps = {
  locale: "en" | "vi";
  title: string;
  subtitle: string;
  calendarLabel: string;
  solarLabel: string;
  lunarLabel: string;
  lunarNotice: string;
  calendarType?: "solar" | "lunar";
  isLeapMonth?: boolean;
  leapMonthLabel?: string;
  leapMonthHelp?: string;
  dateLabel: string;
  dayLabel: string;
  monthLabel: string;
  yearLabel: string;
  placeLabel: string;
  placePlaceholder: string;
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

  onCalendarTypeChange?(value: "solar" | "lunar"): void;
  onIsLeapMonthChange?(value: boolean): void;
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
  calendarType = "solar",
  isLeapMonth = false,
  leapMonthLabel,
  leapMonthHelp,
  dateLabel,
  dayLabel,
  monthLabel,
  yearLabel,
  placeLabel,
  placePlaceholder,
  timezoneText,
  timeLabels,
  day,
  month,
  year,
  dateError,
  timeState,
  place,
  onCalendarTypeChange,
  onIsLeapMonthChange,
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

      <BirthDetailsFields
        calendarLabel={calendarLabel}
        calendarType={calendarType}
        dateError={dateError}
        dateLabel={dateLabel}
        day={day}
        dayLabel={dayLabel}
        isLeapMonth={isLeapMonth}
        leapMonthHelp={leapMonthHelp}
        leapMonthLabel={leapMonthLabel}
        locale={locale}
        lunarLabel={lunarLabel}
        lunarNotice={lunarNotice}
        month={month}
        monthLabel={monthLabel}
        onCalendarTypeChange={onCalendarTypeChange}
        onDayChange={onDayChange}
        onIsLeapMonthChange={onIsLeapMonthChange}
        onMonthChange={onMonthChange}
        onPlaceChange={onPlaceChange}
        onTimeStateChange={onTimeStateChange}
        onYearChange={onYearChange}
        place={place}
        placeLabel={placeLabel}
        placePlaceholder={placePlaceholder}
        solarLabel={solarLabel}
        timeLabels={timeLabels}
        timeState={timeState}
        timezoneText={timezoneText}
        variant="wizard"
        year={year}
        yearLabel={yearLabel}
      />
    </section>
  );
}
