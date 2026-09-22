"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { localizedPath } from "./homepage-utilities";

type HomepageTopicChipsProps = {
  locale: "en" | "vi";
};

export function HomepageTopicChips({ locale }: HomepageTopicChipsProps) {
  const t = useTranslations("common");

  const row1 = [
    t("home.topicChips.row1.0"),
    t("home.topicChips.row1.1"),
    t("home.topicChips.row1.2"),
    t("home.topicChips.row1.3"),
    t("home.topicChips.row1.4"),
    t("home.topicChips.row1.5"),
    t("home.topicChips.row1.6"),
    t("home.topicChips.row1.7"),
    t("home.topicChips.row1.8"),
    t("home.topicChips.row1.9"),
    t("home.topicChips.row1.10"),
    t("home.topicChips.row1.11"),
  ];

  const row2 = [
    t("home.topicChips.row2.0"),
    t("home.topicChips.row2.1"),
    t("home.topicChips.row2.2"),
    t("home.topicChips.row2.3"),
    t("home.topicChips.row2.4"),
    t("home.topicChips.row2.5"),
    t("home.topicChips.row2.6"),
    t("home.topicChips.row2.7"),
    t("home.topicChips.row2.8"),
  ];

  const alsoHave = [
    { label: t("home.topicChips.alsoHaveItems.0.label"), href: "/bat-tu" },
    { label: t("home.topicChips.alsoHaveItems.1.label"), href: "/chiem-tinh" },
    { label: t("home.topicChips.alsoHaveItems.2.label"), href: "/than-so-hoc" },
    { label: t("home.topicChips.alsoHaveItems.3.label"), href: "/kinh-dich" },
  ];

  function handleScrollToHeroForm() {
    const form = document.getElementById("hero-form");
    if (form) {
      form.scrollIntoView({ behavior: "smooth", block: "center" });
      const firstInput = form.querySelector<HTMLElement>("input, select, button");
      firstInput?.focus();
    }
  }

  return (
    <div className="container home-topic-chips-wrap">
      <div className="section-heading text-center">
        <p className="eyebrow">{t("home.topicChips.eyebrow")}</p>
        <h2>{t("home.topicChips.title")}</h2>
        <p className="section-lead">{t("home.topicChips.lead")}</p>
      </div>

      <div className="topic-chips-viewport" aria-label={t("home.topicChips.title")}>
        <div className="topic-chips-row topic-chips-row-forward">
          {row1.map((item, index) => (
            <button
              key={`row1-${index}`}
              type="button"
              className="topic-chip-pill"
              onClick={handleScrollToHeroForm}
              data-chip-name={item}
            >
              <span className="topic-chip-dot" aria-hidden="true" />
              <span>{item}</span>
            </button>
          ))}
        </div>

        <div className="topic-chips-row topic-chips-row-reverse">
          {row2.map((item, index) => (
            <button
              key={`row2-${index}`}
              type="button"
              className="topic-chip-pill"
              onClick={handleScrollToHeroForm}
              data-chip-name={item}
            >
              <span className="topic-chip-dot topic-chip-dot-alt" aria-hidden="true" />
              <span>{item}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="also-have-row">
        <span className="also-have-label">{t("home.topicChips.alsoHave")}:</span>
        <div className="also-have-list">
          {alsoHave.map((item) => (
            <Link
              key={item.href}
              href={localizedPath(locale, item.href)}
              className="also-have-chip"
            >
              {item.label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
