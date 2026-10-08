import type { NormalizedZiweiChartV1 } from "@lasoviet/contracts";

import {
  ziweiPresentation,
  type ZiweiPresentationLocale,
} from "./ziwei-presentation";
import type { PalaceRelationType } from "./ziwei-chart-relations";

export type ZiweiPalaceProps = {
  palace: NormalizedZiweiChartV1["palaces"][number];
  bodyPalaceId: string;
  soulPalaceId: string;
  transformations?: NormalizedZiweiChartV1["transformations"];
  locale: ZiweiPresentationLocale;
  isSelected?: boolean;
  relationType?: PalaceRelationType;
  onSelect?: () => void;
  style?: React.CSSProperties;
  density?: "compact" | "full";
};

export function ZiweiPalace({
  palace,
  bodyPalaceId,
  soulPalaceId,
  transformations = [],
  locale,
  isSelected = false,
  relationType = "none",
  onSelect,
  style,
  density = "full",
}: ZiweiPalaceProps) {
  const compact = density === "compact";
  const presentation = ziweiPresentation(locale);

  const isSoul = palace.id === soulPalaceId;
  const isBody = palace.id === bodyPalaceId;

  const stemText = palace.heavenlyStemId ? presentation.stem(palace.heavenlyStemId) : "";
  const branchText = presentation.branch(palace.earthlyBranchId);
  const stemBranchLabel = stemText ? `${stemText} ${branchText}` : branchText;

  const majorStars = palace.stars.filter((s) => s.category === "major");
  const otherStars = palace.stars.filter((s) => s.category !== "major");

  const cycleStateText = palace.cycleStateId ? presentation.cycleState(palace.cycleStateId) : "";

  // Helper to find transformation for a star
  const getTransformation = (starId: string) => {
    return transformations.find((t) => t.starId === starId);
  };

  const relationLabels: Record<PalaceRelationType, { vi: string; en: string }> = {
    selected: { vi: "Bản cung", en: "Selected" },
    opposite: { vi: "Đối cung", en: "Opposite" },
    trine: { vi: "Tam hợp", en: "Trine" },
    none: { vi: "", en: "" },
  };

  const relationLabel = relationLabels[relationType]?.[locale] || "";

  return (
    <button
      type="button"
      className={`ziwei-palace relation-${relationType} ${isSelected ? "is-selected" : ""}${compact ? " is-compact" : ""}`}
      data-density={density}
      data-testid="ziwei-palace"
      data-palace-id={palace.id}
      data-branch-id={palace.earthlyBranchId}
      aria-pressed={isSelected}
      onClick={onSelect}
      style={style}
    >
      <span className="ziwei-palace-header">
        <span className="palace-name-group">
          <span className="palace-stem-branch">{stemBranchLabel}</span>
          <span className="palace-title">{presentation.palace(palace.id)}</span>
        </span>
        {compact ? null : <span className="palace-badges">
          {relationLabel ? (
            <span className={`palace-relation-tag tag-${relationType}`}>
              {relationLabel}
            </span>
          ) : null}
          {isSoul ? (
            <span className="palace-role-tag tag-soul">{presentation.chrome.soulMarker}</span>
          ) : null}
          {isBody ? (
            <span className="palace-role-tag tag-body">{presentation.chrome.bodyMarker}</span>
          ) : null}
        </span>}
      </span>

      <span className="ziwei-palace-content">
        <span className="palace-stars-section major-stars">
          {majorStars.length === 0 ? (
            <span className="palace-empty-major">{presentation.chrome.noStars}</span>
          ) : (
            majorStars.map((star) => {
              const trans = getTransformation(star.id);
              return (
                <span className="palace-star-row major-row" key={star.id}>
                  <span className="star-name">{presentation.star(star.id)}</span>
                  {compact ? null : <span className="star-brightness">({presentation.brightness(star.brightness)})</span>}
                  {trans && !compact ? (
                    <span className={`star-mutagen mutagen-${trans.id.split(".").at(-1)}`}>
                      {presentation.transformation(trans.id)}
                    </span>
                  ) : null}
                </span>
              );
            })
          )}
        </span>

        {otherStars.length > 0 && !compact ? (
          <span className="palace-stars-section minor-stars">
            {otherStars.map((star) => {
              const trans = getTransformation(star.id);
              return (
                <span className="minor-star-item" key={star.id}>
                  {presentation.star(star.id)}
                  {trans ? (
                    <span className={`star-mutagen mutagen-${trans.id.split(".").at(-1)}`}>
                      {presentation.transformation(trans.id)}
                    </span>
                  ) : null}
                </span>
              );
            })}
          </span>
        ) : null}
      </span>

      {cycleStateText && !compact ? (
        <span className="ziwei-palace-footer">
          <span className="palace-cycle-state">{cycleStateText}</span>
        </span>
      ) : null}
    </button>
  );
}
