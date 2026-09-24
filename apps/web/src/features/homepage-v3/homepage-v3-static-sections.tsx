import { useTranslations } from "next-intl";

import { localizedPath } from "../homepage/homepage-utilities";
import { HomepageV3GoWizard } from "./homepage-v3-go-wizard";
import { HOMEPAGE_V3_IMAGE_ROOT, LA_PACKS } from "./homepage-v3-data";

type Locale = "en" | "vi";

export function HomepageV3Story() {
  const t = useTranslations("homepage-v3.story");
  return (
    <div className="hv3-container hv3-story">
      <div className="hv3-story-copy">
        <h2 className="hv3-h2">{t("title")}</h2>
        <p className="hv3-lead">{t("body")}</p>
      </div>
      <div className="hv3-questions">
        <p>{t("q1")}</p>
        <p>{t("q2")}</p>
        <p className="hv3-accent">{t("q3")}</p>
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
  return (
    <div className="hv3-container">
      <div className="hv3-head">
        <h2 className="hv3-h2">{t("title")}</h2>
        <p className="hv3-lead">{t("lead")}</p>
      </div>
      <div className="hv3-usp-list">
        <div className="hv3-usp-row">
          <div className="hv3-usp-copy">
            <p className="hv3-mono-num">01</p>
            <h3 className="hv3-h3">{t("n1.title")}</h3>
            <p>{t("n1.body")}</p>
            <a href="#la-so-mau" className="hv3-link">{t("n1.link")}</a>
          </div>
          <svg aria-hidden="true" focusable="false" viewBox="0 0 300 300" className="hv3-usp-diagram">
            <rect x="1" y="1" width="298" height="298" fill="none" stroke="#5A4A33" />
            <path d="M75 0V300M150 0V75M150 225V300M225 0V300M0 75H300M0 150H75M225 150H300M0 225H300" stroke="#3A3227" fill="none" />
            <rect x="75" y="75" width="150" height="150" fill="none" stroke="#5A4A33" />
            <path d="M37 262L112 37L262 187Z" fill="rgba(206,91,69,.1)" stroke="#CE5B45" strokeWidth="2" />
            <path d="M37 262L262 37" stroke="#C9A44D" strokeWidth="2" strokeDasharray="6 5" />
            <circle cx="37" cy="262" r="7" fill="#CE5B45" />
            <circle cx="112" cy="37" r="7" fill="#CE5B45" />
            <circle cx="262" cy="187" r="7" fill="#CE5B45" />
            <circle cx="262" cy="37" r="7" fill="#C9A44D" />
          </svg>
        </div>
        <div className="hv3-usp-row hv3-usp-row-reverse">
          <div aria-hidden="true" className="hv3-usp-card">
            <span className="hv3-usp-card-title">{t("cardTitle")}</span>
            <span className="hv3-bar" style={{ width: "92%" }} />
            <span className="hv3-bar" style={{ width: "78%" }} />
            <span className="hv3-bar" style={{ width: "84%" }} />
            <span className="hv3-usp-card-foot">
              <span><i />{t("cardPalace")}</span>
              <span className="hv3-usp-card-tag">{t("cardBasis")}</span>
            </span>
          </div>
          <div className="hv3-usp-copy">
            <p className="hv3-mono-num">02</p>
            <h3 className="hv3-h3">{t("n2.title")}</h3>
            <p>{t("n2.body")}</p>
          </div>
        </div>
        <div className="hv3-usp-row">
          <div className="hv3-usp-copy">
            <p className="hv3-mono-num">03</p>
            <h3 className="hv3-h3">{t("n3.title")}</h3>
            <p>{t("n3.body")}</p>
          </div>
          <div aria-hidden="true" className="hv3-usp-steps">
            <div><b>✓</b><span>{t("step1")}</span></div>
            <div><b>✓</b><span>{t("step2")}</span></div>
            <div className="hv3-usp-step-open"><b /><span>{t("step3")}</span><em>{t("step3tag")}</em></div>
          </div>
        </div>
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
      <div className="hv3-container hv3-about">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`${HOMEPAGE_V3_IMAGE_ROOT}/lsv-v02-seal-geometry.svg`} alt="" width={72} height={72} loading="lazy" />
        <div className="hv3-about-copy">
          <h2 className="hv3-h2 hv3-h2-sm">{t("title")}</h2>
          <p>{t("body")}</p>
          <a href={localizedPath(locale, "/ve-la-so-viet")} className="hv3-link">{t("link")}</a>
        </div>
      </div>
      <div id="cta-cuoi" className="hv3-final-cta">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`${HOMEPAGE_V3_IMAGE_ROOT}/lsv-h04-cta.webp`} alt="" width={2048} height={768} loading="lazy" className="hv3-final-cta-bg" />
        <div className="hv3-final-cta-inner">
          <p>{t("ctaTitle")}</p>
          <HomepageV3GoWizard className="hv3-btn hv3-btn-lg">{t("cta")}</HomepageV3GoWizard>
        </div>
      </div>
    </>
  );
}
