import type { Metadata } from "next";

import { SiteFooter } from "../../../components/site-footer";
import { SiteHeader } from "../../../components/site-header";
import { TroiNamAbout } from "../../../features/troi-nam/troi-nam-about";
import { TroiNamFaq } from "../../../features/troi-nam/troi-nam-faq";
import { TroiNamValue } from "../../../features/troi-nam/troi-nam-value";
import { TroiNamCompare } from "../../../features/troi-nam/troi-nam-compare";
import { TroiNamExplore } from "../../../features/troi-nam/troi-nam-explore";
import { TroiNamHero } from "../../../features/troi-nam/troi-nam-hero";
import { TroiNamNeeds } from "../../../features/troi-nam/troi-nam-needs";
import { TroiNamStory } from "../../../features/troi-nam/troi-nam-story";
import { TroiNamTestimonials } from "../../../features/troi-nam/troi-nam-testimonials";
import { TroiNamTicker } from "../../../features/troi-nam/troi-nam-ticker";
import { TroiNamUsp } from "../../../features/troi-nam/troi-nam-usp";
import { TroiNamWorldStage } from "../../../features/troi-nam/troi-nam-world-stage";

type PageProps = { params: Promise<{ locale: "en" | "vi" }> };

// Preview only. The live homepage stays at `/` until the Plan 5 switchover.
export const metadata: Metadata = {
  title: "Trời Nam — bản xem trước",
  robots: { index: false, follow: false },
};

export default async function Page({ params }: PageProps) {
  const { locale } = await params;

  return (
    <div className="tn">
      <SiteHeader locale={locale} currentPath={locale === "en" ? "/en/troi-nam" : "/troi-nam"} />
      <main>
        <TroiNamWorldStage>
          <TroiNamHero locale={locale} />
          <section className="tn-section" data-troi-nam-block="story">
            <TroiNamStory />
          </section>
          <section className="tn-section" data-troi-nam-block="ticker">
            <TroiNamTicker />
          </section>
          <section className="tn-section" data-troi-nam-block="explore">
            <TroiNamExplore locale={locale} />
          </section>
        </TroiNamWorldStage>
        <section className="tn-section" data-troi-nam-block="needs">
          <TroiNamNeeds locale={locale} />
        </section>
        <section className="tn-section" data-troi-nam-block="compare">
          <TroiNamCompare locale={locale} />
        </section>
        <section className="tn-section" data-troi-nam-block="testimonials">
          <TroiNamTestimonials />
        </section>
        <section className="tn-section" data-troi-nam-block="usp">
          <TroiNamUsp />
        </section>
        <section className="tn-section" data-troi-nam-block="value">
          <TroiNamValue locale={locale} />
        </section>
        <section className="tn-section" data-troi-nam-block="faq">
          <TroiNamFaq locale={locale} />
        </section>
        <section className="tn-section" data-troi-nam-block="about">
          <TroiNamAbout locale={locale} />
        </section>
      </main>
      <SiteFooter locale={locale} />
    </div>
  );
}
