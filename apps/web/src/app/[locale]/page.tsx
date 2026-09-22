import { routeRegistry } from "@lasoviet/config";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { SiteFooter } from "../../components/site-footer";
import { SiteHeader } from "../../components/site-header";
import { loadPublicContentRepository } from "../../features/content/public-content-repository";
import { HomepageHero } from "../../features/homepage/homepage-hero";
import { HomepageTopicChips } from "../../features/homepage/homepage-topic-chips";
import { HomepageComparison } from "../../features/homepage/homepage-comparison";
import { HomepageEvidence } from "../../features/homepage/homepage-evidence";
import { HomepageCapabilityMatrix } from "../../features/homepage/homepage-capability-matrix";
import { HomepageProcess } from "../../features/homepage/homepage-process";
import { HomepageKnowledge } from "../../features/homepage/homepage-knowledge";
import { HomepageFaq } from "../../features/homepage/homepage-faq";
import { HomepageSupport } from "../../features/homepage/homepage-support";
import { HomepageFinalCta } from "../../features/homepage/homepage-final-cta";
import { buildPublicMetadata } from "../../seo/public-metadata";

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
  const t = await getTranslations("common");
  const referenceYear = new Date().getFullYear();

  return (
    <div className="home">
      <SiteHeader locale={locale} />
      <main aria-label={t("app.name")}>
        <section className="hero" data-home-block="hero" id="hero-section">
          <HomepageHero locale={locale} referenceYear={referenceYear} />
        </section>
        <section className="section section-topic-chips" data-home-block="topic-chips" id="dich-vu">
          <HomepageTopicChips locale={locale} />
        </section>
        <section className="section section-comparison" data-home-block="comparison" id="he-quy-chieu">
          <HomepageComparison />
        </section>
        <section className="section section-evidence" data-home-block="evidence" id="can-cu">
          <HomepageEvidence locale={locale} />
        </section>
        <section className="section section-capability" data-home-block="capability-matrix" id="luan-giai">
          <HomepageCapabilityMatrix />
        </section>
        <section className="section section-deep section-process" data-home-block="process" id="phuong-phap">
          <HomepageProcess />
        </section>
        <section className="section section-deep section-knowledge" data-home-block="knowledge" id="kien-thuc">
          <HomepageKnowledge locale={locale} />
        </section>
        <section className="section section-faq" data-home-block="faq" id="faq">
          <HomepageFaq />
        </section>
        <section className="container home-support-section" data-home-block="support">
          <HomepageSupport />
        </section>
        <section className="cta" data-home-block="final-cta">
          <HomepageFinalCta locale={locale} />
        </section>
      </main>
      <SiteFooter locale={locale} />
    </div>
  );
}
