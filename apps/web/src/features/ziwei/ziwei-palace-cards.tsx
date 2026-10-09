"use client";

import { useState, type CSSProperties } from "react";
import type { SupportPalace } from "./ziwei-support-palaces";

export type PalaceCard = SupportPalace & { done: boolean };

type Labels = {
  sortLabel: string;
  sortOrder: string;
  sortStrength: string;
  preview: string;
  done: string;
  band: (palace: PalaceCard) => string;
  open: (palace: PalaceCard) => string;
};

export function sortPalaceCards(cards: PalaceCard[], mode: "order" | "strength") {
  return mode === "order" ? cards : [...cards].sort((a, b) => b.score - a.score);
}

export function ZiweiPalaceCards({ cards, labels, onOpen, onOpenDone }: {
  cards: PalaceCard[]; labels: Labels;
  onOpen: (palace: PalaceCard, trigger: HTMLButtonElement) => void;
  onOpenDone: (palace: PalaceCard) => void;
}) {
  const [mode, setMode] = useState<"order" | "strength">("order");
  return (
    <div className="fd109-cards" data-testid="fd109-palace-cards">
      <div className="fd109-sort" role="group" aria-label={labels.sortLabel}>
        <button type="button" aria-pressed={mode === "order"} onClick={() => setMode("order")}>{labels.sortOrder}</button>
        <button type="button" aria-pressed={mode === "strength"} onClick={() => setMode("strength")}>{labels.sortStrength}</button>
      </div>
      <ul className="fd109-card-grid">
        {sortPalaceCards(cards, mode).map((palace) => (
          <li key={palace.id}>
            <button type="button" className={`fd109-card fd109-band-${palace.band}`} data-palace-id={palace.id}
              data-testid={palace.done ? "fd109-palace-done" : "fd109-palace-preview"} aria-label={labels.open(palace)}
              onClick={(event) => palace.done ? onOpenDone(palace) : onOpen(palace, event.currentTarget)}>
              <span className="fd109-ring fd109-ring-small" style={{ "--s": palace.score } as CSSProperties} aria-hidden="true"><b>{palace.score}</b></span>
              <span className="fd109-card-body">
                <strong>{palace.name}</strong>
                <span className="fd109-band-label">{labels.band(palace)} · {palace.stars}</span>
              </span>
              {palace.done ? <span className="fd109-card-done">{labels.done}</span> : <span className="fd109-card-go" aria-hidden="true">{labels.preview} ›</span>}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
