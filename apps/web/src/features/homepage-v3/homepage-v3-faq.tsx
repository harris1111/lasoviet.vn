"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";

import { localizedPath } from "../homepage/homepage-utilities";
import { FAQ_IDS } from "./homepage-v3-data";

export function HomepageV3Faq({ locale }: { locale: "en" | "vi" }) {
  const t = useTranslations("homepage-v3.faq");
  const [open, setOpen] = useState<Record<string, boolean>>({ q1: true });

  return (
    <div className="hv3-container hv3-faq-layout">
      <div className="hv3-faq-side">
        <h2 className="hv3-h2">{t("title")}</h2>
        <a href={localizedPath(locale, "/cau-hoi-thuong-gap")} className="hv3-link">{t("more")}</a>
      </div>
      <div className="hv3-faq-list">
        {FAQ_IDS.map((id) => {
          const isOpen = Boolean(open[id]);
          return (
            <div key={id} className="hv3-faq-item">
              <h3>
                <button
                  type="button"
                  aria-expanded={isOpen}
                  aria-controls={`hv3-faq-${id}`}
                  className="hv3-faq-q"
                  onClick={() => setOpen((current) => ({ ...current, [id]: !current[id] }))}
                >
                  <span>{t(`items.${id}.q`)}</span>
                  <span aria-hidden="true" className="hv3-faq-plus" data-open={isOpen}>+</span>
                </button>
              </h3>
              <p id={`hv3-faq-${id}`} className="hv3-faq-a" hidden={!isOpen}>
                {t(`items.${id}.a`)}
                {t.has(`items.${id}.linkLabel`) ? (
                  <>
                    {" "}
                    <Link href={localizedPath(locale, "/chinh-sach-bao-mat")}>{t(`items.${id}.linkLabel`)}</Link>
                  </>
                ) : null}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
