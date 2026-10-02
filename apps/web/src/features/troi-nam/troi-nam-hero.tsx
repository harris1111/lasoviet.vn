"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";

import {
  HomepageV3BirthForm,
  useHomepageV3BirthForm,
} from "../homepage-v3/homepage-v3-birth-form";
import { HomepageV3HeroChart } from "../homepage-v3/homepage-v3-hero-chart";
import { localizedPath } from "../homepage/homepage-utilities";
import { TroiNamThemePicture } from "./troi-nam-theme-art";
import { TroiNamLogoIntro } from "./troi-nam-logo-intro";
import { clampProgress, scenePhases } from "./troi-nam-motion-math";
import { createTroiNamProgress } from "./troi-nam-scroll-progress";

export function TroiNamHero({ locale }: { locale: "en" | "vi" }) {
  const t = useTranslations("troi-nam");
  const state = useHomepageV3BirthForm(locale);
  const sectionRef = useRef<HTMLElement>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [focusRequest, setFocusRequest] = useState(0);

  useEffect(() => {
    const root = sectionRef.current?.closest(".tn");
    const open = () => { setFormOpen(true); setFocusRequest((n) => n + 1); };
    const onHash = () => { if (window.location.hash === "#lap-la-so") open(); };
    const onHeaderClick = (event: Event) => {
      const click = event as MouseEvent;
      if (click.button !== 0 || click.metaKey || click.ctrlKey || click.shiftKey || click.altKey) return;
      const anchor = (click.target as Element | null)?.closest('a[href="#lap-la-so"]');
      if (anchor?.closest(".site-header")) open();
    };
    root?.addEventListener("click", onHeaderClick);
    root?.addEventListener("tn:open-form", open);
    window.addEventListener("hashchange", onHash);
    onHash();
    return () => {
      root?.removeEventListener("click", onHeaderClick);
      root?.removeEventListener("tn:open-form", open);
      window.removeEventListener("hashchange", onHash);
    };
  }, []);

  useEffect(() => {
    if (formOpen && focusRequest > 0) document.getElementById("hv3-day")?.focus({ preventScroll: true });
  }, [formOpen, focusRequest]);

  useEffect(() => {
    const section = sectionRef.current;
    const root = section?.closest<HTMLElement>(".tn");
    if (!root) return;

    // Two Hero mounts (StrictMode) would both call this synchronously; the second
    // throws on the first's still-live owner, so let that instance's effect cleanup
    // run first before this one creates its own.
    let controller: ReturnType<typeof createTroiNamProgress> = null;
    try {
      controller = createTroiNamProgress(root);
    } catch {
      return;
    }
    if (!controller) return;

    const unsubscribe = controller.subscribe((snapshot) => {
      if (!section) return;
      if (snapshot.reducedMotion || !snapshot.rangeValid) {
        section.style.setProperty("--tn-hero-dusk", "0");
        section.style.setProperty("--tn-hero-night", "0");
        return;
      }
      // Shared `snapshot.progress` now spans hero -> the Explore chart reaching
      // viewport centre (Phase 5's handoff point), much longer than the hero
      // section itself — re-derive a progress local to the hero's own height
      // so the crossfade actually finishes while the plate is still on
      // screen, instead of off-screen by the time it reaches dusk/night.
      const scrolledPast = snapshot.progress * (snapshot.range.end - snapshot.range.start);
      const heroHeight = section.offsetHeight || 1;
      const local = clampProgress(scrolledPast / heroHeight);
      const { dusk, night } = scenePhases(local);
      section.style.setProperty("--tn-hero-dusk", String(dusk));
      section.style.setProperty("--tn-hero-night", String(night));
    });

    return () => {
      unsubscribe();
      controller?.dispose();
    };
  }, []);

  return (
    <section className="tn-hero" data-troi-nam-block="hero" id="lap-la-so" ref={sectionRef}>
      <div className="tn-hero-media">
        <TroiNamThemePicture desktop="L01" mobile="L02" imageClassName="tn-hero-plate" alt={t("hero.plateAlt")} priority />
        {/* Desktop-only art direction for now — L03 has no phone crop yet, so the
            dusk crossfade is scoped to the >=880px layout (see CSS). Dark-only:
            no light-theme dusk plate exists yet (docs/qa/2026-10-02-light-theme-release.md). */}
        <TroiNamThemePicture desktop="L03" imageClassName="tn-hero-plate tn-hero-plate-dusk" darkOnly />
        {/* L04/L05 (Hạ Long, Milky Way): unlike L03 above, L05 has a phone crop,
            so the night plate crossfades on mobile too — see CSS for the <880px
            source swap. `lazy` since it's the last plate reached. Dark-only for
            the same reason as L03. */}
        <TroiNamThemePicture desktop="L04" mobile="L05" className="tn-hero-plate-night" imageClassName="tn-hero-plate" darkOnly lazy />
      </div>
      <div className="tn-hero-scrim" aria-hidden="true" />
      <div className="tn-hero-scrim-night" aria-hidden="true" />
      <TroiNamLogoIntro />

      <div className="tn-hero-content">
        <div className="tn-hero-left">
          <div className="tn-hero-copy">
            <h1 className="tn-hero-title">
              <span>{t("hero.h1a")}</span>
              <span>{t("hero.h1b")}</span>
            </h1>
            <p className="tn-hero-sub">{t("hero.sub")}</p>
            <noscript><style>{".tn .tn-hero-form[data-open] { display: block; } .tn .tn-hero-start { display: none; }"}</style>
              <a href={localizedPath(locale, "/tao-la-so/tu-vi")}>{t("hero.startCta")}</a>
            </noscript>
            <button type="button" className="tn-hero-start"
              aria-expanded={formOpen} aria-controls="tn-birth-form"
              onClick={() => { setFormOpen(true); setFocusRequest((n) => n + 1); }}>
              {t("hero.startCta")}
            </button>
            {/* Visible without filling in the form — the audit's strongest trust gap was
                marketing claims outrunning anything the visitor could actually see
                (2026-10-01, F1/CXO). The sample report is real proof, not another adjective. */}
            <a href={localizedPath(locale, "/bao-cao-mau/tu-vi")} className="tn-hero-sample-cta">
              {t("hero.sampleCta")}
            </a>
          </div>

          <div id="tn-birth-form" className="hv3 tn-hero-form" data-open={formOpen ? "true" : "false"}>
            <HomepageV3BirthForm state={state} />
            {/* The hero submits into step 1 of a multi-step wizard, not an instant report
                (2026-10-01 audit, F5) — the handoff note says so instead of implying otherwise. */}
            <p className="tn-hero-handoff-note">{t("hero.handoffNote")}</p>
          </div>
        </div>

        {/* Reused verbatim from the live homepage: the chart reveals as the same
            birth-form values are typed, so it must read `state.hero`, not a copy. */}
        <div className="tn-hero-chart-slot hv3">
          <HomepageV3HeroChart hero={state.hero} locale={locale} />
        </div>
      </div>
    </section>
  );
}
