type Month = { index: number; marker: "warn" | "good" | "neutral" };
type Labels = {
  title: string; legendGood: string; legendNeutral: string; legendWarn: string; lunar: string; noneNote: string;
  month: (index: number) => string; state: (marker: Month["marker"]) => string; warnAria: (index: number) => string;
};

const GLYPH: Record<Month["marker"], string> = { good: "◆", neutral: "○", warn: "" };

function Lock() {
  return <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><rect x="3" y="7" width="10" height="7" rx="1.5" fill="currentColor" /><path d="M5 7V5a3 3 0 0 1 6 0v2" fill="none" stroke="currentColor" strokeWidth="1.6" /></svg>;
}

export function ZiweiMonthStrip({ months, labels, onOpenLocked }: {
  months: Month[]; labels: Labels; onOpenLocked: (trigger: HTMLButtonElement) => void;
}) {
  const hasWarn = months.some((month) => month.marker === "warn");
  return (
    <div className="fd109-months-wrap" data-testid="fd109-month-strip">
      <h3>{labels.title}</h3>
      <ol className="fd109-months">
        {months.map((month) => {
          const body = <>
            <span className="fd109-month-glyph" aria-hidden="true">{month.marker === "warn" ? <Lock /> : GLYPH[month.marker]}</span>
            <b>{labels.month(month.index)}</b><small>{labels.state(month.marker)}</small>
          </>;
          return (
            <li key={month.index} className={`fd109-month fd109-month-${month.marker}`}>
              {month.marker === "warn"
                ? <button type="button" aria-label={labels.warnAria(month.index)} onClick={(event) => onOpenLocked(event.currentTarget)}>{body}</button>
                : <span className="fd109-month-tile" role="text" aria-label={`${labels.month(month.index)}, ${labels.state(month.marker)}`}>{body}</span>}
            </li>
          );
        })}
      </ol>
      <p className="fd109-legend"><span>◆ {labels.legendGood}</span><span>○ {labels.legendNeutral}</span><span><Lock /> {labels.legendWarn}</span><span>{labels.lunar}</span></p>
      {hasWarn ? null : <p className="fd109-month-none" data-testid="fd109-month-none">{labels.noneNote}</p>}
    </div>
  );
}
