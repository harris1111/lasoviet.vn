import type { Metadata } from "next";

import { SiteFooter } from "../../../components/site-footer";
import { SiteHeader } from "../../../components/site-header";
import { TroiNamExplore } from "../../../features/troi-nam/troi-nam-explore";
import { TroiNamHero } from "../../../features/troi-nam/troi-nam-hero";
import { TroiNamStory } from "../../../features/troi-nam/troi-nam-story";
import { TroiNamTicker } from "../../../features/troi-nam/troi-nam-ticker";

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
      <SiteHeader locale={locale} />
      <main>
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
      </main>
      <SiteFooter locale={locale} />
    </div>
  );
}
