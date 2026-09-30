import { findLaProduct, type LaCatalogItem } from "@lasoviet/contracts";

/** FD-105 §5.1 suggestions are informational; every next purchase still requires confirmation. */
export function residualBalanceSuggestion(
  unlockedSku: string | undefined,
  balance: number,
  locale: "vi" | "en",
  findProduct: (sku: string) => LaCatalogItem | undefined = findLaProduct,
) {
  const purchased = unlockedSku ? findProduct(unlockedSku) : undefined;
  let key: "residualPalaceToday" | "residualToday" | "residualTwoDays" | "residualTopicPalace";
  let skus: string[];
  if (purchased?.category === "palace") {
    key = "residualPalaceToday";
    skus = ["ZIWEI-PALACE-LIFE-P0", "ZIWEI-TODAY-P0"];
  } else if (unlockedSku === "ZIWEI-NATAL-EXCERPT-P0") {
    key = "residualToday";
    skus = ["ZIWEI-TODAY-P0"];
  } else if (unlockedSku === "ZIWEI-IDENTITY-P0") {
    key = "residualTwoDays";
    skus = ["ZIWEI-TODAY-P0", "ZIWEI-TODAY-P0"];
  } else if (purchased?.category === "topic") {
    key = "residualTopicPalace";
    skus = [unlockedSku === "ZIWEI-CAREER-P0" ? "ZIWEI-RELATIONSHIP-P0" : "ZIWEI-CAREER-P0", "ZIWEI-PALACE-LIFE-P0"];
  } else return null;
  const products = skus.map(findProduct);
  if (products.some((product) => !product || !product.locales.includes(locale))) return null;
  const items = products as LaCatalogItem[];
  const cost = items.reduce((sum, product) => sum + product.priceLa, 0);
  if (cost > balance) return null;
  return { key, cost, reserved: items.some((product) => product.availability !== "active") };
}
