import { routeRegistry } from "@lasoviet/config";
import type { Metadata } from "next";

import { SiteFooter } from "../../components/site-footer";
import { SiteHeader } from "../../components/site-header";
import { loadPublicContentRepository } from "../../features/content/public-content-repository";
import { HomepageV3ConcernProvider } from "../../features/homepage-v3/homepage-v3-concern-context";
import { buildPublicMetadata } from "../../seo/public-metadata";
import { TroiNamAbout } from "../../features/troi-nam/troi-nam-about";
import { TroiNamFaq } from "../../features/troi-nam/troi-nam-faq";
import { TroiNamValue } from "../../features/troi-nam/troi-nam-value";
import { TroiNamCompare } from "../../features/troi-nam/troi-nam-compare";
import { TroiNamExplore } from "../../features/troi-nam/troi-nam-explore";
import { TroiNamMotion } from "../../features/troi-nam/troi-nam-motion";
import { TroiNamHero } from "../../features/troi-nam/troi-nam-hero";
import { TroiNamNeeds } from "../../features/troi-nam/troi-nam-needs";
import { TroiNamStory } from "../../features/troi-nam/troi-nam-story";
import { TroiNamTestimonials } from "../../features/troi-nam/troi-nam-testimonials";
import { TroiNamTicker } from "../../features/troi-nam/troi-nam-ticker";
import { TroiNamUsp } from "../../features/troi-nam/troi-nam-usp";
import { TroiNamWorldStage } from "../../features/troi-nam/troi-nam-world-stage";

type PageProps = { params: Promise<{ locale: "en" | "vi" }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const route = routeRegistry.find((entry) => entry.id === "brand.home");
  if (!route) return { robots: { index: false, follow: false } };
  const content = loadPublicContentRepository(routeRegistry).get(route.id, locale);
  return buildPublicMetadata(route, content);
}

export default async function Page({ params }: PageProps) {
  const { locale } = await params;

  return (
    <div className="tn">
      <SiteHeader locale={locale} currentPath={locale === "en" ? "/en" : "/"} />
      {/*
        Page-scoped (2026-10-01 audit F2): wraps a server-rendered subtree in a
        client provider — standard RSC composition, not a client-ification of
        the page; everything below remains server-rendered content passed
        through as `children`.
      */}
      <HomepageV3ConcernProvider>
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
          <section className="tn-section" data-troi-nam-block="needs" id="dich-vu">
            <TroiNamNeeds locale={locale} />
          </section>
          <section className="tn-section" data-troi-nam-block="compare" id="so-sanh">
            <TroiNamCompare locale={locale} />
          </section>
          <section className="tn-section" data-troi-nam-block="testimonials">
            <TroiNamTestimonials />
          </section>
          <section className="tn-section" data-troi-nam-block="usp">
            <TroiNamUsp locale={locale} />
          </section>
          <section className="tn-section" data-troi-nam-block="value" id="gia-tri">
            <TroiNamValue locale={locale} />
          </section>
          <section className="tn-section" data-troi-nam-block="faq" id="faq">
            <div id="cau-hoi">
              <TroiNamFaq locale={locale} />
            </div>
          </section>
          <section className="tn-section" data-troi-nam-block="about">
            <TroiNamAbout locale={locale} />
          </section>
          <TroiNamMotion />
        </main>
      </HomepageV3ConcernProvider>
      <SiteFooter locale={locale} />
    </div>
  );
}
