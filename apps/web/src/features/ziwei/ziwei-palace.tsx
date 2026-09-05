import type { NormalizedZiweiChartV1 } from "@lasoviet/contracts";

import {
  ziweiPresentation,
  type ZiweiPresentationLocale,
} from "./ziwei-presentation";

type ZiweiPalaceProps = {
  palace: NormalizedZiweiChartV1["palaces"][number];
  bodyPalaceId: string;
  soulPalaceId: string;
  locale: ZiweiPresentationLocale;
};

export function ZiweiPalace({
  palace,
  bodyPalaceId,
  soulPalaceId,
  locale,
}: ZiweiPalaceProps) {
  const presentation = ziweiPresentation(locale);
  const markers = [
    palace.id === soulPalaceId ? presentation.chrome.soulMarker : null,
    palace.id === bodyPalaceId ? presentation.chrome.bodyMarker : null,
  ].filter(Boolean);

  return (
    <article className="ziwei-palace" data-testid="ziwei-palace">
      <div className="ziwei-palace-heading">
        <h3>{presentation.palace(palace.id)}</h3>
        <span>{presentation.branch(palace.earthlyBranchId)}</span>
      </div>
      {markers.length > 0 ? <p className="ziwei-palace-markers">{markers.join(" · ")}</p> : null}
      <ul>
        {palace.stars.length === 0 ? <li>{presentation.chrome.noStars}</li> : palace.stars.map((star) => (
          <li key={star.id}>{presentation.star(star.id)}</li>
        ))}
      </ul>
    </article>
  );
}
