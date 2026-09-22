"use client";

import { useRef, useState, useEffect, type ChangeEvent } from "react";
import { Icon } from "../../components/icon";
import { isFutureSolarDate, isValidSolarDate } from "./homepage-birth-prefill";

export const BIRTH_DAYS = Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, "0"));
export const BIRTH_MONTHS = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, "0"));
export const DEFAULT_REFERENCE_YEAR = 2026;

export function generateBirthYears(referenceYear: number = DEFAULT_REFERENCE_YEAR): string[] {
  const minYear = 1000;
  const count = Math.max(0, referenceYear - minYear + 1);
  return Array.from({ length: count }, (_, i) => String(referenceYear - i));
}

export const BIRTH_YEARS = generateBirthYears(DEFAULT_REFERENCE_YEAR);

export type BirthDateFieldsProps = {
  day: string;
  month: string;
  year: string;
  onDayChange(value: string): void;
  onMonthChange(value: string): void;
  onYearChange(value: string): void;
  calendarType?: "solar" | "lunar";
  onCalendarTypeChange?(value: "solar" | "lunar"): void;
  locale?: "en" | "vi";
  dayLabel?: string;
  monthLabel?: string;
  yearLabel?: string;
  calendarLabel?: string;
  solarLabel?: string;
  lunarLabel?: string;
  calendarButtonLabel?: string;
  dayPlaceholder?: string;
  monthPlaceholder?: string;
  yearPlaceholder?: string;
  error?: string | null;
  className?: string;
  disabled?: boolean;
  referenceYear?: number;
};

export function BirthDateFields({
  day,
  month,
  year,
  onDayChange,
  onMonthChange,
  onYearChange,
  calendarType = "solar",
  onCalendarTypeChange,
  locale = "vi",
  dayLabel = locale === "en" ? "Day" : "Ngày",
  monthLabel = locale === "en" ? "Month" : "Tháng",
  yearLabel = locale === "en" ? "Year" : "Năm",
  calendarLabel = locale === "en" ? "Calendar" : "Hệ lịch",
  solarLabel = locale === "en" ? "Solar" : "Dương lịch",
  lunarLabel = locale === "en" ? "Lunar" : "Âm lịch",
  calendarButtonLabel = locale === "en" ? "Select date from calendar" : "Chọn ngày từ lịch",
  dayPlaceholder = dayLabel,
  monthPlaceholder = monthLabel,
  yearPlaceholder = yearLabel,
  error,
  className = "",
  disabled = false,
  referenceYear = DEFAULT_REFERENCE_YEAR,
}: BirthDateFieldsProps) {
  const [effectiveYear, setEffectiveYear] = useState(referenceYear);

  useEffect(() => {
    queueMicrotask(() => {
      const browserCurrentYear = new Date().getFullYear();
      setEffectiveYear((prev) => (prev !== browserCurrentYear ? browserCurrentYear : prev));
    });
  }, []);

  const years = generateBirthYears(effectiveYear);
  const pickerRef = useRef<HTMLInputElement>(null);
  const now = new Date();
  const maxDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

  const dNum = Number.parseInt(day.trim(), 10);
  const mNum = Number.parseInt(month.trim(), 10);
  const yNum = Number.parseInt(year.trim(), 10);
  const isDateValid =
    !Number.isNaN(dNum) &&
    !Number.isNaN(mNum) &&
    !Number.isNaN(yNum) &&
    isValidSolarDate(yNum, mNum, dNum) &&
    !isFutureSolarDate(yNum, mNum, dNum);

  const pickerValue = isDateValid
    ? `${yNum.toString().padStart(4, "0")}-${mNum.toString().padStart(2, "0")}-${dNum.toString().padStart(2, "0")}`
    : "";

  function handlePickerChange(event: ChangeEvent<HTMLInputElement>) {
    const val = event.target.value;
    if (val && /^\d{4}-\d{2}-\d{2}$/.test(val)) {
      const parts = val.split("-");
      const y = parts[0];
      const m = parts[1];
      const d = parts[2];
      if (y && m && d) {
        onYearChange(y);
        onMonthChange(m);
        onDayChange(d);
      }
    }
  }

  function handleOpenCalendar() {
    if (disabled) return;
    if (pickerRef.current) {
      try {
        if (typeof pickerRef.current.showPicker === "function") {
          pickerRef.current.showPicker();
          return;
        }
      } catch {
        // Fallback for browsers without showPicker
      }
      pickerRef.current.focus();
      pickerRef.current.click();
    }
  }

  const normalizedDay = day ? day.padStart(2, "0") : "";
  const normalizedMonth = month ? month.padStart(2, "0") : "";

  return (
    <div className={`birth-date-fields ${className}`}>
      <div className="birth-date-inputs ui-field-shell__control">
        <span aria-hidden="true" className="ui-field-shell__icon birth-date-leading-icon">
          <Icon name="calendar-day" />
        </span>

        {/* Inline Day Select */}
        <label className="birth-date-select-label">
          <span className="sr-only">{dayLabel}</span>
          <select
            aria-label={dayLabel}
            className="birth-date-select birth-date-select--day ui-field-shell__select"
            disabled={disabled}
            name="birthDay"
            onChange={(e) => onDayChange(e.target.value)}
            value={normalizedDay}
          >
            <option value="">{dayPlaceholder}</option>
            {BIRTH_DAYS.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </label>

        <span aria-hidden="true" className="birth-date-separator">/</span>

        {/* Inline Month Select */}
        <label className="birth-date-select-label">
          <span className="sr-only">{monthLabel}</span>
          <select
            aria-label={monthLabel}
            className="birth-date-select birth-date-select--month ui-field-shell__select"
            disabled={disabled}
            name="birthMonth"
            onChange={(e) => onMonthChange(e.target.value)}
            value={normalizedMonth}
          >
            <option value="">{monthPlaceholder}</option>
            {BIRTH_MONTHS.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </label>

        <span aria-hidden="true" className="birth-date-separator">/</span>

        {/* Inline Year Select */}
        <label className="birth-date-select-label">
          <span className="sr-only">{yearLabel}</span>
          <select
            aria-label={yearLabel}
            className="birth-date-select birth-date-select--year ui-field-shell__select"
            disabled={disabled}
            name="birthYear"
            onChange={(e) => onYearChange(e.target.value)}
            value={year}
          >
            <option value="">{yearPlaceholder}</option>
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </label>

        {/* Solar/Lunar control in the same shell */}
        <div className="birth-date-calendar-select-wrap">
          <select
            aria-label={calendarLabel}
            className="birth-date-calendar-select ui-field-shell__select"
            disabled={disabled}
            name="calendarType"
            onChange={(e) => onCalendarTypeChange?.(e.target.value as "solar" | "lunar")}
            value={calendarType}
          >
            <option value="solar">{solarLabel}</option>
            <option value="lunar">{lunarLabel}</option>
          </select>
        </div>

        {calendarType === "solar" ? (
          <div className="birth-date-picker-wrap">
            <button
              aria-label={calendarButtonLabel}
              className="birth-date-calendar-button"
              disabled={disabled}
              onClick={handleOpenCalendar}
              title={calendarButtonLabel}
              type="button"
            >
              <Icon name="calendar-day" />
            </button>
            <input
              aria-hidden="true"
              className="birth-date-native-picker"
              disabled={disabled}
              max={maxDate}
              onChange={handlePickerChange}
              ref={pickerRef}
              tabIndex={-1}
              type="date"
              value={pickerValue}
            />
          </div>
        ) : null}
      </div>

      {error ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
