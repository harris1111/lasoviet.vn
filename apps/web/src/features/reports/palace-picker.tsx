"use client";
import { CANONICAL_PALACE_SKU_MAP, findLaProduct, type LaSku, type WalletQuoteV1 } from "@lasoviet/contracts";
import { useTranslations } from "next-intl";

export function PalacePicker({ locale, selectedSku, onSelect, scores, quotes }: {
  locale: "vi" | "en"; selectedSku: LaSku; onSelect: (sku: LaSku) => void;
  scores: Record<string, number>; quotes: WalletQuoteV1[] | null;
}) {
  const t = useTranslations("reports");
  return <fieldset className="palace-picker"><legend>{t("selection.ladderChoosePalace")}</legend>
    <div>{Object.entries(CANONICAL_PALACE_SKU_MAP).map(([palaceId, sku]) => {
      const product = findLaProduct(sku)!;
      const owned = quotes?.find(item => item.sku === sku)?.state === "owned";
      return <button key={sku} type="button" aria-pressed={selectedSku === sku} onClick={() => onSelect(sku as LaSku)}>
        <strong>{product.name[locale]}</strong>
        {scores[palaceId] !== undefined && <span>{t("selection.ladderScore", { score: scores[palaceId] })}</span>}
        {owned && <span>{t("selection.ladderOwned")}</span>}
      </button>;
    })}</div>
  </fieldset>;
}
