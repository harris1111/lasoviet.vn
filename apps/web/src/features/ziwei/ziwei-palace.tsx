import type { NormalizedZiweiChartV1 } from "@lasoviet/contracts";

type ZiweiPalaceProps = {
  palace: NormalizedZiweiChartV1["palaces"][number];
  bodyPalaceId: string;
  soulPalaceId: string;
};

function label(value: string) {
  return value.split(".").at(-1)?.replaceAll("-", " ") ?? value;
}

export function ZiweiPalace({ palace, bodyPalaceId, soulPalaceId }: ZiweiPalaceProps) {
  const markers = [
    palace.id === soulPalaceId ? "Mệnh" : null,
    palace.id === bodyPalaceId ? "Thân" : null,
  ].filter(Boolean);

  return (
    <article className="ziwei-palace" data-testid="ziwei-palace">
      <div className="ziwei-palace-heading">
        <h3>{label(palace.id)}</h3>
        <span>{label(palace.earthlyBranchId)}</span>
      </div>
      {markers.length > 0 ? <p className="ziwei-palace-markers">{markers.join(" · ")}</p> : null}
      <ul>
        {palace.stars.length === 0 ? <li>Không có sao chính</li> : palace.stars.map((star) => (
          <li key={star.id}>{label(star.id)}</li>
        ))}
      </ul>
    </article>
  );
}
