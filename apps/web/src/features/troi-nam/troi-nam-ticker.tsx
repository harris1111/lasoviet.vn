import { useTranslations } from "next-intl";

const ITEMS = [
  { key: "a1", href: "#nhu-cau" },
  { key: "a2", href: "#nhu-cau" },
  { key: "a3", href: "#la-so-mau" },
  { key: "a4", href: "#nhu-cau" },
  { key: "b1", href: "#la-so-mau" },
  { key: "b2", href: "#la-so-mau" },
  { key: "b3", href: "#la-so-mau" },
  { key: "b4", href: "#nhu-cau" },
] as const;

export function TroiNamTicker() {
  const t = useTranslations("homepage-v3.ticker");
  return <nav className="tn-topic-ribbon" aria-label={t("label")}>
    {ITEMS.map(({ key, href }) => <a key={key} href={href}>{t(key)}</a>)}
  </nav>;
}
