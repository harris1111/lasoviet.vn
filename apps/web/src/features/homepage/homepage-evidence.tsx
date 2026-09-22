"use client";

import { useTranslations } from "next-intl";

type HomepageEvidenceProps = {
  locale?: "en" | "vi";
};

export function HomepageEvidence({ locale: _locale }: HomepageEvidenceProps) {
  const t = useTranslations("common");

  const cards = [
    {
      id: "chart-structure",
      badge: t("home.evidence.card1.badge"),
      title: t("home.evidence.card1.title"),
      desc: t("home.evidence.card1.desc"),
      meta: t("home.evidence.card1.meta"),
    },
    {
      id: "palace-relations",
      badge: t("home.evidence.card2.badge"),
      title: t("home.evidence.card2.title"),
      desc: t("home.evidence.card2.desc"),
      meta: t("home.evidence.card2.meta"),
    },
    {
      id: "evidence-source",
      badge: t("home.evidence.card3.badge"),
      title: t("home.evidence.card3.title"),
      desc: t("home.evidence.card3.desc"),
      meta: t("home.evidence.card3.meta"),
    },
    {
      id: "reading-progress",
      badge: t("home.evidence.card4.badge"),
      title: t("home.evidence.card4.title"),
      desc: t("home.evidence.card4.desc"),
      meta: t("home.evidence.card4.meta"),
    },
  ];

  function handleScrollToForm() {
    const form = document.getElementById("hero-form");
    if (form) {
      form.scrollIntoView({ behavior: "smooth", block: "center" });
      form.querySelector<HTMLElement>("input, select, button")?.focus();
    }
  }

  return (
    <div className="container evidence-carousel-wrap">
      <div className="section-heading text-center">
        <p className="eyebrow">{t("home.evidence.eyebrow")}</p>
        <h2>{t("home.evidence.title")}</h2>
        <p className="section-lead">{t("home.evidence.lead")}</p>
      </div>

      <div
        className="evidence-carousel"
        role="region"
        aria-label={t("home.evidence.carouselAriaLabel")}
        tabIndex={0}
      >
        {cards.map((card) => (
          <article className="evidence-slide-card" key={card.id}>
            <div className="evidence-card-badge">
              {card.badge}
            </div>
            <h3 className="evidence-card-title">
              {card.title}
            </h3>
            <p className="evidence-card-desc">
              {card.desc}
            </p>
            <div className="evidence-card-meta">
              <span className="evidence-meta-pill">
                {card.meta}
              </span>
            </div>
          </article>
        ))}
      </div>

      <div className="evidence-carousel-action text-center">
        <button
          type="button"
          className="button button-pill"
          onClick={handleScrollToForm}
        >
          {t("home.evidence.cta")}
        </button>
      </div>
    </div>
  );
}
