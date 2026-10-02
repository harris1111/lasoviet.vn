"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { getSiteTheme, subscribeSiteTheme, type Theme } from "../theme/site-theme";
import { TroiNamThemePicture } from "./troi-nam-theme-art";
import { initializeWorld } from "./world/troi-nam-world-runtime";
import { worldThemeConfig } from "./world/troi-nam-world-theme-config";
import type { WorldHandle, WorldQuality } from "./world/troi-nam-world-types";

type ProgressDetail = { progress: number; reducedMotion: boolean };

/** One scene generation at a time. Form/progress/concern owners remain mounted. */
export function TroiNamWorldStage({ children }: { children: ReactNode }) {
  const stageRef = useRef<HTMLDivElement>(null);
  const stickyRef = useRef<HTMLDivElement>(null);
  const canvasHostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const stage = stageRef.current;
    const sticky = stickyRef.current;
    const host = canvasHostRef.current;
    const root = stage?.closest<HTMLElement>(".tn");
    const exploreChart = stage?.querySelector<HTMLElement>(".tn-explore .hv3-chart");
    if (!stage || !sticky || !host || !root) return;
    const motion = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    const coarse = window.matchMedia?.("(pointer: coarse)");
    const connection = (navigator as unknown as { connection?: EventTarget & { saveData?: boolean } }).connection;
    const quality: WorldQuality = coarse?.matches ? "low" : "high";
    const diagnostics = new URLSearchParams(window.location.search).get("troiNamWorldDebug") === "1";
    const debugWindow = window as Window & { __troiNamWorld?: WorldHandle };
    let revision = 0;
    let disposed = false;
    let failed = false;
    let abort: AbortController | null = null;
    let handle: WorldHandle | null = null;
    let canvas: HTMLCanvasElement | null = null;
    let theme: Theme | undefined;
    let progress = Number(root.dataset.troiNamProgress) || 0;
    let visible = document.visibilityState === "visible";
    let intersecting = true;

    function markStatic() {
      root!.removeAttribute("data-troi-nam-world-ready");
      root!.style.setProperty("--tn-world-opacity", "1");
    }
    function release() {
      abort?.abort(); abort = null;
      handle?.dispose(); handle = null;
      canvas?.remove(); canvas = null;
      if (diagnostics) delete debugWindow.__troiNamWorld;
      markStatic();
    }
    function updateChartTarget() {
      if (!handle) return;
      if (!exploreChart) { handle.setChartTarget(null); return; }
      const rect = exploreChart.getBoundingClientRect();
      const origin = sticky!.getBoundingClientRect();
      handle.setChartTarget({ x: rect.left - origin.left, y: rect.top - origin.top, width: rect.width, height: rect.height });
    }
    function resize() {
      if (!handle) return;
      updateChartTarget();
      const rect = sticky!.getBoundingClientRect();
      try {
        handle.resize(rect.width, rect.height, Math.min(window.devicePixelRatio || 1, quality === "high" ? 1.5 : 1));
      } catch {
        // A larger viewport may no longer fit this scene's allocation budget.
        failed = true; ++revision; release();
      }
    }
    function active() { handle?.setActive(visible && intersecting); }
    function start(force = false) {
      const nextTheme = getSiteTheme().effective;
      if (!force && nextTheme === theme) return;
      theme = nextTheme;
      const current = ++revision;
      release();
      if (disposed || failed || motion?.matches || connection?.saveData || typeof window.WebGLRenderingContext === "undefined") return;
      const pending = new AbortController(); abort = pending;
      // A fresh canvas avoids reusing the force-lost WebGL context of an old renderer.
      const surface = document.createElement("canvas"); surface.className = "tn-world-canvas";
      host!.appendChild(surface); canvas = surface;
      const stale = () => disposed || revision !== current || pending.signal.aborted || failed || motion?.matches === true || getSiteTheme().effective !== nextTheme;
      function failure() {
        if (revision !== current || disposed || pending.signal.aborted) return;
        failed = true; ++revision; release();
      }
      void initializeWorld({
        load: async () => {
          const { createTroiNamWorld } = await import("./world/troi-nam-world-scene");
          return () => createTroiNamWorld(surface, {
            quality, seed: 1, config: worldThemeConfig(nextTheme, quality), signal: pending.signal, diagnostics,
            onFailure: failure,
            onOpacity(value) { if (!stale()) root!.style.setProperty("--tn-world-opacity", String(value)); },
          });
        },
        cancelled: stale,
        prepare(next) {
          handle = next; next.setProgress(progress); updateChartTarget(); active(); resize();
        },
        ready(next) {
          if (stale()) return;
          if (diagnostics) debugWindow.__troiNamWorld = next;
          root!.setAttribute("data-troi-nam-world-ready", `${nextTheme}:${current}`);
        },
        failure,
      });
    }
    function onProgress(event: Event) {
      progress = (event as CustomEvent<ProgressDetail>).detail.progress;
      handle?.setProgress(progress); updateChartTarget();
    }
    function capabilityChanged() { failed = false; start(true); }
    function visibilityChanged() { visible = document.visibilityState === "visible"; active(); }
    const intersection = typeof IntersectionObserver === "function" ? new IntersectionObserver(entries => {
      intersecting = entries.at(-1)?.isIntersecting ?? true; active();
    }) : null;
    intersection?.observe(stage);
    const observer = typeof ResizeObserver === "function" ? new ResizeObserver(resize) : null;
    observer?.observe(sticky); if (exploreChart) observer?.observe(exploreChart);
    root.addEventListener("troi-nam:progress", onProgress);
    document.addEventListener("visibilitychange", visibilityChanged);
    motion?.addEventListener("change", capabilityChanged);
    connection?.addEventListener("change", capabilityChanged);
    const unsubscribe = subscribeSiteTheme(() => start());
    start();
    return () => {
      disposed = true; ++revision; unsubscribe(); release();
      observer?.disconnect(); intersection?.disconnect();
      root.removeEventListener("troi-nam:progress", onProgress);
      document.removeEventListener("visibilitychange", visibilityChanged);
      motion?.removeEventListener("change", capabilityChanged);
      connection?.removeEventListener("change", capabilityChanged);
    };
  }, []);

  return <div className="tn-world-stage" ref={stageRef}>
    <div className="tn-world-backdrop" aria-hidden="true">
      <div className="tn-world-sticky" ref={stickyRef}>
        <TroiNamThemePicture desktop="L01" mobile="L02" className="tn-world-static" imageClassName="tn-hero-plate" lightOnly />
        <div className="tn-world-canvas-host" ref={canvasHostRef} />
      </div>
    </div>
    <div className="tn-world-content">{children}</div>
  </div>;
}
