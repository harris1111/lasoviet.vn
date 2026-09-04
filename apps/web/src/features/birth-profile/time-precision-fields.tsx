"use client";

type TimePrecisionFieldsProps = {
  hour: string;
  minute: string;
  timeUnknown: boolean;
  labels: {
    hour: string;
    minute: string;
    title: string;
    unknown: string;
    unknownHelp: string;
  };
  onHourChange(value: string): void;
  onMinuteChange(value: string): void;
  onTimeUnknownChange(value: boolean): void;
};

export function TimePrecisionFields({
  hour,
  minute,
  timeUnknown,
  labels,
  onHourChange,
  onMinuteChange,
  onTimeUnknownChange,
}: TimePrecisionFieldsProps) {
  return (
    <fieldset className="wizard-fieldset">
      <legend>{labels.title}</legend>
      <label className="wizard-check">
        <input
          checked={timeUnknown}
          onChange={(event) => onTimeUnknownChange(event.target.checked)}
          type="checkbox"
        />
        {labels.unknown}
      </label>
      {!timeUnknown ? (
        <div className="wizard-time-inputs">
          <label>{labels.hour}<input inputMode="numeric" maxLength={2} onChange={(event) => onHourChange(event.target.value)} required value={hour} /></label>
          <span aria-hidden="true">:</span>
          <label>{labels.minute}<input inputMode="numeric" maxLength={2} onChange={(event) => onMinuteChange(event.target.value)} required value={minute} /></label>
        </div>
      ) : (
        <p className="wizard-help">{labels.unknownHelp}</p>
      )}
    </fieldset>
  );
}
