import type { Metadata } from "next";

import { SiteFooter } from "../../../components/site-footer";
import { SiteHeader } from "../../../components/site-header";
import { HomepageV3ConcernProvider } from "../../../features/homepage-v3/homepage-v3-concern-context";
import { TroiNamAbout } from "../../../features/troi-nam/troi-nam-about";
import { troiNamAsset } from "../../../features/troi-nam/troi-nam-assets";
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

// O01 — generated specifically as the social share image for this route.
const shareImage = troiNamAsset("O01");

// Preview only. The live homepage stays at `/` until the Plan 5 switchover.
// `metadataBase` is scoped to this route's own metadata export — it only
// resolves the relative OG/Twitter image URLs below into absolute ones
// against the canonical domain (FD-057); it does not touch the root layout
// or any other route's metadata.
export const metadata: Metadata = {
  title: "Trời Nam — bản xem trước",
  robots: { index: false, follow: false },
  metadataBase: new URL("https://lasoviet.net"),
  openGraph: {
    title: "Trời Nam — bản xem trước",
    images: [{ url: shareImage.src, width: shareImage.width, height: shareImage.height }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Trời Nam — bản xem trước",
    images: [shareImage.src],
  },
};

export default async function Page({ params }: PageProps) {
  const { locale } = await params;

  return (
    <div className="tn">
      <SiteHeader locale={locale} currentPath={locale === "en" ? "/en/troi-nam" : "/troi-nam"} />
      {/*
        Page-scoped only (2026-10-01 audit F2): the shared `/` homepage mounts no provider,
        so useHomepageV3Concern() there stays null and keeps its prior behavior exactly.
        This wraps a server-rendered subtree in a client provider — standard RSC composition,
        not a client-ification of the page; everything below remains server-rendered content
        passed through as `children`.
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
      </HomepageV3ConcernProvider>
      <SiteFooter locale={locale} />
    </div>
  );
}
