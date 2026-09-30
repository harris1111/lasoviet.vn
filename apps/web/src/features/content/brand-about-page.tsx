import { useTranslations } from "next-intl";

import { Icon } from "../../components/icon";
import { localizedPath } from "../homepage/homepage-utilities";

type BrandAboutPageProps = {
  locale: "en" | "vi";
};

const MISSION_IDS = ["m1", "m2", "m3"] as const;
const VALUE_IDS = ["v1", "v2", "v3", "v4", "v5"] as const;
const COMMITMENT_IDS = ["c1", "c2", "c3", "c4"] as const;

const DISCIPLINE_CARDS = [
  { id: "tuvi", href: "/tu-vi", tone: "gold" },
  { id: "batu", href: "/bat-tu", tone: "jade" },
  { id: "chiemtinh", href: "/chiem-tinh", tone: "mineral" },
  { id: "kinhdich", href: "/kinh-dich", tone: "bronze" },
  { id: "thansohoc", href: "/than-so-hoc", tone: "indigo" },
] as const;

export function BrandAboutPage({ locale }: BrandAboutPageProps) {
  const t = useTranslations("brand-about");

  return (
    <main className="about-root">
      <section className="about-hero about-section">
        <div className="container">
          <p className="about-eyebrow">{t("hero.eyebrow")}</p>
          <h1 className="about-hero-title">{t("hero.title")}</h1>
          <p className="about-hero-lead">{t("hero.lead")}</p>
        </div>
      </section>

      <section className="about-section">
        <div className="container">
          <p className="about-eyebrow">{t("mission.eyebrow")}</p>
          <div className="about-mission-grid">
            <div className="about-mission-list">
              {MISSION_IDS.map((id, index) => (
                <div className="about-mission-item" key={id}>
                  <span className="about-mission-index">{String(index + 1).padStart(2, "0")}</span>
                  <div>
                    <h3>{t(`mission.items.${id}.title`)}</h3>
                    <p>{t(`mission.items.${id}.body`)}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="about-vision-card">
              <p className="about-eyebrow">{t("vision.eyebrow")}</p>
              <blockquote>{t("vision.body")}</blockquote>
            </div>
          </div>
        </div>
      </section>

      <section className="about-section">
        <div className="container">
          <div className="about-head">
            <p className="about-eyebrow">{t("values.eyebrow")}</p>
            <h2>{t("values.title")}</h2>
          </div>
          <div className="about-values-grid">
            {VALUE_IDS.map((id, index) => (
              <article className="about-value-card" key={id}>
                <span className="about-value-number">{String(index + 1).padStart(2, "0")}</span>
                <h3>{t(`values.items.${id}.title`)}</h3>
                <p>{t(`values.items.${id}.body`)}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="about-section">
        <div className="container">
          <div className="about-head">
            <p className="about-eyebrow">{t("disciplines.eyebrow")}</p>
            <h2>{t("disciplines.title")}</h2>
            <p>{t("disciplines.lead")}</p>
          </div>
          <div className="about-disciplines-grid">
            {DISCIPLINE_CARDS.map((item) => (
              <a
                className="about-discipline-card"
                data-tone={item.tone}
                href={localizedPath(locale, item.href)}
                key={item.id}
              >
                <h3>{t(`disciplines.items.${item.id}.name`)}</h3>
                <p>{t(`disciplines.items.${item.id}.desc`)}</p>
                <span className="about-discipline-cta">{t(`disciplines.items.${item.id}.cta`)} →</span>
              </a>
            ))}
          </div>
        </div>
      </section>

      <section className="about-section">
        <div className="container">
          <div className="about-head">
            <p className="about-eyebrow">{t("commitments.eyebrow")}</p>
            <h2>{t("commitments.title")}</h2>
          </div>
          <div className="about-commitments-list">
            {COMMITMENT_IDS.map((id) => (
              <div className="about-commitment-item" key={id}>
                <h3>
                  <Icon name="shield-lock" />
                  {t(`commitments.items.${id}.title`)}
                </h3>
                <p>{t(`commitments.items.${id}.body`)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="about-section about-closing">
        <div className="container">
          <blockquote className="about-closing-quote">“{t("closing.quote")}”</blockquote>
          <p className="about-closing-cta-title">{t("closing.ctaTitle")}</p>
          <a className="about-btn" href={localizedPath(locale, "/tu-vi")}>
            {t("closing.cta")}
            <Icon name="arrow-right" />
          </a>
        </div>
      </section>
    </main>
  );
}
