"use client";

import type { MouseEvent, ReactNode } from "react";

export function scrollToHeroForm() {
  const target = document.getElementById("lap-la-so");
  if (!target) return;
  const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
  target.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
  window.setTimeout(() => document.getElementById("hv3-day")?.focus({ preventScroll: true }), reduce ? 0 : 450);
}

/** Link that jumps back to the hero form and focuses the first field. Keeps a real `#lap-la-so` href. */
export function HomepageV3GoWizard({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  function onClick(event: MouseEvent<HTMLAnchorElement>) {
    event.preventDefault();
    scrollToHeroForm();
  }
  return (
    <a href="#lap-la-so" onClick={onClick} className={className}>
      {children}
    </a>
  );
}
