"use client";

import { useTranslations } from "next-intl";

export function HomepageComparison() {
  const t = useTranslations("common");

  return (
    <div className="container comparison-block-wrap">
      <div className="section-heading text-center">
        <p className="eyebrow">{t("home.comparison.eyebrow")}</p>
        <h2>{t("home.comparison.title")}</h2>
        <p className="section-lead">{t("home.comparison.subtitle")}</p>
      </div>

      {/* Desktop 3-column view */}
      <div className="comparison-columns-desktop">
        {/* Card 1: La So Viet (Featured first) */}
        <article className="comp-card comp-card-featured" data-comp-target="lasoviet">
          <div className="comp-badge">{t("home.comparison.lasoviet.badge")}</div>
          <h3 className="comp-card-title">{t("home.comparison.lasoviet.title")}</h3>
          <p className="comp-card-sub">{t("home.comparison.lasoviet.subtitle")}</p>
          <ul className="comp-card-list">
            <li className="comp-item comp-item-positive">
              <span className="comp-mark" aria-hidden="true">✓</span>
              <span>{t("home.comparison.lasoviet.bullet1")}</span>
            </li>
            <li className="comp-item comp-item-positive">
              <span className="comp-mark" aria-hidden="true">✓</span>
              <span>{t("home.comparison.lasoviet.bullet2")}</span>
            </li>
            <li className="comp-item comp-item-positive">
              <span className="comp-mark" aria-hidden="true">✓</span>
              <span>{t("home.comparison.lasoviet.bullet3")}</span>
            </li>
          </ul>
        </article>

        {/* Card 2: Books / Self study */}
        <article className="comp-card" data-comp-target="self-study">
          <h3 className="comp-card-title">{t("home.comparison.selfStudy.title")}</h3>
          <p className="comp-card-sub">{t("home.comparison.selfStudy.subtitle")}</p>
          <ul className="comp-card-list">
            <li className="comp-item comp-item-negative">
              <span className="comp-mark" aria-hidden="true">✕</span>
              <span>{t("home.comparison.selfStudy.bullet1")}</span>
            </li>
            <li className="comp-item comp-item-negative">
              <span className="comp-mark" aria-hidden="true">✕</span>
              <span>{t("home.comparison.selfStudy.bullet2")}</span>
            </li>
            <li className="comp-item comp-item-negative">
              <span className="comp-mark" aria-hidden="true">✕</span>
              <span>{t("home.comparison.selfStudy.bullet3")}</span>
            </li>
          </ul>
        </article>

        {/* Card 3: AI Chat / Consultants */}
        <article className="comp-card" data-comp-target="ai-chat">
          <h3 className="comp-card-title">{t("home.comparison.aiChat.title")}</h3>
          <p className="comp-card-sub">{t("home.comparison.aiChat.subtitle")}</p>
          <ul className="comp-card-list">
            <li className="comp-item comp-item-negative">
              <span className="comp-mark" aria-hidden="true">✕</span>
              <span>{t("home.comparison.aiChat.bullet1")}</span>
            </li>
            <li className="comp-item comp-item-negative">
              <span className="comp-mark" aria-hidden="true">✕</span>
              <span>{t("home.comparison.aiChat.bullet2")}</span>
            </li>
            <li className="comp-item comp-item-negative">
              <span className="comp-mark" aria-hidden="true">✕</span>
              <span>{t("home.comparison.aiChat.bullet3")}</span>
            </li>
          </ul>
        </article>
      </div>

      {/* Mobile view: LSV card first, alternatives inside details */}
      <div className="comparison-columns-mobile">
        <article className="comp-card comp-card-featured" data-comp-target="lasoviet">
          <div className="comp-badge">{t("home.comparison.lasoviet.badge")}</div>
          <h3 className="comp-card-title">{t("home.comparison.lasoviet.title")}</h3>
          <p className="comp-card-sub">{t("home.comparison.lasoviet.subtitle")}</p>
          <ul className="comp-card-list">
            <li className="comp-item comp-item-positive">
              <span className="comp-mark" aria-hidden="true">✓</span>
              <span>{t("home.comparison.lasoviet.bullet1")}</span>
            </li>
            <li className="comp-item comp-item-positive">
              <span className="comp-mark" aria-hidden="true">✓</span>
              <span>{t("home.comparison.lasoviet.bullet2")}</span>
            </li>
            <li className="comp-item comp-item-positive">
              <span className="comp-mark" aria-hidden="true">✓</span>
              <span>{t("home.comparison.lasoviet.bullet3")}</span>
            </li>
          </ul>
        </article>

        <details className="comp-mobile-details">
          <summary className="comp-mobile-summary">
            <span>{t("home.comparison.mobileAccordionTitle")}</span>
            <span className="comp-summary-icon" aria-hidden="true">+</span>
          </summary>
          <div className="comp-mobile-drawer">
            <article className="comp-card" data-comp-target="self-study">
              <h3 className="comp-card-title">{t("home.comparison.selfStudy.title")}</h3>
              <p className="comp-card-sub">{t("home.comparison.selfStudy.subtitle")}</p>
              <ul className="comp-card-list">
                <li className="comp-item comp-item-negative">
                  <span className="comp-mark" aria-hidden="true">✕</span>
                  <span>{t("home.comparison.selfStudy.bullet1")}</span>
                </li>
                <li className="comp-item comp-item-negative">
                  <span className="comp-mark" aria-hidden="true">✕</span>
                  <span>{t("home.comparison.selfStudy.bullet2")}</span>
                </li>
                <li className="comp-item comp-item-negative">
                  <span className="comp-mark" aria-hidden="true">✕</span>
                  <span>{t("home.comparison.selfStudy.bullet3")}</span>
                </li>
              </ul>
            </article>

            <article className="comp-card" data-comp-target="ai-chat">
              <h3 className="comp-card-title">{t("home.comparison.aiChat.title")}</h3>
              <p className="comp-card-sub">{t("home.comparison.aiChat.subtitle")}</p>
              <ul className="comp-card-list">
                <li className="comp-item comp-item-negative">
                  <span className="comp-mark" aria-hidden="true">✕</span>
                  <span>{t("home.comparison.aiChat.bullet1")}</span>
                </li>
                <li className="comp-item comp-item-negative">
                  <span className="comp-mark" aria-hidden="true">✕</span>
                  <span>{t("home.comparison.aiChat.bullet2")}</span>
                </li>
                <li className="comp-item comp-item-negative">
                  <span className="comp-mark" aria-hidden="true">✕</span>
                  <span>{t("home.comparison.aiChat.bullet3")}</span>
                </li>
              </ul>
            </article>
          </div>
        </details>
      </div>
    </div>
  );
}
