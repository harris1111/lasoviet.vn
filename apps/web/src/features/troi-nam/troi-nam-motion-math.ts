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

/**
 * How much of the viewport the page's text blocks occupy right now, 0..1. The painted sky is
 * dimmed by this much (see the world scene) so copy keeps its contrast without any dark layer
 * in the page: each block counts by the share of itself (capped at 60% of the viewport) that is
 * on screen, eased so the sky dims and recovers gradually while scrolling.
 */
export function textDim(blocks: ReadonlyArray<{ top: number; bottom: number }>, viewportHeight: number): number {
  if (!(viewportHeight > 0)) return 0;
  let strongest = 0;
  for (const block of blocks) {
    const height = block.bottom - block.top;
    if (!(height > 0)) continue;
    const visible = Math.max(0, Math.min(block.bottom, viewportHeight) - Math.max(block.top, 0));
    const coverage = clampProgress(visible / Math.min(height, viewportHeight * 0.6));
    strongest = Math.max(strongest, smoothstep(coverage, 0.15, 0.6));
  }
  return strongest;
}

export function scrollProgress(scrollY: number, range: ScrollRange): number {
  if (!Number.isFinite(scrollY) || !Number.isFinite(range.start) ||
      !Number.isFinite(range.end) || range.end <= range.start) return 0;
  return clampProgress((scrollY - range.start) / (range.end - range.start));
}
