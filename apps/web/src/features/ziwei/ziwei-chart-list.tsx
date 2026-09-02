import type { NormalizedZiweiChartV1 } from "@lasoviet/contracts";

import { ZiweiPalace } from "./ziwei-palace";

export function ZiweiChartList({ chart }: { chart: NormalizedZiweiChartV1 }) {
  return (
    <section aria-label="Danh sách 12 cung" className="ziwei-chart-list" data-testid="ziwei-chart-list">
      {chart.palaces.map((palace) => (
        <ZiweiPalace
          bodyPalaceId={chart.bodyPalaceId}
          key={palace.id}
          palace={palace}
          soulPalaceId={chart.soulPalaceId}
        />
      ))}
    </section>
  );
}
