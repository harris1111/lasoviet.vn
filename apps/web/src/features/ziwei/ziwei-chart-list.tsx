import type { NormalizedZiweiChartV1 } from "@lasoviet/contracts";

import { ZiweiPalace } from "./ziwei-palace";
import {
  ziweiPresentation,
  type ZiweiPresentationLocale,
} from "./ziwei-presentation";

export function ZiweiChartList({
  chart,
  locale,
}: {
  chart: NormalizedZiweiChartV1;
  locale: ZiweiPresentationLocale;
}) {
  const presentation = ziweiPresentation(locale);

  return (
    <section aria-label={presentation.chrome.listAria} className="ziwei-chart-list" data-testid="ziwei-chart-list">
      {chart.palaces.map((palace) => (
        <ZiweiPalace
          bodyPalaceId={chart.bodyPalaceId}
          key={palace.id}
          locale={locale}
          palace={palace}
          soulPalaceId={chart.soulPalaceId}
        />
      ))}
    </section>
  );
}
