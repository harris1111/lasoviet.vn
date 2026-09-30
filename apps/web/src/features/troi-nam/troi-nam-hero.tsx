"use client";

import { useTranslations } from "next-intl";

import {
  HomepageV3BirthForm,
  useHomepageV3BirthForm,
} from "../homepage-v3/homepage-v3-birth-form";
import { troiNamAsset } from "./troi-nam-assets";

const MOBILE = "(max-width: 879px)";

export function TroiNamHero({ locale }: { locale: "en" | "vi" }) {
  const t = useTranslations("troi-nam");
  const state = useHomepageV3BirthForm(locale);
  const desktop = troiNamAsset("L01");
  const mobile = troiNamAsset("L02");

  return (
    <section className="tn-hero" data-troi-nam-block="hero" id="lap-la-so">
      <picture className="tn-hero-media">
        <source media={MOBILE} srcSet={mobile.srcSet} sizes="100vw" />
        <img
          className="tn-hero-plate"
          src={desktop.src}
          srcSet={desktop.srcSet}
          sizes="100vw"
          width={desktop.width}
          height={desktop.height}
          alt={t("hero.plateAlt")}
          fetchPriority="high"
          decoding="async"
        />
      </picture>
      <div className="tn-hero-scrim" aria-hidden="true" />

      <div className="tn-hero-copy">
        <h1 className="tn-hero-title">
          <span>{t("hero.h1a")}</span>
          <span>{t("hero.h1b")}</span>
        </h1>
        <p className="tn-hero-sub">{t("hero.sub")}</p>
      </div>

      <div className="hv3 tn-hero-form">
        <HomepageV3BirthForm state={state} />
      </div>
    </section>
  );
}
