"use client";

import { useLayoutEffect, useRef } from "react";

import { HomepageV3Faq } from "../homepage-v3/homepage-v3-faq";

export function TroiNamFaq({ locale }: { locale: "en" | "vi" }) {
  const wrapRef = useRef<HTMLDivElement>(null);

  // Same shape as the need-cards reveal (troi-nam-needs.tsx): synchronous
  // pre-paint check so an already-visible list never flashes hidden, and a
  // one-shot IntersectionObserver for the below-the-fold case.
  useLayoutEffect(() => {
    const wrap = wrapRef.current;
    const list = wrap?.querySelector<HTMLElement>(".hv3-faq-list");
    if (!wrap || !list) return;
    if (typeof IntersectionObserver !== "function") return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;

    const rect = list.getBoundingClientRect();
    if (rect.top < window.innerHeight && rect.bottom > 0) {
      wrap.setAttribute("data-faq-reveal", "in");
      return;
    }

    wrap.setAttribute("data-faq-reveal", "pending");
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting) return;
        wrap.setAttribute("data-faq-reveal", "in");
        observer.disconnect();
      },
      { threshold: 0.15 },
    );
    observer.observe(list);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="hv3 tn-faq" ref={wrapRef}>
      <HomepageV3Faq locale={locale} />
    </div>
  );
}
