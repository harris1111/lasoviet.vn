import { useTranslations } from "next-intl";

export function HomepageChatbotComparison() {
  const t = useTranslations("common");
  const points = ["point1", "point2", "point3", "point4"] as const;

  return (
    <div className="container chatbot-section">
      <div className="section-heading">
        <p className="eyebrow">{t("home.chatbotComparison.eyebrow")}</p>
        <h2>{t("home.chatbotComparison.title")}</h2>
      </div>
      <div className="comparison-grid">
        {points.map((key) => (
          <article className="comparison-card" key={key}>
            <h3>{t(`home.chatbotComparison.${key}.title`)}</h3>
            <p>{t(`home.chatbotComparison.${key}.copy`)}</p>
          </article>
        ))}
      </div>
    </div>
  );
}
