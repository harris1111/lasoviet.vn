"use client";

import { useEffect, useRef } from "react";

import { HomepageV3Explore } from "../homepage-v3/homepage-v3-explore";
import { troiNamAsset } from "./troi-nam-assets";
import { clampProgress, smoothstep } from "./troi-nam-motion-math";

export function TroiNamExplore({ locale }: { locale: "en" | "vi" }) {
  const texture = troiNamAsset("T01");
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const wrap = wrapRef.current;
    const root = wrap?.closest<HTMLElement>(".tn");
    const section = wrap?.closest<HTMLElement>('[data-troi-nam-block="explore"]');
    if (!wrap || !root || !section) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;

    // A local "how far has this section entered the viewport" progress, not
    // the shared hero->explore world progress: that range finishes right as
    // Explore is reached, i.e. before this section is on screen to watch it.
    function apply() {
      const rect = section!.getBoundingClientRect();
      const viewport = window.innerHeight || 1;
      const enter = clampProgress((viewport - rect.top) / viewport);
      const resolve = smoothstep(enter, 0.15, 0.55);
      wrap!.style.setProperty("--tn-ring", String(1 - resolve));
      wrap!.style.setProperty("--tn-grid-reveal", String(resolve));
    }

    apply();
    // Reuses the rAF-scheduled scroll bridge Hero already owns for this root
    // (see troi-nam-hero.tsx) instead of a second scroll/RAF driver.
    root.addEventListener("troi-nam:progress", apply);
    return () => root.removeEventListener("troi-nam:progress", apply);
  }, []);

  return (
    <div className="hv3 tn-explore" id="la-so-mau" ref={wrapRef}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        className="tn-explore-texture"
        src={texture.src}
        width={texture.width}
        height={texture.height}
        alt=""
        aria-hidden="true"
        loading="lazy"
        decoding="async"
      />
      <HomepageV3Explore locale={locale} />
    </div>
  );
}
