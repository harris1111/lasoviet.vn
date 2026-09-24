"use client";

import { useEffect } from "react";

/** One-shot, staggered entrance for `[data-reveal]` blocks. Content stays visible without JS or with reduced motion. */
export function HomepageV3Reveal() {
  useEffect(() => {
    const root = document.querySelector<HTMLElement>(".hv3");
    if (!root) return;
    const targets = Array.from(root.querySelectorAll<HTMLElement>("[data-reveal]"));
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    if (reduce || typeof IntersectionObserver === "undefined") {
      targets.forEach((el) => el.setAttribute("data-in", ""));
      return;
    }
    root.setAttribute("data-reveal-ready", "");
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.setAttribute("data-in", "");
          observer.unobserve(entry.target);
        }
      },
      { rootMargin: "0px 0px -6% 0px", threshold: 0.06 },
    );
    targets.forEach((el) => observer.observe(el));
    return () => {
      observer.disconnect();
      root.removeAttribute("data-reveal-ready");
    };
  }, []);
  return null;
}
