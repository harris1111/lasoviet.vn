import type { CSSProperties } from "react";
import type { FreeResultDecadeCycle } from "./ziwei-free-result-model";

type Labels = {
  current: string;
  ages: (cycle: FreeResultDecadeCycle) => string;
  card: (cycle: FreeResultDecadeCycle) => string;
  band: (cycle: FreeResultDecadeCycle) => string;
};

export function ZiweiDecadeStrip({ cycles, labels, onFocus }: {
  cycles: FreeResultDecadeCycle[]; labels: Labels; onFocus: (palaceId: string) => void;
}) {
  return (
    <ol className="fd109-decade" data-testid="fd109-decade-strip">
      {cycles.map((cycle) => (
        <li key={cycle.ordinal} className={`fd109-decade-${cycle.state}`} data-current={cycle.state === "current" ? "true" : undefined}>
          <button type="button" className={`fd109-band-${cycle.band}`} aria-label={labels.card(cycle)}
            aria-current={cycle.state === "current" ? "true" : undefined} onClick={() => onFocus(cycle.palaceId)}>
            {cycle.state === "current" ? <span className="fd109-seal">{labels.current}</span> : null}
            <span className="fd109-decade-age">{labels.ages(cycle)}</span>
            <span className="fd109-decade-palace">{cycle.palaceName}</span>
            <span className="fd109-decade-track" aria-hidden="true"><i style={{ "--s": cycle.score } as CSSProperties} /></span>
            <b className="fd109-decade-score">{cycle.score}</b>
          </button>
        </li>
      ))}
    </ol>
  );
}
