import { routeRegistry } from "@lasoviet/config";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { SiteFooter } from "../../components/site-footer";
import { SiteHeader } from "../../components/site-header";
import { loadPublicContentRepository } from "../../features/content/public-content-repository";
import { HomepageV3Compare } from "../../features/homepage-v3/homepage-v3-compare";
import { HomepageV3Explore } from "../../features/homepage-v3/homepage-v3-explore";
import { HomepageV3Faq } from "../../features/homepage-v3/homepage-v3-faq";
import { HomepageV3Hero } from "../../features/homepage-v3/homepage-v3-hero";
import { HomepageV3Needs } from "../../features/homepage-v3/homepage-v3-needs";
import { HomepageV3Reveal } from "../../features/homepage-v3/homepage-v3-reveal";
import { HomepageV3Testimonials } from "../../features/homepage-v3/homepage-v3-testimonials-section";
import {
  HomepageV3About,
  HomepageV3Story,
  HomepageV3Ticker,
  HomepageV3Usp,
  HomepageV3Value,
} from "../../features/homepage-v3/homepage-v3-static-sections";
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
      <SiteHeader locale={locale} />
      <div className="hv3" data-light-ready>
        <HomepageV3Reveal />
        <main aria-label={t("app.name")}>
          <section className="hv3-section hv3-hero" data-home-block="hero" id="lap-la-so">
            <HomepageV3Hero locale={locale} />
          </section>
          <section className="hv3-section hv3-story-section" data-home-block="story">
            <HomepageV3Story />
          </section>
          <HomepageV3Ticker />
          <section className="hv3-section hv3-surface" data-home-block="explore" id="la-so-mau">
            <HomepageV3Explore locale={locale} />
          </section>
          <section className="hv3-section" data-home-block="needs" id="dich-vu">
            <div id="nhu-cau">
              <HomepageV3Needs locale={locale} />
            </div>
          </section>
          <section className="hv3-section hv3-ruled" data-home-block="comparison" id="so-sanh">
            <HomepageV3Compare />
          </section>
          <section className="hv3-section" data-home-block="testimonials" id="loi-nguoi-doc">
            <HomepageV3Testimonials />
          </section>
          <section className="hv3-section hv3-inverse hv3-usp" data-home-block="usp">
            <HomepageV3Usp />
          </section>
          <section className="hv3-section" data-home-block="value" id="gia-tri">
            <HomepageV3Value locale={locale} />
          </section>
          <section className="hv3-section hv3-ruled" data-home-block="faq" id="faq">
            <div id="cau-hoi">
              <HomepageV3Faq locale={locale} />
            </div>
          </section>
          <section className="hv3-section hv3-lacquer" data-home-block="about">
            <HomepageV3About locale={locale} />
          </section>
        </main>
      </div>
      <SiteFooter locale={locale} />
    </div>
  );
}
