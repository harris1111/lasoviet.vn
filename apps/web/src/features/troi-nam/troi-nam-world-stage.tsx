"use client";

import { useEffect, useRef, type ReactNode } from "react";

import { textDim } from "./troi-nam-motion-math";
import { initializeWorld } from "./world/troi-nam-world-runtime";

import type { WorldHandle, WorldQuality } from "./world/troi-nam-world-types";

type ProgressDetail = { progress: number; reducedMotion: boolean };

/**
 * Wraps hero/story/ticker/explore in a non-flow absolute backdrop (a sticky
 * 100svh child holding the canvas) behind those sections, which keep their
 * normal flow, order and anchors unchanged. Owns exactly one WorldHandle;
 * `TroiNamHero` (a child here) still owns the one `createTroiNamProgress`
 * controller for `.tn` — this only *listens* via its `troi-nam:progress`
 * CustomEvent, per the effects contract, instead of creating a second one.
 *
 * Gated on reduced-motion/saveData/WebGL before ever importing `three`
 * (dynamic import — never touches server execution). Static plates
 * (`.tn-hero-media`) stay fully visible until the world's first real frame,
 * and immediately again on failure or a live reduced-motion toggle.
 */
export function TroiNamWorldStage({ children }: { children: ReactNode }) {
  const stageRef = useRef<HTMLDivElement>(null);
  const stickyRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const stage = stageRef.current;
    const sticky = stickyRef.current;
    const canvas = canvasRef.current;
    const root = stage?.closest<HTMLElement>(".tn");
    const exploreChart = stage?.querySelector<HTMLElement>(".tn-explore .hv3-chart");
    if (!stage || !sticky || !canvas || !root) return;

    const reducedMotionQuery = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    const coarsePointerQuery = window.matchMedia?.("(pointer: coarse)");
    const saveData = (navigator as unknown as { connection?: { saveData?: boolean } }).connection?.saveData === true;
    if (reducedMotionQuery?.matches || saveData || typeof window.WebGLRenderingContext === "undefined") {
      return; // static `.tn-hero-media` plates stay exactly as they are
    }

    let cancelled = false;
    let failed = false;
    const abort = new AbortController();
    const diagnostics = new URLSearchParams(window.location.search).get("troiNamWorldDebug") === "1";
    const debugWindow = window as Window & { __troiNamWorld?: WorldHandle };
    let handle: WorldHandle | null = null;

    const quality: WorldQuality = coarsePointerQuery?.matches ? "low" : "high";
    const pixelRatioCap = quality === "high" ? 1.5 : 1;

    function markReady(ready: boolean) {
      if (ready) root!.setAttribute("data-troi-nam-world-ready", "");
      else { root!.removeAttribute("data-troi-nam-world-ready"); root!.style.setProperty("--tn-world-opacity", "1"); }
    }

    function resizeCanvas() {
      if (!handle) return;
      const rect = sticky!.getBoundingClientRect();
      handle.resize(rect.width, rect.height, Math.min(window.devicePixelRatio || 1, pixelRatioCap));
    }

    function updateChartTarget() {
      if (!handle) return;
      if (!exploreChart) {
        handle.setChartTarget(null);
        return;
      }
      const chartRect = exploreChart.getBoundingClientRect();
      // WorldHandle.setChartTarget takes canvas-local pixel coordinates (see
      // troi-nam-world-scene.ts), not viewport coordinates — offset by the
      // sticky canvas's own top-left, not the (much taller) stage's.
      const stickyRect = sticky!.getBoundingClientRect();
      handle.setChartTarget({
        x: chartRect.left - stickyRect.left,
        y: chartRect.top - stickyRect.top,
        width: chartRect.width,
        height: chartRect.height,
      });
    }

    // Text blocks that sit on the painted sky: the story copy and the explore heading + shortcut row.
    function updateTextDim() {
      if (!handle) return;
      const blocks: Array<{ top: number; bottom: number }> = [];
      const story = stage!.querySelector<HTMLElement>(".tn-story .hv3-story-copy");
      if (story) blocks.push(story.getBoundingClientRect());
      const head = stage!.querySelector<HTMLElement>(".tn-explore .hv3-head");
      const shortcuts = stage!.querySelector<HTMLElement>(".tn-explore .hv3-shortcuts");
      if (head) {
        const top = head.getBoundingClientRect().top;
        const bottom = (shortcuts ?? head).getBoundingClientRect().bottom;
        blocks.push({ top, bottom });
      }
      handle.setTextDim(textDim(blocks, window.innerHeight));
    }

    function onProgress(event: Event) {
      if (!handle) return;
      const detail = (event as CustomEvent<ProgressDetail>).detail;
      handle.setProgress(detail.progress);
      // Fix #3: the chart's viewport position moves every frame while
      // scrolling, but nothing else fires here — re-measure and hand the
      // rect to the handle on the same cadence as progress itself (already
      // the progress controller's own rAF, so this adds no new loop).
      updateChartTarget();
      updateTextDim();
    }

    function onReducedMotionChange() {
      if (!reducedMotionQuery?.matches) return;
      // Live OS-level toggle mid-session: drop back to the static plates.
      // Also cancel an in-flight init (three.js chunk still loading, or
      // loaded but the handle not yet assigned) so it never completes and
      // flips the world on after the user has already opted out.
      cancelled = true;
      abort.abort();
      if (diagnostics) delete debugWindow.__troiNamWorld;
      handle?.dispose();
      handle = null;
      markReady(false);
    }

    function handleFailure() {
      // Called on init failure, and again later on context loss or sustained
      // bad frame times (createTroiNamWorld disposes itself first either way).
      failed = true;
      handle?.dispose();
      handle = null;
      if (diagnostics) delete debugWindow.__troiNamWorld;
      markReady(false);
    }

    // Pause the render loop (and its RAF cost) while the tab is hidden or the
    // whole hero→explore span has scrolled out of view — resumed with a
    // fresh delta (see stopLoop's reset) rather than a jump.
    let visible = document.visibilityState === "visible";
    let intersecting = true;
    function updateActive() {
      const next = visible && intersecting;
      handle?.setActive(next);
    }
    function onVisibilityChange() {
      visible = document.visibilityState === "visible";
      updateActive();
    }
    const intersectionObserver = new IntersectionObserver((entries) => {
      const entry = entries.at(-1);
      intersecting = entry?.isIntersecting ?? true;
      updateActive();
    });
    intersectionObserver.observe(stage);
    document.addEventListener("visibilitychange", onVisibilityChange);

    const resizeObserver = new ResizeObserver(() => {
      updateChartTarget();
      resizeCanvas();
    });
    resizeObserver.observe(sticky);
    if (exploreChart) resizeObserver.observe(exploreChart);

    root.addEventListener("troi-nam:progress", onProgress);
    reducedMotionQuery?.addEventListener?.("change", onReducedMotionChange);

    void initializeWorld({
      load: async () => {
        const { createTroiNamWorld } = await import("./world/troi-nam-world-scene");
        return () => createTroiNamWorld(canvas, {
          quality, seed: 1, onFailure: handleFailure, signal: abort.signal, diagnostics,
          onOpacity: (value) => root.style.setProperty("--tn-world-opacity", String(value)),
        });
      },
      cancelled: () => cancelled || failed || reducedMotionQuery?.matches === true,
      prepare: (nextHandle) => {
        handle = nextHandle;
        updateChartTarget();
        updateTextDim();
        const stored = Number(root.dataset.troiNamProgress);
        nextHandle.setProgress(Number.isFinite(stored) ? stored : 0);
        updateActive();
        // The first revealed render must use the stored scroll pose and chart rect.
        // resize can invoke onFailure synchronously; do not dereference handle afterward.
        resizeCanvas();
      },
      ready: (nextHandle) => {
        if (diagnostics) debugWindow.__troiNamWorld = nextHandle;
        markReady(true);
      },
      failure: handleFailure,
    });

    return () => {
      cancelled = true;
      abort.abort();
      if (diagnostics) delete debugWindow.__troiNamWorld;
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      document.removeEventListener("visibilitychange", onVisibilityChange);
      root.removeEventListener("troi-nam:progress", onProgress);
      reducedMotionQuery?.removeEventListener?.("change", onReducedMotionChange);
      handle?.dispose();
      handle = null;
      markReady(false);
    };
  }, []);

  return (
    <div className="tn-world-stage" ref={stageRef}>
      <div className="tn-world-backdrop" aria-hidden="true">
        <div className="tn-world-sticky" ref={stickyRef}>
          <canvas className="tn-world-canvas" ref={canvasRef} />
        </div>
      </div>
      <div className="tn-world-content">{children}</div>
    </div>
  );
}
