"use client";
import { useTranslations } from "next-intl";
import { LA_TOP_UP_PACKS, type LaPackPresentation } from "./la-packs";

export function PackPicker({ selected, onSelect, locale, gap }: {
  selected: LaPackPresentation; onSelect: (pack: LaPackPresentation) => void; locale: "vi" | "en"; gap: number;
}) {
  const t = useTranslations("reports");
  const first = LA_TOP_UP_PACKS.findIndex(pack => pack.totalLa >= gap);
  return <fieldset className="inline-topup-packs"><legend>{t("selection.inlinePackLabel")}</legend>
    {LA_TOP_UP_PACKS.map((pack, index) => <label key={pack.id} data-selected={selected.id === pack.id}>
      <input type="radio" name="inline-topup-pack" value={pack.id} checked={selected.id === pack.id} disabled={pack.totalLa < gap}
        onChange={() => onSelect(pack)} />
      <span><strong>{pack.name[locale]} · {pack.totalLa.toLocaleString(locale === "vi" ? "vi-VN" : "en-US")} Lá</strong>
        <span>{pack.vndFormatted[locale]}</span>
        {index === first + 1 && pack.bonusLa > 0 && <small>{t("selection.inlinePackBonus", { bonus: pack.bonusLa })}</small>}
      </span>
    </label>)}
  </fieldset>;
}
