"use client";

import { useLayoutEffect, useRef } from "react";

import { HomepageV3Needs } from "../homepage-v3/homepage-v3-needs";
import { troiNamAsset } from "./troi-nam-assets";

export function TroiNamNeeds({ locale }: { locale: "en" | "vi" }) {
  // Match the inspected NEEDS order: self, work, love, decision.
  // Asset-only rules leave the original component's state and DOM untouched.
  const assets = [
    { id: "self", plate: troiNamAsset("S01"), icon: troiNamAsset("I02.thau-hieu-chinh-minh") },
    { id: "work", plate: troiNamAsset("S03"), icon: troiNamAsset("I02.cong-viec-tien-bac") },
    { id: "love", plate: troiNamAsset("S02"), icon: troiNamAsset("I02.tinh-duyen") },
    // Keep the original decision icon; the year icon would mislabel this CTA.
    { id: "decision", plate: troiNamAsset("S04"), icon: null },
  ];
  const wrapRef = useRef<HTMLDivElement>(null);

  // Runs before paint (not useEffect) so the very first render already shows
  // the correct state: if the card row is already on screen at mount, reveal
  // it immediately with no hide-then-show flash; otherwise hide instantly
  // (no transition yet) and let the observer animate it in on scroll.
  useLayoutEffect(() => {
    const wrap = wrapRef.current;
    const list = wrap?.querySelector<HTMLElement>(".hv3-need-list");
    if (!wrap || !list) return;
    if (typeof IntersectionObserver !== "function") return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;

    const rect = list.getBoundingClientRect();
    if (rect.top < window.innerHeight && rect.bottom > 0) {
      wrap.setAttribute("data-need-reveal", "in");
      return;
    }

    wrap.setAttribute("data-need-reveal", "pending");
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting) return;
        wrap.setAttribute("data-need-reveal", "in");
        observer.disconnect();
      },
      { threshold: 0.2 },
    );
    observer.observe(list);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="hv3 tn-needs" id="nhu-cau" ref={wrapRef}>
      {assets.map((asset, index) => (
        <style key={asset.id}>
          {`
            .tn .tn-needs .hv3-need:nth-child(${index + 1})::before {
              background-image: url("${asset.plate.src}");
            }
            .tn .tn-needs:has(.hv3-need:nth-child(${index + 1})[aria-pressed="true"]) .hv3-need-art {
              background-image: url("${asset.plate.src}");
            }
            ${asset.icon ? `
              .tn .tn-needs .hv3-need:nth-child(${index + 1}) .hv3-need-icon {
                background-image: url("${asset.icon.src}");
              }
              .tn .tn-needs .hv3-need:nth-child(${index + 1}) .hv3-need-icon img {
                display: none;
              }
            ` : ""}
          `}
        </style>
      ))}
      <HomepageV3Needs locale={locale} />
    </div>
  );
}
