"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";

import { ArtifactImage } from "../../components/artifact-image";
import { imagePath, localizedPath } from "./homepage-utilities";

type HomepageFinalCtaProps = {
  locale: "en" | "vi";
};

export function HomepageFinalCta({ locale }: HomepageFinalCtaProps) {
  const t = useTranslations("common");

  function handleScrollToHeroForm() {
    const form = document.getElementById("hero-form");
    if (form) {
      form.scrollIntoView({ behavior: "smooth", block: "center" });
      const firstInput = form.querySelector<HTMLElement>("input, select, button");
      firstInput?.focus();
    }
  }

  return (
    <div className="cta-inner">
      <ArtifactImage
        alt=""
        className="cta-image"
        desktop={imagePath("nguong-mo-menh-thu-cta-background-lasoviet-desktop.webp")}
        mobile={imagePath("nguong-mo-menh-thu-cta-background-lasoviet-mobile.webp")}
      />
      <div className="container cta-content">
        <h2>{t("home.finalCta.title")}</h2>
        <p>{t("home.finalCta.copy")}</p>
        <div className="cta-actions">
          <button
            type="button"
            className="button button-pill"
            onClick={handleScrollToHeroForm}
          >
            {t("home.finalCta.ctaPrimary")}
          </button>
          <Link
            className="button button-secondary button-pill"
            href={localizedPath(locale, "/bao-cao-mau/tu-vi")}
          >
            {t("home.finalCta.ctaSecondary")}
          </Link>
        </div>
        <p className="cta-closing">{t("home.finalCta.closing")}</p>
      </div>
    </div>
  );
}
