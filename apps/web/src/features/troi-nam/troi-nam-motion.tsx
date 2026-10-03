"use client";

import { useEffect } from "react";

/** Sections that did not get the old homepage's reveal when they were moved onto Trời Nam. */
const SECTIONS = [".tn-story", ".tn-compare", ".tn-usp", ".tn-value", ".tn-testimonials", ".tn-about"];
/** Items that enter one after another inside a section. */
const STAGGER = [".hv3-steps li", ".hv3-usp-card"];
const GLOW = ".tn-usp .hv3-usp-card";

type Environment = {
  prefersReducedMotion: boolean;
  saveData?: boolean;
  deviceMemory?: number;
  hardwareConcurrency?: number;
  hasIntersectionObserver: boolean;
};

/**
 * Motion here is decoration, so it steps aside whenever the device may struggle or the visitor
 * asked for less: reduced-motion, data saver, 2 GB or less of memory, 2 or fewer cores, or no
 * IntersectionObserver. In those cases the content is simply shown, with no hidden state.
 */
export function shouldSimplifyMotion(env: Environment): boolean {
  if (env.prefersReducedMotion || env.saveData || !env.hasIntersectionObserver) return true;
  if (env.deviceMemory !== undefined && env.deviceMemory <= 2) return true;
  if (env.hardwareConcurrency !== undefined && env.hardwareConcurrency <= 2) return true;
  return false;
}

/**
 * Reuses the old homepage's quiet motion for the sections that have no motion of their own:
 * a one-shot rise for headings and cards (opacity and translate only, CSS in homepage-v3-motion.css),
 * and the soft pointer light on the USP cards for fine pointers. No scroll listeners, parallax or tilt.
 */
export function TroiNamMotion() {
  useEffect(() => {
    const root = document.querySelector<HTMLElement>(".tn");
    if (!root) return;
    const wrappers = SECTIONS.flatMap((selector) => Array.from(root.querySelectorAll<HTMLElement>(`.hv3${selector}`)));
    for (const wrapper of wrappers) {
      wrapper.querySelectorAll<HTMLElement>("h2.hv3-h2:not([data-reveal])").forEach((el) => el.setAttribute("data-reveal", "title"));
      for (const selector of STAGGER) {
        wrapper.querySelectorAll<HTMLElement>(`${selector}:not([data-reveal])`).forEach((el, index) => {
          el.setAttribute("data-reveal", "");
          el.style.setProperty("--i", String(Math.min(index, 5)));
        });
      }
    }
    const reveals = wrappers.flatMap((wrapper) => Array.from(wrapper.querySelectorAll<HTMLElement>("[data-reveal]")));

    const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
    const simplify = shouldSimplifyMotion({
      prefersReducedMotion: window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false,
      saveData: connection?.saveData,
      deviceMemory: (navigator as Navigator & { deviceMemory?: number }).deviceMemory,
      hardwareConcurrency: navigator.hardwareConcurrency,
      hasIntersectionObserver: typeof IntersectionObserver !== "undefined",
    });
    if (simplify) {
      reveals.forEach((el) => el.setAttribute("data-in", ""));
      return;
    }

    const cleanups: Array<() => void> = [];
    for (const wrapper of wrappers) {
      wrapper.setAttribute("data-reveal-ready", "");
      cleanups.push(() => wrapper.removeAttribute("data-reveal-ready"));
    }
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
    reveals.forEach((el) => observer.observe(el));
    cleanups.push(() => observer.disconnect());

    if (window.matchMedia?.("(hover: hover) and (pointer: fine)").matches) {
      root.querySelectorAll<HTMLElement>(GLOW).forEach((card) => {
        let frame = 0;
        let last: PointerEvent | null = null;
        const move = (event: PointerEvent) => {
          last = event;
          if (frame) return;
          frame = requestAnimationFrame(() => {
            frame = 0;
            if (!last) return;
            const box = card.getBoundingClientRect();
            card.style.setProperty("--hv3-mx", `${((last.clientX - box.left) / box.width) * 100}%`);
            card.style.setProperty("--hv3-my", `${((last.clientY - box.top) / box.height) * 100}%`);
            card.setAttribute("data-hover", "");
          });
        };
        const leave = () => {
          if (frame) cancelAnimationFrame(frame);
          frame = 0;
          card.removeAttribute("data-hover");
        };
        card.addEventListener("pointermove", move, { passive: true });
        card.addEventListener("pointerleave", leave);
        cleanups.push(() => {
          if (frame) cancelAnimationFrame(frame);
          card.removeEventListener("pointermove", move);
          card.removeEventListener("pointerleave", leave);
        });
      });
    }

    return () => cleanups.forEach((cleanup) => cleanup());
  }, []);
  return null;
}
