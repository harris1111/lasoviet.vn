"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { useTranslations } from "next-intl";
import type { NormalizedZiweiChartV1, ZiweiBirthSummaryV1 } from "@lasoviet/contracts";
import { ZiweiChart } from "./ziwei-chart";
import { fitBoard, stepZoom, zoomForKey, ZOOM_MAX, ZOOM_MIN } from "./ziwei-chart-fit";
import type { ZiweiPresentationLocale } from "./ziwei-presentation";

type Props = {
  chart: NormalizedZiweiChartV1;
  birthSummary?: ZiweiBirthSummaryV1;
  locale: ZiweiPresentationLocale;
  selectedPalaceId: string;
  onSelectPalace: (palaceId: string) => void;
};

// Enlarged chart (D5): the board keeps a design width and is scaled to the sheet, so all 12 cells stay
// visible. Palace detail lives in its own region (bottom drawer on phones, right column from 1100px).
export function ZiweiChartSheet({ chart, birthSummary, locale, selectedPalaceId, onSelectPalace }: Props) {
  const t = useTranslations("ziwei");
  const [zoom, setZoom] = useState(1);
  const [width, setWidth] = useState(0);
  const [height, setHeight] = useState(0);
  const [boardHeight, setBoardHeight] = useState(0);
  const [detailOpen, setDetailOpen] = useState(false);
  const viewportRef = useRef<HTMLDivElement>(null);
  const boardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const viewport = viewportRef.current;
    const board = boardRef.current;
    if (!viewport || !board) return;
    const measure = () => {
      const style = getComputedStyle(viewport);
      const padding = parseFloat(style.paddingLeft) + parseFloat(style.paddingRight);
      setWidth(Math.max(0, viewport.clientWidth - (Number.isFinite(padding) ? padding : 0)));
      const vertical = parseFloat(style.paddingTop) + parseFloat(style.paddingBottom);
      setHeight(Math.max(0, viewport.clientHeight - (Number.isFinite(vertical) ? vertical : 0)));
      setBoardHeight(board.offsetHeight);
    };
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(viewport);
    observer.observe(board);
    return () => observer.disconnect();
  }, []);

  const { layoutWidth, scale } = fitBoard(width, zoom, height, boardHeight);
  const percent = `${Math.round(zoom * 100)}%`;

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    const next = zoomForKey(zoom, event.key);
    if (next === null) return;
    event.preventDefault();
    setZoom(next);
  }

  return (
    <div className="fd109-sheet" data-testid="fd109-chart-sheet" onKeyDown={onKeyDown}>
      <div className="fd109-sheet-tools" role="toolbar" aria-label={t("freeResult.sheetTools")}>
        <button type="button" className="fd109-sheet-btn" aria-label={t("freeResult.zoomOut")}
          aria-disabled={zoom <= ZOOM_MIN} onClick={() => setZoom((value) => stepZoom(value, -1))}>−</button>
        <span className="fd109-sheet-level" role="status" aria-label={t("freeResult.zoomLevel")}>{percent}</span>
        <button type="button" className="fd109-sheet-btn" aria-label={t("freeResult.zoomIn")}
          aria-disabled={zoom >= ZOOM_MAX} onClick={() => setZoom((value) => stepZoom(value, 1))}>+</button>
        <button type="button" className="fd109-sheet-btn fd109-sheet-fit" aria-label={t("freeResult.zoomFitLabel")}
          onClick={() => setZoom(1)}>{t("freeResult.zoomFit")}</button>
      </div>
      <div className="fd109-sheet-body">
        <div className="fd109-sheet-viewport" ref={viewportRef} tabIndex={0} data-testid="fd109-sheet-viewport">
          <div className="fd109-sheet-stage" style={{ width: layoutWidth * scale, height: boardHeight ? boardHeight * scale : undefined }}>
            <div className="fd109-sheet-board" ref={boardRef}
              style={{ width: layoutWidth, transform: `scale(${scale})` }}>
              <ZiweiChart chart={chart} birthSummary={birthSummary} locale={locale} hideInspector
                selectedPalaceId={selectedPalaceId}
                onSelectPalace={(id) => { onSelectPalace(id); setDetailOpen(true); }} />
            </div>
          </div>
        </div>
        <section className="fd109-sheet-detail" data-open={detailOpen ? "true" : "false"}>
          <button type="button" className="fd109-sheet-detail-toggle" aria-expanded={detailOpen}
            aria-controls="fd109-sheet-detail-body" onClick={() => setDetailOpen((open) => !open)}>
            {t("freeResult.detailToggle")}
          </button>
          <div id="fd109-sheet-detail-body" className="fd109-sheet-detail-body">
            <ZiweiChart chart={chart} birthSummary={birthSummary} locale={locale} hideBoard
              selectedPalaceId={selectedPalaceId} onSelectPalace={onSelectPalace} />
          </div>
        </section>
      </div>
    </div>
  );
}
