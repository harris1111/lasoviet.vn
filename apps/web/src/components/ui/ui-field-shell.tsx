import type { ReactNode } from "react";

type UiFieldShellProps = {
  children: ReactNode;
  hint?: string;
  icon: ReactNode;
  label: string;
};

export function UiFieldShell({
  children,
  hint,
  icon,
  label,
}: UiFieldShellProps) {
  return (
    <label className="ui-field-shell">
      <span className="ui-field-shell__label">{label}</span>
      <span className="ui-field-shell__control">
        <span className="ui-field-shell__icon" aria-hidden="true">{icon}</span>
        {children}
      </span>
      {hint ? <span className="ui-field-shell__hint">{hint}</span> : null}
    </label>
  );
}
