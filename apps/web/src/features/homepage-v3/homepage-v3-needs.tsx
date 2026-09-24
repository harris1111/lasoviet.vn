"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { localizedPath } from "../homepage/homepage-utilities";
import { HomepageV3GoWizard } from "./homepage-v3-go-wizard";
import { DISCIPLINES, HOMEPAGE_V3_IMAGE_ROOT, NEEDS } from "./homepage-v3-data";

export function HomepageV3Needs({ locale }: { locale: "en" | "vi" }) {
  const t = useTranslations("homepage-v3.needs");
  const [active, setActive] = useState(0);
  const need = NEEDS[active] ?? NEEDS[0];
  const chipKeys = Array.from({ length: need.chips }, (_, i) => `c${i + 1}`);
  const secondaryHref = "secondaryHref" in need ? need.secondaryHref : undefined;
  const directHref = "href" in need ? need.href : undefined;

  return (
    <div className="hv3-container">
      <div className="hv3-head">
        <h2 className="hv3-h2">{t("title")}</h2>
        <p className="hv3-lead">{t("lead")}</p>
      </div>

      <div className="hv3-needs-body">
        <div role="group" aria-label={t("groupLabel")} className="hv3-need-list">
          {NEEDS.map((item, index) => (
            <button key={item.id} type="button" className="hv3-need" aria-pressed={active === index} onClick={() => setActive(index)}>
              <span className="hv3-need-icon">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`${HOMEPAGE_V3_IMAGE_ROOT}/${item.icon}`} alt="" width={34} height={34} />
              </span>
              <span className="hv3-need-text">
                <span className="hv3-need-title">{t(`items.${item.id}.title`)}</span>
                <span className="hv3-need-question">{t(`items.${item.id}.question`)}</span>
              </span>
            </button>
          ))}
        </div>

        <div className="hv3-need-detail" aria-live="polite">
          <p className="hv3-need-path">{t(`items.${need.id}.path`)}</p>
          <div className="hv3-chips">
            {chipKeys.map((key) => (
              <span key={key}>{t(`items.${need.id}.${key}`)}</span>
            ))}
          </div>
          <div className="hv3-need-actions">
            {directHref ? (
              <a href={localizedPath(locale, directHref)} className="hv3-btn">{t(`items.${need.id}.cta`)}</a>
            ) : (
              <HomepageV3GoWizard className="hv3-btn">{t(`items.${need.id}.cta`)}</HomepageV3GoWizard>
            )}
            {secondaryHref ? (
              <a href={localizedPath(locale, secondaryHref)} className="hv3-link">{t(`items.${need.id}.secondary`)} →</a>
            ) : null}
          </div>
        </div>
      </div>

      <div id="bo-mon" className="hv3-lens-head">
        <h3 className="hv3-h3">{t("lensTitle")}</h3>
        <p className="hv3-lead">{t("lensLead")}</p>
      </div>
      <div className="hv3-disciplines">
        <a href={localizedPath(locale, "/tu-vi")} className="hv3-disc-flagship">
          <span className="hv3-disc-flagship-text">
            <span aria-hidden="true" className="hv3-mask hv3-mask-accent" style={{ maskImage: `url(${HOMEPAGE_V3_IMAGE_ROOT}/lsv-i-tu-vi.svg)`, WebkitMaskImage: `url(${HOMEPAGE_V3_IMAGE_ROOT}/lsv-i-tu-vi.svg)` }} />
            <span className="hv3-disc-name hv3-disc-name-lg">{t("disciplines.tuvi.name")}</span>
            <span className="hv3-muted">{t("disciplines.tuvi.desc")}</span>
          </span>
          <span className="hv3-btn">{t("disciplines.tuvi.cta")}</span>
        </a>
        {DISCIPLINES.map((item) => (
          <a key={item.id} href={localizedPath(locale, item.href)} className="hv3-disc" data-tone={item.tone}>
            <span aria-hidden="true" className="hv3-mask" style={{ maskImage: `url(${HOMEPAGE_V3_IMAGE_ROOT}/${item.icon})`, WebkitMaskImage: `url(${HOMEPAGE_V3_IMAGE_ROOT}/${item.icon})` }} />
            <span className="hv3-disc-name">{t(`disciplines.${item.id}.name`)}</span>
            <span className="hv3-muted">{t(`disciplines.${item.id}.desc`)}</span>
            <span className="hv3-disc-cta">{t(`disciplines.${item.id}.cta`)} →</span>
          </a>
        ))}
      </div>
    </div>
  );
}
