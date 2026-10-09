import type { PalaceScoreBandKey } from "../reports/report-palace-score";

export type SupportPalace = { id: string; name: string; score: number; band: PalaceScoreBandKey; stars: string };

type Labels = {
  strongTitle: string;
  weakTitle: string;
  weakNote: string;
  allTitle: string;
  midpoint: string;
  viewOnChart: string;
  band: (band: PalaceScoreBandKey) => string;
  card: (palace: SupportPalace) => string;
};

export function rankSupportPalaces(palaces: SupportPalace[]) {
  const ranked = [...palaces].sort((a, b) => b.score - a.score);
  return { strong: ranked.slice(0, 3), weak: ranked.slice(-3).reverse() };
}

function Ring({ palace, small }: { palace: SupportPalace; small?: boolean }) {
  return (
    <span className={`fd109-ring fd109-band-${palace.band}${small ? " fd109-ring-small" : ""}`}
      style={{ "--s": palace.score } as React.CSSProperties} aria-hidden="true">
      <b>{palace.score}</b>
    </span>
  );
}

function Card({ palace, labels, onFocus }: { palace: SupportPalace; labels: Labels; onFocus: (id: string) => void }) {
  return (
    <li>
      <button type="button" className={`fd109-pcard fd109-band-${palace.band}`} data-testid="fd109-support-card"
        data-palace-id={palace.id} aria-label={labels.card(palace)} onClick={() => onFocus(palace.id)}>
        <Ring palace={palace} />
        <span className="fd109-pcard-title">
          <strong>{palace.name}</strong>
          <span className="fd109-band-label">{labels.band(palace.band)} · {palace.score}</span>
        </span>
        <span className="fd109-pcard-stars">{palace.stars}</span>
        <span className="fd109-pcard-go" aria-hidden="true">{labels.viewOnChart} ›</span>
      </button>
    </li>
  );
}

export function ZiweiSupportPalaces({ palaces, labels, onFocus }: { palaces: SupportPalace[]; labels: Labels; onFocus: (id: string) => void }) {
  const { strong, weak } = rankSupportPalaces(palaces);
  const ordered = palaces;
  return (
    <div className="fd109-support" data-testid="fd109-support-palaces">
      <section aria-labelledby="fd109-strong-title">
        <h3 id="fd109-strong-title">{labels.strongTitle}</h3>
        <ul className="fd109-pcards">{strong.map((palace) => <Card key={palace.id} palace={palace} labels={labels} onFocus={onFocus} />)}</ul>
      </section>
      <section aria-labelledby="fd109-weak-title">
        <h3 id="fd109-weak-title">{labels.weakTitle}</h3>
        <ul className="fd109-pcards">{weak.map((palace) => <Card key={palace.id} palace={palace} labels={labels} onFocus={onFocus} />)}</ul>
        {weak[0]!.score >= 55 && <p className="fd109-support-note" data-testid="fd109-weak-note">{labels.weakNote}</p>}
      </section>
      <details className="fd109-all12" data-testid="fd109-all12">
        <summary>{labels.allTitle}</summary>
        <ol className="fd109-bars">
          {ordered.map((palace) => (
            <li key={palace.id} className={`fd109-band-${palace.band}`}>
              <span>{palace.name}</span>
              <span className="fd109-bar" role="img" aria-label={`${palace.name}: ${palace.score}`}><i style={{ width: `${palace.score}%` }} /></span>
              <b>{palace.score}</b>
            </li>
          ))}
        </ol>
        <p className="fd109-bars-mark">{labels.midpoint}</p>
      </details>
    </div>
  );
}
