import { useTranslations } from "next-intl";

export function HomepageEvidence() {
  const t = useTranslations("common");

  return (
    <div className="container evidence">
      <div className="section-intro">
        <p className="eyebrow">{t("home.evidence.eyebrow")}</p>
        <h2>{t("home.evidence.title")}</h2>
        <p>{t("home.evidence.copy")}</p>
      </div>
      <article className="evidence-card">
        <h3>{t("home.evidence.claim")}</h3>
        <details open>
          <summary>{t("home.evidence.action")}</summary>
          <dl className="evidence-list">
            <dt>{t("home.evidence.source")}</dt>
            <dd>{t("home.evidence.sourceCopy")}</dd>
            <dt>{t("home.evidence.confidence")}</dt>
            <dd>{t("home.evidence.confidenceCopy")}</dd>
            <dt>{t("home.evidence.observe")}</dt>
            <dd>{t("home.evidence.observeCopy")}</dd>
          </dl>
        </details>
      </article>
    </div>
  );
}
