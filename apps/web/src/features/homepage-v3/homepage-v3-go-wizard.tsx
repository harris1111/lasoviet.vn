"use client";

import type { MouseEvent, ReactNode } from "react";

import { useHomepageV3Concern } from "./homepage-v3-concern-context";
import type { HomepageV3Interest } from "./homepage-v3-birth-profile";

export function scrollToHeroForm() {
  const target = document.getElementById("lap-la-so");
  if (!target) return;
  const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
  target.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
  window.setTimeout(() => document.getElementById("hv3-day")?.focus({ preventScroll: true }), reduce ? 0 : 450);
}

/**
 * Link that jumps back to the hero form and focuses the first field. Keeps a real
 * `#lap-la-so` href. `topConcern` is optional: when given and a `HomepageV3ConcernProvider`
 * is mounted above (Trời Nam only — the shared `/` homepage has none), this click is treated
 * as an explicit concern selection, including clicking the primary CTA without first clicking
 * its card (spec "Experience decisions" #4).
 */
export function HomepageV3GoWizard({
  children,
  className,
  topConcern,
}: {
  children: ReactNode;
  className?: string;
  topConcern?: HomepageV3Interest;
}) {
  const concernCtx = useHomepageV3Concern();
  function onClick(event: MouseEvent<HTMLAnchorElement>) {
    event.preventDefault();
    if (topConcern) concernCtx?.setTopConcern(topConcern);
    scrollToHeroForm();
  }
  return (
    <a href="#lap-la-so" onClick={onClick} className={className}>
      {children}
    </a>
  );
}
