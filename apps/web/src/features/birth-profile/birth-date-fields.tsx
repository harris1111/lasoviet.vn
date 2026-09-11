"use client";

import { useRef, type ChangeEvent } from "react";
import { Icon } from "../../components/icon";
import { isFutureSolarDate, isValidSolarDate } from "./homepage-birth-prefill";

export type BirthDateFieldsProps = {
  day: string;
  month: string;
  year: string;
  onDayChange(value: string): void;
  onMonthChange(value: string): void;
  onYearChange(value: string): void;
  calendarType?: "solar" | "lunar";
  locale?: "en" | "vi";
  dayLabel?: string;
  monthLabel?: string;
  yearLabel?: string;
  calendarButtonLabel?: string;
  dayPlaceholder?: string;
  monthPlaceholder?: string;
  yearPlaceholder?: string;
  error?: string | null;
  className?: string;
  disabled?: boolean;
};

export function BirthDateFields({
  day,
  month,
  year,
  onDayChange,
  onMonthChange,
  onYearChange,
  calendarType = "solar",
  locale = "vi",
  dayLabel = locale === "en" ? "Day" : "Ngày",
  monthLabel = locale === "en" ? "Month" : "Tháng",
  yearLabel = locale === "en" ? "Year" : "Năm",
  calendarButtonLabel = locale === "en" ? "Select date from calendar" : "Chọn ngày từ lịch",
  dayPlaceholder = "12",
  monthPlaceholder = "04",
  yearPlaceholder = "1994",
  error,
  className = "",
  disabled = false,
}: BirthDateFieldsProps) {
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

  return (
    <div className={`birth-date-fields ${className}`}>
      <div className="birth-date-inputs">
        <label className="birth-date-input-label">
          <span className="birth-date-input-text">{dayLabel}</span>
          <input
            aria-label={dayLabel}
            className="birth-date-input day"
            disabled={disabled}
            inputMode="numeric"
            maxLength={2}
            onChange={(e) => onDayChange(e.target.value)}
            pattern="[0-9]*"
            placeholder={dayPlaceholder}
            type="text"
            value={day}
          />
        </label>
        <span aria-hidden="true" className="birth-date-separator">/</span>
        <label className="birth-date-input-label">
          <span className="birth-date-input-text">{monthLabel}</span>
          <input
            aria-label={monthLabel}
            className="birth-date-input month"
            disabled={disabled}
            inputMode="numeric"
            maxLength={2}
            onChange={(e) => onMonthChange(e.target.value)}
            pattern="[0-9]*"
            placeholder={monthPlaceholder}
            type="text"
            value={month}
          />
        </label>
        <span aria-hidden="true" className="birth-date-separator">/</span>
        <label className="birth-date-input-label">
          <span className="birth-date-input-text">{yearLabel}</span>
          <input
            aria-label={yearLabel}
            className="birth-date-input year"
            disabled={disabled}
            inputMode="numeric"
            maxLength={4}
            onChange={(e) => onYearChange(e.target.value)}
            pattern="[0-9]*"
            placeholder={yearPlaceholder}
            type="text"
            value={year}
          />
        </label>
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
