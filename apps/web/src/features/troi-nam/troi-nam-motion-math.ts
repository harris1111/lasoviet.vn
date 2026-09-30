export type ScenePhases = { dusk: number; night: number; chart: number };
export type ScrollRange = { start: number; end: number };

/** Invalid progress uses the static dawn state instead of leaking NaN into uniforms. */
export function clampProgress(value: number): number {
  return Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0;
}

/** Cubic ease, 0 before `start`, 1 after `end`. Shared by every phase/reveal in this file. */
export function smoothstep(progress: number, start: number, end: number): number {
  const value = clampProgress((progress - start) / (end - start));
  return value * value * (3 - 2 * value);
}

/** Scroll-driven weights; no animation clock or personal chart data is involved. */
export function scenePhases(value: number): ScenePhases {
  const progress = clampProgress(value);
  return {
    dusk: smoothstep(progress, 0.25, 0.5),
    night: smoothstep(progress, 0.5, 0.75),
    chart: smoothstep(progress, 0.75, 1),
  };
}

export function scrollProgress(scrollY: number, range: ScrollRange): number {
  if (!Number.isFinite(scrollY) || !Number.isFinite(range.start) ||
      !Number.isFinite(range.end) || range.end <= range.start) return 0;
  return clampProgress((scrollY - range.start) / (range.end - range.start));
}
