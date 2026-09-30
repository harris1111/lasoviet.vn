"use client";

import { useEffect, useRef } from "react";
import type { ReportChartProps } from "./report-chart-visuals";
import { ReportChart } from "./report-chart-visuals";

export function ReportChartSheet({ onClose, onSelect, ...chart }: ReportChartProps & { onClose: () => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const navigatingRef = useRef(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    dialog?.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      dialog?.close();
      document.body.style.overflow = previousOverflow;
      if (!navigatingRef.current) opener?.focus({ preventScroll: true });
    };
  }, []);

  return (
    <dialog
      ref={dialogRef}
      className="report-chart-sheet"
      aria-label={chart.t("reader.chart_title")}
      onKeyDown={(event) => {
        if (event.key !== "Tab") return;
        const stops = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>("button:not([tabindex='-1'])"));
        const first = stops[0];
        const last = stops.at(-1);
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      }}
      onCancel={(event) => { event.preventDefault(); onClose(); }}
      onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}
    >
      <div className="report-chart-sheet-content">
        <header className="report-chart-sheet-header">
          <h2>{chart.t("reader.chart_title")}</h2>
          <button type="button" autoFocus onClick={onClose} aria-label={chart.t("reader.close_chart")}>✕</button>
        </header>
        <p className="report-chart-help">{chart.t("reader.chart_navigation_help")}</p>
        <div className="report-chart-sheet-scroll">
          <ReportChart {...chart} variant="full" onSelect={(palaceId) => {
            navigatingRef.current = true;
            onClose();
            requestAnimationFrame(() => onSelect?.(palaceId));
          }} />
        </div>
      </div>
    </dialog>
  );
}
