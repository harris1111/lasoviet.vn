import type { CSSProperties } from "react";
import { useTranslations } from "next-intl";

import { localizedPath } from "../homepage/homepage-utilities";
import { HomepageV3GoWizard } from "./homepage-v3-go-wizard";
import { HOMEPAGE_V3_IMAGE_ROOT, LA_PACKS } from "./homepage-v3-data";

type Locale = "en" | "vi";

export function HomepageV3Story() {
  const t = useTranslations("homepage-v3.story");
  return (
    <div className="hv3-container hv3-art-container">
      <div className="hv3-story-panel" data-reveal>
        <picture className="hv3-story-art">
          <source media="(max-width: 699px)" srcSet={`${HOMEPAGE_V3_IMAGE_ROOT}/lsv-story-dusk-mobile.webp`} />
          { }
          <img
            src={`${HOMEPAGE_V3_IMAGE_ROOT}/lsv-story-dusk.webp`}
            srcSet={`${HOMEPAGE_V3_IMAGE_ROOT}/lsv-story-dusk-768.webp 768w, ${HOMEPAGE_V3_IMAGE_ROOT}/lsv-story-dusk.webp 1536w`}
            sizes="(max-width: 1024px) 100vw, 800px"
            alt=""
            width={1536}
            height={1024}
            loading="lazy"
            decoding="async"
          />
        </picture>
        <div className="hv3-story-copy">
          <h2 className="hv3-h2">{t("title")}</h2>
          <p className="hv3-story-body">{t("body")}</p>
          <div className="hv3-questions">
            <p>{t("q1")}</p>
            <p>{t("q2")}</p>
            <p className="hv3-q-accent">{t("q3")}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

const TICKER_A = [
  { key: "a1", href: "#nhu-cau" },
  { key: "a2", href: "#nhu-cau" },
  { key: "a3", href: "#la-so-mau" },
  { key: "a4", href: "#nhu-cau" },
] as const;
const TICKER_B = [
  { key: "b1", href: "#la-so-mau" },
  { key: "b2", href: "#la-so-mau" },
  { key: "b3", href: "#la-so-mau" },
  { key: "b4", href: "#nhu-cau" },
] as const;

export function HomepageV3Ticker() {
  const t = useTranslations("homepage-v3.ticker");
  const lane = (items: ReadonlyArray<{ key: string; href: string }>, reverse: boolean) => (
    <div className={reverse ? "hv3-ticker hv3-ticker-reverse" : "hv3-ticker"}>
      <div className="hv3-ticker-group">
        {items.map((item) => (
          <a key={item.key} href={item.href}>{t(item.key)} ↗</a>
        ))}
      </div>
      <div className="hv3-ticker-group" aria-hidden="true">
        {items.map((item) => (
          <span key={item.key}>{t(item.key)} ↗</span>
        ))}
      </div>
    </div>
  );
  return (
    <div aria-label={t("label")} role="region" className="hv3-ticker-region">
      {lane(TICKER_A, false)}
      {lane(TICKER_B, true)}
    </div>
  );
}

export function HomepageV3Usp() {
  const t = useTranslations("homepage-v3.usp");
  const icon = (name: string, size: number) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={`${HOMEPAGE_V3_IMAGE_ROOT}/${name}`} alt="" width={size} height={size} loading="lazy" className="hv3-usp-icon" />
  );
  return (
    <div className="hv3-container">
      <div className="hv3-usp-head">
        <h2 className="hv3-h2 hv3-h2-xl">{t("title")}</h2>
        <p className="hv3-usp-lead">{t("lead")}</p>
      </div>
      <div className="hv3-usp-grid" role="region" aria-label={t("title")}>
        <article className="hv3-usp-card hv3-usp-art hv3-usp-dark" aria-labelledby="hv3-usp-n1-title" data-reveal style={{ "--i": 0 } as CSSProperties}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`${HOMEPAGE_V3_IMAGE_ROOT}/lsv-usp-tang-thu.webp`}
            srcSet={`${HOMEPAGE_V3_IMAGE_ROOT}/lsv-usp-tang-thu-768.webp 768w, ${HOMEPAGE_V3_IMAGE_ROOT}/lsv-usp-tang-thu.webp 1536w`}
            sizes="(max-width: 768px) 100vw, 500px"
            alt=""
            width={1536}
            height={1024}
            loading="lazy"
            decoding="async"
            className="hv3-usp-photo"
          />
          <div className="hv3-usp-scrim" />
          <div className="hv3-usp-body">
            {icon("lsv-usp-archive-icon.svg", 54)}
            <h3 id="hv3-usp-n1-title">{t("n1.title")}</h3>
            <p>{t("n1.body")}</p>
          </div>
        </article>
        <article className="hv3-usp-card hv3-usp-art hv3-usp-paper" aria-labelledby="hv3-usp-n2-title" data-reveal style={{ "--i": 1 } as CSSProperties}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`${HOMEPAGE_V3_IMAGE_ROOT}/lsv-usp-ca-nhan.webp`}
            srcSet={`${HOMEPAGE_V3_IMAGE_ROOT}/lsv-usp-ca-nhan-768.webp 768w, ${HOMEPAGE_V3_IMAGE_ROOT}/lsv-usp-ca-nhan.webp 1536w`}
            sizes="(max-width: 768px) 100vw, 500px"
            alt=""
            width={1536}
            height={1024}
            loading="lazy"
            decoding="async"
            className="hv3-usp-photo"
          />
          <div className="hv3-usp-scrim" />
          <div className="hv3-usp-body">
            {icon("lsv-usp-personal-icon.svg", 54)}
            <h3 id="hv3-usp-n2-title">{t("n2.title")}</h3>
            <p>{t("n2.body")}</p>
          </div>
        </article>
        <article className="hv3-usp-card hv3-usp-ink" aria-labelledby="hv3-usp-n3-title" data-reveal style={{ "--i": 2 } as CSSProperties}>
          {icon("lsv-usp-links-icon.svg", 62)}
          <h3 id="hv3-usp-n3-title">{t("n3.title")}</h3>
          <p>{t("n3.body")}</p>
          <a href="#la-so-mau" className="hv3-link">{t("n3.link")}</a>
        </article>
        <article className="hv3-usp-card hv3-usp-son" aria-labelledby="hv3-usp-n4-title" data-reveal style={{ "--i": 3 } as CSSProperties}>
          {icon("lsv-usp-depth-icon.svg", 62)}
          <h3 id="hv3-usp-n4-title">{t("n4.title")}</h3>
          <p>{t("n4.body")}</p>
        </article>
      </div>
    </div>
  );
}

/** Prices stay off the homepage by default (FD-069); pass `showPacks` only after the founder lifts that rule. */
export function HomepageV3Value({ locale, showPacks = false }: { locale: Locale; showPacks?: boolean }) {
  const t = useTranslations("homepage-v3.value");
  const format = (n: number) => n.toLocaleString(locale === "vi" ? "vi-VN" : "en-US");
  const steps = ["s1", "s2", "s3"] as const;
  return (
    <div className="hv3-container">
      <div className="hv3-head">
        <h2 className="hv3-h2">{t("title")}</h2>
        <p className="hv3-lead">{t("lead")}</p>
      </div>
      <ol className="hv3-steps">
        {steps.map((key, index) => (
          <li key={key} data-step={index + 1}>
            <span aria-hidden="true" className="hv3-step-dot" />
            <h3 className="hv3-h3">{t(`${key}.title`)}</h3>
            <p>{t(`${key}.body`)}</p>
          </li>
        ))}
      </ol>
      {showPacks ? (
        <div className="hv3-packs">
          <div className="hv3-packs-head">
            <h3 className="hv3-h3">{t("packsTitle")}</h3>
            <p>{t("packsNote")}</p>
          </div>
          <div className="hv3-pack-row">
            {LA_PACKS.map((pack) => (
              <div key={pack.id} className="hv3-pack">
                <span className="hv3-subtle">{pack.name}</span>
                <span className="hv3-pack-la">{format(pack.base + pack.bonus)} Lá</span>
                <span className="hv3-accent hv3-strong">{format(pack.vnd)} đ</span>
                {pack.bonus ? <span className="hv3-muted">{t("packBonus", { base: format(pack.base), bonus: format(pack.bonus) })}</span> : null}
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function HomepageV3About({ locale }: { locale: Locale }) {
  const t = useTranslations("homepage-v3.about");
  return (
    <>
      <div className="hv3-container hv3-art-container">
        <div className="hv3-about-panel" data-reveal>
          <picture className="hv3-about-art">
            <source media="(max-width: 699px)" srcSet={`${HOMEPAGE_V3_IMAGE_ROOT}/lsv-archive-light-mobile.webp`} />
            { }
            <img
              src={`${HOMEPAGE_V3_IMAGE_ROOT}/lsv-archive-light.webp`}
              srcSet={`${HOMEPAGE_V3_IMAGE_ROOT}/lsv-archive-light-768.webp 768w, ${HOMEPAGE_V3_IMAGE_ROOT}/lsv-archive-light.webp 1536w`}
              sizes="(max-width: 1024px) 100vw, 800px"
              alt=""
              width={1536}
              height={1024}
              loading="lazy"
              decoding="async"
            />
          </picture>
          <div className="hv3-about-body">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`${HOMEPAGE_V3_IMAGE_ROOT}/lsv-v02-seal-geometry.svg`} alt="" width={56} height={56} loading="lazy" className="hv3-about-seal" />
            <h2 className="hv3-h2 hv3-h2-sm">{t("title")}</h2>
            <p>{t("body")}</p>
            <a href={localizedPath(locale, "/ve-la-so-viet")} className="hv3-link">{t("link")}</a>
          </div>
        </div>
      </div>
      <div id="cta-cuoi" className="hv3-final-cta">
        <picture className="hv3-final-cta-bg">
          <source media="(max-width: 767px)" srcSet={`${HOMEPAGE_V3_IMAGE_ROOT}/lsv-h04-cta-mobile.webp`} />
          { }
          <img src={`${HOMEPAGE_V3_IMAGE_ROOT}/lsv-h04-cta.webp`} alt="" width={2048} height={768} loading="lazy" decoding="async" />
        </picture>
        <div className="hv3-final-cta-inner">
          <p>{t("ctaTitle")}</p>
          <HomepageV3GoWizard className="hv3-btn hv3-btn-lg">{t("cta")}</HomepageV3GoWizard>
        </div>
      </div>
    </>
  );
}
