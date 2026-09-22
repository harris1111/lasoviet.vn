import { useTranslations } from "next-intl";

export function HomepageFaq() {
  const t = useTranslations("common");
  const keys = ["q1", "q2", "q3", "q4", "q5", "q6", "q7", "q8"] as const;

  return (
    <div className="container faq-section-wrap" id="faq">
      <div className="section-heading text-center">
        <p className="eyebrow">{t("home.faq.eyebrow")}</p>
        <h2>{t("home.faq.title")}</h2>
      </div>

      <div className="faq-accordion-list">
        {keys.map((key, index) => (
          <details
            key={key}
            className="faq-accordion-item"
            open={index === 0}
          >
            <summary className="faq-summary">
              <span className="faq-question-num">{String(index + 1).padStart(2, "0")}</span>
              <span className="faq-question-text">{t(`home.faq.${key}.question`)}</span>
              <span className="faq-toggle-icon" aria-hidden="true">+</span>
            </summary>
            <div className="faq-answer-drawer">
              <p>{t(`home.faq.${key}.answer`)}</p>
            </div>
          </details>
        ))}
      </div>
    </div>
  );
}
