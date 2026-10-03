"use client";

import { useLayoutEffect, useRef } from "react";

import { HomepageV3Needs } from "../homepage-v3/homepage-v3-needs";
import { troiNamAsset } from "./troi-nam-assets";

export function TroiNamNeeds({ locale }: { locale: "en" | "vi" }) {
  // Match the inspected NEEDS order: self, work, love, decision.
  // Asset-only rules leave the original component's state and DOM untouched.
  // `y` is the vertical focal point (% from top): the subject of each plate sits in its lower
  // half and the top is empty night sky, so a centred crop would show sky and lose the subject.
  const assets = [
    { id: "self", plate: troiNamAsset("S01"), icon: troiNamAsset("I02.thau-hieu-chinh-minh"), y: 72 },
    { id: "work", plate: troiNamAsset("S03"), icon: troiNamAsset("I02.cong-viec-tien-bac"), y: 62 },
    { id: "love", plate: troiNamAsset("S02"), icon: troiNamAsset("I02.tinh-duyen"), y: 62 },
    // Keep the original decision icon; the year icon would mislabel this CTA.
    { id: "decision", plate: troiNamAsset("S04"), icon: null, y: 62 },
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

  // The discipline links below already carry `data-reveal` + `--i` (set by
  // the shared HomepageV3Needs for the older homepage's HomepageV3Motion
  // system), but that system isn't mounted here, so those attributes
  // currently do nothing. This reveals the same markup directly instead of
  // introducing a second, parallel attribute scheme, and stays
  // forward-compatible if HomepageV3Motion is ever mounted here too.
  useLayoutEffect(() => {
    const wrap = wrapRef.current;
    const slots = wrap ? Array.from(wrap.querySelectorAll<HTMLElement>(".hv3-disc-slot[data-reveal]")) : [];
    if (!wrap || slots.length === 0) return;
    if (typeof IntersectionObserver !== "function") return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;

    wrap.setAttribute("data-reveal-ready", "");
    const viewportHeight = window.innerHeight;
    const pending: HTMLElement[] = [];
    for (const slot of slots) {
      const rect = slot.getBoundingClientRect();
      if (rect.top < viewportHeight && rect.bottom > 0) slot.setAttribute("data-in", "");
      else pending.push(slot);
    }
    if (pending.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.setAttribute("data-in", "");
          observer.unobserve(entry.target);
        }
      },
      { threshold: 0.1 },
    );
    pending.forEach((slot) => observer.observe(slot));
    return () => observer.disconnect();
  }, []);

  return (
    <div className="hv3 tn-needs" id="nhu-cau" ref={wrapRef}>
      {assets.map((asset, index) => (
        <style key={asset.id}>
          {`
            .tn .tn-needs .hv3-need:nth-child(${index + 1})::before {
              background-image: url("${asset.plate.src}");
              background-position: center ${asset.y}%;
            }
            .tn .tn-needs:has(.hv3-need:nth-child(${index + 1})[aria-pressed="true"]) .hv3-need-art {
              background-image: url("${asset.plate.src}");
              background-position: center ${asset.y}%;
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
