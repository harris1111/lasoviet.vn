import { useTranslations } from "next-intl";

export function HomepageFaq() {
  const t = useTranslations("common");
  const keys = ["ai", "time", "payment", "privacy"] as const;

  return (
    <div className="container faq">
      <div>
        <p className="eyebrow">{t("home.faq.eyebrow")}</p>
      </div>
      <div className="faq-list">
        {keys.map((key) => (
          <details key={key}>
            <summary>{t(`home.faq.${key}.question`)}</summary>
            <p>{t(`home.faq.${key}.answer`)}</p>
          </details>
        ))}
      </div>
    </div>
  );
}
