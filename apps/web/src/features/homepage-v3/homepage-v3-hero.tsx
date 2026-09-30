"use client";

import { HomepageV3HeroChart } from "./homepage-v3-hero-chart";
import { HomepageV3BirthForm, useHomepageV3BirthForm } from "./homepage-v3-birth-form";

type Locale = "en" | "vi";

export function HomepageV3Hero({ locale }: { locale: Locale }) {
  const state = useHomepageV3BirthForm(locale);

  return (
    <div className="hv3-hero-inner">
      <div className="hv3-hero-copy">
        <h1 className="hv3-h1">
          {state.t("h1a")}
          <br />
          <span className="hv3-accent">{state.t("h1b")}</span>
        </h1>
        <p className="hv3-sub">{state.t("sub")}</p>

        <HomepageV3BirthForm state={state} />
      </div>

      <HomepageV3HeroChart hero={state.hero} locale={locale} />
    </div>
  );
}
