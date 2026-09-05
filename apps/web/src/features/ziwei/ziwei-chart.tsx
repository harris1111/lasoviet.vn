"use client";

import { useState } from "react";
import type { NormalizedZiweiChartV1 } from "@lasoviet/contracts";

import { ZiweiChartList } from "./ziwei-chart-list";
import { ZiweiPalace } from "./ziwei-palace";
import {
  ziweiPresentation,
  type ZiweiPresentationLocale,
} from "./ziwei-presentation";

export function ZiweiChart({
  chart,
  locale,
}: {
  chart: NormalizedZiweiChartV1;
  locale: ZiweiPresentationLocale;
}) {
  const [view, setView] = useState<"chart" | "list">("chart");
  const presentation = ziweiPresentation(locale);

  return (
    <section aria-label={presentation.chrome.chartAria} className={`ziwei-chart view-${view}`}>
      <div className="ziwei-view-toggle" role="group" aria-label={presentation.chrome.viewMode}>
        <button aria-pressed={view === "chart"} onClick={() => setView("chart")} type="button">{presentation.chrome.chartView}</button>
        <button aria-pressed={view === "list"} onClick={() => setView("list")} type="button">{presentation.chrome.listView}</button>
      </div>
      <div className="ziwei-chart-grid">
        {chart.palaces.map((palace) => (
          <ZiweiPalace
            bodyPalaceId={chart.bodyPalaceId}
            key={palace.id}
            locale={locale}
            palace={palace}
            soulPalaceId={chart.soulPalaceId}
          />
        ))}
      </div>
      <ZiweiChartList chart={chart} locale={locale} />
    </section>
  );
}
