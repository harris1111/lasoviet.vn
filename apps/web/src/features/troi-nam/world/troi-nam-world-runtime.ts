import type { WorldHandle, WorldQuality } from "./troi-nam-world-types";

/** Shared by the stage and its lifecycle tests; cancellation is checked before allocation. */
export async function initializeWorld(options: {
  load: () => Promise<() => Promise<WorldHandle>>;
  cancelled: () => boolean;
  prepare: (handle: WorldHandle) => void;
  ready: (handle: WorldHandle) => void;
  failure: () => void;
}): Promise<void> {
  let handle: WorldHandle | undefined;
  try {
    const create = await options.load();
    if (options.cancelled()) return;
    handle = await create();
    if (options.cancelled()) { handle.dispose(); return; }
    options.prepare(handle);
    if (options.cancelled()) { handle.dispose(); return; }
    options.ready(handle);
  } catch {
    handle?.dispose();
    options.failure();
  }
}

export function createWorldScheduler(initial: WorldQuality) {
  let tier: WorldQuality | "static" = initial;
  let lastRender: number | null = null;
  let slowSince: number | null = null;
  return {
    get tier() { return tier; },
    shouldRender(now: number) {
      if (tier === "static") return false;
      if (tier === "low" && lastRender !== null && now - lastRender < 1000 / 30 - 0.1) return false;
      lastRender = now;
      return true;
    },
    recordFrame(now: number, frameMs: number) {
      if (frameMs <= 50) { slowSince = null; return; }
      if (slowSince === null) slowSince = now;
      else if (now - slowSince >= 2000) {
        tier = tier === "high" ? "low" : "static";
        slowSince = null;
      }
    },
    reset() { slowSince = null; lastRender = null; },
  };
}

export function chartCanvasOpacity(weight: number): number {
  return Math.max(0, Math.min(1, (1 - weight) / 0.1));
}
