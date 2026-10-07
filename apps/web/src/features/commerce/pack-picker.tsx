"use client";
import { useTranslations } from "next-intl";
import { findSmallestCoveringPack, LA_TOP_UP_PACKS, type LaPackPresentation } from "./la-packs";

export function PackPicker({ selected, onSelect, locale, gap }: {
  selected: LaPackPresentation; onSelect: (pack: LaPackPresentation) => void; locale: "vi" | "en"; gap: number;
}) {
  const t = useTranslations("reports");
  const recommended = findSmallestCoveringPack(gap);
  const format = (value: number) => value.toLocaleString(locale === "vi" ? "vi-VN" : "en-US");
  return <fieldset className="inline-topup-packs"><legend>{t("selection.inlinePackLabel")}</legend>
    <div className="inline-topup-selected" data-testid="inline-selected-pack">
      <span className="inline-topup-pack-badge">{t(selected.id === recommended.id ? "selection.inlineRecommended" : "selection.inlineSelected")}</span>
      <strong>{selected.name[locale]} · {format(selected.totalLa)} Lá</strong>
      <span className="inline-topup-pack-price">{selected.vndFormatted[locale]}</span>
      {selected.bonusLa > 0 && <small>{t("selection.inlinePackBonus", { bonus: format(selected.bonusLa) })}</small>}
    </div>
    <details className="inline-topup-other-packs"><summary>{t("selection.inlineOtherPacks")}</summary>
      <div>{LA_TOP_UP_PACKS.map(pack => <label key={pack.id} data-selected={selected.id === pack.id}>
        <input type="radio" name="inline-topup-pack" value={pack.id} checked={selected.id === pack.id} disabled={pack.totalLa < gap}
          onChange={() => onSelect(pack)} />
        <span><strong>{pack.name[locale]} · {format(pack.totalLa)} Lá</strong><span>{pack.vndFormatted[locale]}</span>
          {pack.totalLa < gap ? <small>{t("selection.inlinePackInsufficient")}</small> : pack.bonusLa > 0 && <small>{t("selection.inlinePackBonus", { bonus: format(pack.bonusLa) })}</small>}
        </span>
      </label>)}</div>
    </details>
  </fieldset>;
}
