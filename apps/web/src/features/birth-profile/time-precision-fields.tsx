"use client";

import { Icon } from "../../components/icon";
import {
  CANONICAL_BRANCH_IDS,
  getBranchOptionLabel,
  isCanonicalBranchId,
  type CanonicalBranchId,
} from "./homepage-birth-prefill";
import type { BirthTimeState } from "./birth-profile-input";

type TimePrecisionFieldsProps = {
  hour?: string;
  minute?: string;
  timeUnknown?: boolean;
  timeState?: BirthTimeState;
  locale?: "en" | "vi";
  labels: {
    hour: string;
    minute: string;
    title: string;
    unknown: string;
    unknownHelp: string;
    exactMode?: string;
    branchMode?: string;
    branch?: string;
    branchPlaceholder?: string;
    branchHelp?: string;
  };
  onHourChange?(value: string): void;
  onMinuteChange?(value: string): void;
  onTimeUnknownChange?(value: boolean): void;
  onTimeStateChange?(value: BirthTimeState): void;
};

export function TimePrecisionFields({
  hour = "",
  minute = "",
  timeUnknown = false,
  timeState,
  locale = "vi",
  labels,
  onHourChange,
  onMinuteChange,
  onTimeUnknownChange,
  onTimeStateChange,
}: TimePrecisionFieldsProps) {
  const currentPrecision: "exact_minute" | "branch_only" | "unknown" =
    timeState !== undefined
      ? timeState.precision
      : timeUnknown
      ? "unknown"
      : "exact_minute";

  const effectiveHour =
    timeState?.precision === "exact_minute" ? timeState.hour : hour;
  const effectiveMinute =
    timeState?.precision === "exact_minute" ? timeState.minute : minute;
  const effectiveBranch: CanonicalBranchId | "" =
    timeState?.precision === "branch_only" ? (timeState.branch ?? "") : "";

  function handleUnknownToggle(checked: boolean) {
    if (checked) {
      if (onTimeStateChange) {
        onTimeStateChange({ precision: "unknown" });
      }
      onTimeUnknownChange?.(true);
    } else {
      const fallbackState: BirthTimeState = {
        precision: "exact_minute",
        hour: effectiveHour,
        minute: effectiveMinute,
      };
      if (onTimeStateChange) {
        onTimeStateChange(fallbackState);
      }
      onTimeUnknownChange?.(false);
    }
  }

  function handleSwitchMode(mode: "exact_minute" | "branch_only") {
    if (mode === "exact_minute") {
      onTimeStateChange?.({
        precision: "exact_minute",
        hour: effectiveHour,
        minute: effectiveMinute,
      });
      onTimeUnknownChange?.(false);
    } else {
      onTimeStateChange?.({
        precision: "branch_only",
        branch: effectiveBranch && isCanonicalBranchId(effectiveBranch) ? effectiveBranch : "",
      });
      onTimeUnknownChange?.(false);
    }
  }

  function handleBranchChange(newBranch: CanonicalBranchId | "") {
    if (onTimeStateChange) {
      onTimeStateChange({
        precision: "branch_only",
        branch: newBranch,
      });
    }
  }

  function handleHourChange(val: string) {
    if (onTimeStateChange) {
      onTimeStateChange({
        precision: "exact_minute",
        hour: val,
        minute: effectiveMinute,
      });
    }
    onHourChange?.(val);
  }

  function handleMinuteChange(val: string) {
    if (onTimeStateChange) {
      onTimeStateChange({
        precision: "exact_minute",
        hour: effectiveHour,
        minute: val,
      });
    }
    onMinuteChange?.(val);
  }

  return (
    <fieldset className="wizard-fieldset wizard-time-fieldset">
      <legend className="wizard-field-label">{labels.title}</legend>
      <label className="wizard-check wizard-unknown-time">
        <input
          checked={currentPrecision === "unknown"}
          onChange={(event) => handleUnknownToggle(event.target.checked)}
          type="checkbox"
        />
        <span>{labels.unknown}</span>
      </label>

      {currentPrecision === "unknown" ? (
        <p className="wizard-help">{labels.unknownHelp}</p>
      ) : (
        <>
          <div className="wizard-precision-toggle">
            <button
              aria-pressed={currentPrecision === "exact_minute"}
              className={`wizard-mode-button${
                currentPrecision === "exact_minute" ? " is-active" : ""
              }`}
              onClick={() => handleSwitchMode("exact_minute")}
              type="button"
            >
              {labels.exactMode ?? (locale === "en" ? "Exact time" : "Giờ & phút")}
            </button>
            <button
              aria-pressed={currentPrecision === "branch_only"}
              className={`wizard-mode-button${
                currentPrecision === "branch_only" ? " is-active" : ""
              }`}
              onClick={() => handleSwitchMode("branch_only")}
              type="button"
            >
              {labels.branchMode ?? (locale === "en" ? "12 Branches" : "12 Địa Chi")}
            </button>
          </div>

          {currentPrecision === "exact_minute" ? (
            <div className="wizard-time-inputs ui-field-shell__control">
              <span aria-hidden="true" className="ui-field-shell__icon">
                <Icon name="clock" />
              </span>
              <label className="wizard-time-input-label">
                <span className="sr-only">{labels.hour}</span>
                <input
                  aria-label={labels.hour}
                  className="wizard-time-input ui-field-shell__input"
                  inputMode="numeric"
                  maxLength={2}
                  onChange={(event) => handleHourChange(event.target.value)}
                  placeholder="09"
                  required
                  value={effectiveHour}
                />
              </label>
              <span aria-hidden="true" className="wizard-time-colon">:</span>
              <label className="wizard-time-input-label">
                <span className="sr-only">{labels.minute}</span>
                <input
                  aria-label={labels.minute}
                  className="wizard-time-input ui-field-shell__input"
                  inputMode="numeric"
                  maxLength={2}
                  onChange={(event) => handleMinuteChange(event.target.value)}
                  placeholder="30"
                  required
                  value={effectiveMinute}
                />
              </label>
            </div>
          ) : (
            <div className="wizard-branch-input">
              <label className="wizard-branch-label">
                <span className="sr-only">{labels.branch ?? labels.title}</span>
                <div className="ui-field-shell__control">
                  <span aria-hidden="true" className="ui-field-shell__icon">
                    <Icon name="orbit" />
                  </span>
                  <select
                    aria-label={labels.branch ?? labels.title}
                    className="wizard-branch-select ui-field-shell__select"
                    name="birthBranch"
                    onChange={(event) =>
                      handleBranchChange(event.target.value as CanonicalBranchId | "")
                    }
                    value={effectiveBranch}
                  >
                    <option value="">
                      {labels.branchPlaceholder ?? (locale === "en" ? "Select birth hour (12 Branches)" : "Chọn giờ sinh (12 Địa Chi)")}
                    </option>
                    {CANONICAL_BRANCH_IDS.map((id) => (
                      <option key={id} value={id}>
                        {getBranchOptionLabel(id, locale)}
                      </option>
                    ))}
                  </select>
                </div>
              </label>
              <p className="wizard-help">{labels.branchHelp}</p>
            </div>
          )}
        </>
      )}
    </fieldset>
  );
}
