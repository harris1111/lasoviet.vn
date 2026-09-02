"use client";

import { useState } from "react";
import type { NormalizedZiweiChartV1 } from "@lasoviet/contracts";

import { ZiweiChartList } from "./ziwei-chart-list";
import { ZiweiPalace } from "./ziwei-palace";

export function ZiweiChart({ chart }: { chart: NormalizedZiweiChartV1 }) {
  const [view, setView] = useState<"chart" | "list">("chart");

  return (
    <section aria-label="Lá số Tử Vi" className={`ziwei-chart view-${view}`}>
      <div className="ziwei-view-toggle" role="group" aria-label="Chế độ xem lá số">
        <button aria-pressed={view === "chart"} onClick={() => setView("chart")} type="button">Sơ đồ</button>
        <button aria-pressed={view === "list"} onClick={() => setView("list")} type="button">Danh sách</button>
      </div>
      <div className="ziwei-chart-grid">
        {chart.palaces.map((palace) => (
          <ZiweiPalace
            bodyPalaceId={chart.bodyPalaceId}
            key={palace.id}
            palace={palace}
            soulPalaceId={chart.soulPalaceId}
          />
        ))}
      </div>
      <ZiweiChartList chart={chart} />
    </section>
  );
}
