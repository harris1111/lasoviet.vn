"use client";

import { useEffect } from "react";

import { clamp, parallaxOffset, pointerVector } from "./homepage-v3-motion-math";

/** Extra blocks that reveal once on scroll; index sets the stagger inside each group. */
const STAGGER_GROUPS = [".hv3-need", ".hv3-faq-item"];
/** Cards that get the soft pointer light and 3px lift. */
const GLOW = "[data-glow], .hv3-usp-card, .hv3-need, .hv3-need-detail";
const TILT = ".hv3-chart-face";
const MAGNETIC = ".hv3-cta, .hv3-final-cta .hv3-btn";
const TILT_DEG = 3;
const MAGNET_PX = 4;

type Cleanup = () => void;

/** Pointer handler batched to one write per animation frame. */
function onPointer(el: HTMLElement, move: (el: HTMLElement, event: PointerEvent) => void, leave: (el: HTMLElement) => void): Cleanup {
  let frame = 0;
  let last: PointerEvent | null = null;
  const handleMove = (event: PointerEvent) => {
    last = event;
    if (frame) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      if (last) move(el, last);
    });
  };
  const handleLeave = () => {
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
    leave(el);
  };
  el.addEventListener("pointermove", handleMove, { passive: true });
  el.addEventListener("pointerleave", handleLeave);
  return () => {
    if (frame) cancelAnimationFrame(frame);
    el.removeEventListener("pointermove", handleMove);
    el.removeEventListener("pointerleave", handleLeave);
  };
}

/**
 * Homepage motion, kept quiet on purpose:
 * - one-shot staggered reveal for `[data-reveal]` (and section headings),
 * - scroll parallax for `[data-parallax="<max px>"]` plus the reading-progress bar,
 * - pointer light, chart tilt and magnetic buttons on fine pointers only.
 * Everything writes CSS custom properties; CSS turns them into transform/opacity.
 * With reduced motion or no IntersectionObserver, content is simply shown.
 */
export function HomepageV3Motion() {
  useEffect(() => {
    const root = document.querySelector<HTMLElement>(".hv3");
    if (!root) return;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;

    root.querySelectorAll<HTMLElement>("h2.hv3-h2:not([data-reveal])").forEach((el) => el.setAttribute("data-reveal", "title"));
    for (const selector of STAGGER_GROUPS) {
      root.querySelectorAll<HTMLElement>(`${selector}:not([data-reveal])`).forEach((el, index) => {
        el.setAttribute("data-reveal", "");
        el.style.setProperty("--i", String(Math.min(index, 6)));
      });
    }
    const reveals = Array.from(root.querySelectorAll<HTMLElement>("[data-reveal]"));

    if (reduce || typeof IntersectionObserver === "undefined") {
      reveals.forEach((el) => el.setAttribute("data-in", ""));
      return;
    }

    const cleanups: Cleanup[] = [];
    root.setAttribute("data-reveal-ready", "");
    cleanups.push(() => root.removeAttribute("data-reveal-ready"));

    const revealObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.setAttribute("data-in", "");
          revealObserver.unobserve(entry.target);
        }
      },
      { rootMargin: "0px 0px -6% 0px", threshold: 0.06 },
    );
    reveals.forEach((el) => revealObserver.observe(el));
    cleanups.push(() => revealObserver.disconnect());

    // Scroll: parallax on elements near the viewport, and the reading-progress bar.
    const onScreen = new Set<HTMLElement>();
    const progress = root.querySelector<HTMLElement>(".hv3-progress");
    let frame = 0;
    const paint = () => {
      frame = 0;
      const viewport = window.innerHeight;
      for (const el of onScreen) {
        const max = Number(el.dataset.parallax) || 16;
        const offset = parallaxOffset(el.getBoundingClientRect(), viewport, max);
        el.style.setProperty("--hv3-py", `${Math.round(offset * 2) / 2}px`);
      }
      if (progress) {
        const scrollable = document.documentElement.scrollHeight - viewport;
        progress.style.setProperty("--hv3-progress", String(scrollable > 0 ? clamp(window.scrollY / scrollable, 0, 1) : 0));
      }
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(paint);
    };
    const parallaxObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const el = entry.target as HTMLElement;
          if (entry.isIntersecting) onScreen.add(el);
          else onScreen.delete(el);
        }
        schedule();
      },
      { rootMargin: "25% 0px" },
    );
    root.querySelectorAll<HTMLElement>("[data-parallax]").forEach((el) => parallaxObserver.observe(el));
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule, { passive: true });
    schedule();
    cleanups.push(() => {
      parallaxObserver.disconnect();
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      if (frame) cancelAnimationFrame(frame);
    });

    // Pointer effects only where a real hovering pointer exists.
    if (window.matchMedia?.("(hover: hover) and (pointer: fine)").matches) {
      root.querySelectorAll<HTMLElement>(GLOW).forEach((el) => {
        cleanups.push(
          onPointer(
            el,
            (target, event) => {
              const box = target.getBoundingClientRect();
              target.style.setProperty("--hv3-mx", `${((event.clientX - box.left) / box.width) * 100}%`);
              target.style.setProperty("--hv3-my", `${((event.clientY - box.top) / box.height) * 100}%`);
              target.setAttribute("data-hover", "");
            },
            (target) => target.removeAttribute("data-hover"),
          ),
        );
      });
      root.querySelectorAll<HTMLElement>(TILT).forEach((el) => {
        cleanups.push(
          onPointer(
            el,
            (target, event) => {
              const v = pointerVector(event.clientX, event.clientY, target.getBoundingClientRect());
              target.style.setProperty("--hv3-rx", `${(-v.y * TILT_DEG).toFixed(2)}deg`);
              target.style.setProperty("--hv3-ry", `${(v.x * TILT_DEG).toFixed(2)}deg`);
              target.setAttribute("data-hover", "");
            },
            (target) => {
              target.style.setProperty("--hv3-rx", "0deg");
              target.style.setProperty("--hv3-ry", "0deg");
              target.removeAttribute("data-hover");
            },
          ),
        );
      });
      root.querySelectorAll<HTMLElement>(MAGNETIC).forEach((el) => {
        cleanups.push(
          onPointer(
            el,
            (target, event) => {
              const v = pointerVector(event.clientX, event.clientY, target.getBoundingClientRect());
              target.style.setProperty("--hv3-tx", `${(v.x * MAGNET_PX).toFixed(1)}px`);
              target.style.setProperty("--hv3-ty", `${(v.y * MAGNET_PX).toFixed(1)}px`);
            },
            (target) => {
              target.style.setProperty("--hv3-tx", "0px");
              target.style.setProperty("--hv3-ty", "0px");
            },
          ),
        );
      });
    }

    return () => cleanups.forEach((cleanup) => cleanup());
  }, []);
  return null;
}
