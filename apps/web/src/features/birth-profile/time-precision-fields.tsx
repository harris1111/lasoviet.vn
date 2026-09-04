"use client";

import {
  CANONICAL_BRANCH_IDS,
  getBranchOptionLabel,
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
  // Resolve effective state between new discriminated timeState and legacy props
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
  const effectiveBranch: CanonicalBranchId =
    timeState?.precision === "branch_only" ? timeState.branch : "zi";

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
        branch: effectiveBranch,
      });
      onTimeUnknownChange?.(false);
    }
  }

  function handleBranchChange(newBranch: CanonicalBranchId) {
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
    <fieldset className="wizard-fieldset">
      <legend>{labels.title}</legend>
      <label className="wizard-check">
        <input
          checked={currentPrecision === "unknown"}
          onChange={(event) => handleUnknownToggle(event.target.checked)}
          type="checkbox"
        />
        {labels.unknown}
      </label>

      {currentPrecision === "unknown" ? (
        <p className="wizard-help">{labels.unknownHelp}</p>
      ) : (
        <>
          <div className="wizard-precision-toggle">
            <button
              aria-pressed={currentPrecision === "exact_minute"}
              className={`button button-small ${
                currentPrecision === "exact_minute" ? "" : "button-secondary"
              }`}
              onClick={() => handleSwitchMode("exact_minute")}
              type="button"
            >
              {labels.exactMode ?? "Giờ & phút"}
            </button>
            <button
              aria-pressed={currentPrecision === "branch_only"}
              className={`button button-small ${
                currentPrecision === "branch_only" ? "" : "button-secondary"
              }`}
              onClick={() => handleSwitchMode("branch_only")}
              type="button"
            >
              {labels.branchMode ?? "12 Địa Chi"}
            </button>
          </div>

          {currentPrecision === "exact_minute" ? (
            <div className="wizard-time-inputs">
              <label>
                {labels.hour}
                <input
                  aria-label={labels.hour}
                  inputMode="numeric"
                  maxLength={2}
                  onChange={(event) => handleHourChange(event.target.value)}
                  required
                  value={effectiveHour}
                />
              </label>
              <span aria-hidden="true">:</span>
              <label>
                {labels.minute}
                <input
                  aria-label={labels.minute}
                  inputMode="numeric"
                  maxLength={2}
                  onChange={(event) => handleMinuteChange(event.target.value)}
                  required
                  value={effectiveMinute}
                />
              </label>
            </div>
          ) : (
            <div className="wizard-branch-input">
              <label>
                {labels.branch ?? labels.title}
                <select
                  aria-label={labels.branch ?? labels.title}
                  onChange={(event) =>
                    handleBranchChange(event.target.value as CanonicalBranchId)
                  }
                  value={effectiveBranch}
                >
                  {CANONICAL_BRANCH_IDS.map((id) => (
                    <option key={id} value={id}>
                      {getBranchOptionLabel(id, locale)}
                    </option>
                  ))}
                </select>
              </label>
              <p className="wizard-help">{labels.branchHelp}</p>
            </div>
          )}
        </>
      )}
    </fieldset>
  );
}
