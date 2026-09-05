import { routeRegistry } from "@lasoviet/config";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { SiteFooter } from "../../components/site-footer";
import { SiteHeader } from "../../components/site-header";
import { loadPublicContentRepository } from "../../features/content/public-content-repository";
import { HomepageCategoryComparison } from "../../features/homepage/homepage-category-comparison";
import { HomepageChatbotComparison } from "../../features/homepage/homepage-chatbot-comparison";
import { HomepageEvidence } from "../../features/homepage/homepage-evidence";
import { HomepageFaq } from "../../features/homepage/homepage-faq";
import { HomepageFinalCta } from "../../features/homepage/homepage-final-cta";
import { HomepageFreeValue } from "../../features/homepage/homepage-free-value";
import { HomepageHero } from "../../features/homepage/homepage-hero";
import { HomepageKnowledge } from "../../features/homepage/homepage-knowledge";
import { HomepageLenses } from "../../features/homepage/homepage-lenses";
import { HomepageMethod } from "../../features/homepage/homepage-method";
import { HomepageProblem } from "../../features/homepage/homepage-problem";
import { HomepageProcess } from "../../features/homepage/homepage-process";
import { HomepageTrustSpecs } from "../../features/homepage/homepage-trust-specs";
import { HomepageTrustStrip } from "../../features/homepage/homepage-trust-strip";
import { HomepageValueLadder } from "../../features/homepage/homepage-value-ladder";
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
  return (
    <div className="home">
      <div data-home-block="header"><SiteHeader locale={locale} /></div>
      <main aria-label={t("app.name")}>
        <section className="hero" data-home-block="hero"><HomepageHero locale={locale} /></section>
        <section data-home-block="trust-strip"><HomepageTrustStrip /></section>
        <section data-home-block="problem"><HomepageProblem /></section>
        <section data-home-block="lenses" id="he-quy-chieu"><HomepageLenses locale={locale} /></section>
        <section data-home-block="chatbot-comparison"><HomepageChatbotComparison /></section>
        <section data-home-block="category-comparison"><HomepageCategoryComparison /></section>
        <section data-home-block="about-method" id="phuong-phap"><HomepageMethod /></section>
        <section className="section section-deep" data-home-block="process"><HomepageProcess /></section>
        <section data-home-block="free-value"><HomepageFreeValue /></section>
        <section className="section" data-home-block="evidence" id="can-cu"><HomepageEvidence /></section>
        <section className="section image-section" data-home-block="value-ladder" id="luan-giai"><HomepageValueLadder locale={locale} /></section>
        <section data-home-block="trust-specs"><HomepageTrustSpecs /></section>
        <section className="section section-deep" data-home-block="knowledge" id="kien-thuc"><HomepageKnowledge locale={locale} /></section>
        <section className="section" data-home-block="faq"><HomepageFaq /></section>
        <section className="cta" data-home-block="final-cta"><HomepageFinalCta locale={locale} /></section>
      </main>
      <SiteFooter locale={locale} />
    </div>
  );
}
