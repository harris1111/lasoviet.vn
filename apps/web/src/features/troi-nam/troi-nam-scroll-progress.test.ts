import { describe, expect, it } from "vitest";

import { createTroiNamProgress } from "./troi-nam-scroll-progress";

function environment(withChart = true) {
  let pending: FrameRequestCallback | undefined;
  let resize: (() => void) | undefined;
  const observed: unknown[] = [];
  const view = Object.assign(new EventTarget(), {
    scrollY: 100, innerHeight: 800,
    CustomEvent: class extends Event { constructor(type: string, public options: unknown) { super(type); } },
    requestAnimationFrame(callback: FrameRequestCallback) { pending = callback; return 1; },
    cancelAnimationFrame() { pending = undefined; },
    ResizeObserver: class {
      constructor(callback: () => void) { resize = callback; }
      observe(element: unknown) { observed.push(element); }
      disconnect() { observed.length = 0; }
    },
  });
  const doc = Object.assign(new EventTarget(), { defaultView: view, visibilityState: "visible" });
  const parent = { offsetTop: 100, clientTop: 0, offsetParent: null };
  const hero = { offsetTop: 0, offsetParent: parent, getBoundingClientRect: () => ({ top: 0 }) };
  const explore = { offsetTop: 1400, offsetParent: parent, getBoundingClientRect: () => ({ top: 1400 }) };
  const chart = {
    offsetTop: 400, offsetHeight: 400, offsetParent: { ...explore, clientTop: 0 },
    // A presentation transform must never affect the shared progress range.
    getBoundingClientRect: () => ({ top: 1850, height: 376 }),
  };
  const attributes = new Map<string, string>();
  const root = Object.assign(new EventTarget(), {
    ownerDocument: doc,
    querySelector: (selector: string) => selector.includes(".hv3-chart") ? (withChart ? chart : null) : selector.includes("hero") ? hero : explore,
    getAttribute: (name: string) => attributes.get(name) ?? null,
    setAttribute: (name: string, value: string) => { attributes.set(name, value); },
    removeAttribute: (name: string) => { attributes.delete(name); },
  });
  return {
    root: root as unknown as HTMLElement, view, chart, observed, attributes,
    resizeChart() { resize?.(); },
    flush() { const callback = pending; pending = undefined; callback?.(0); },
  };
}

describe("Trời Nam shared progress", () => {
  it("ends when the untransformed chart centre reaches the viewport centre", () => {
    const env = environment();
    const controller = createTroiNamProgress(env.root)!;
    try {
      expect(controller.read().range).toEqual({ start: 100, end: 1700 });
      env.view.scrollY = 1600;
      env.view.dispatchEvent(new Event("scroll")); env.flush();
      expect(controller.read().progress).toBeCloseTo(15 / 16);
      env.view.scrollY = 1700;
      env.view.dispatchEvent(new Event("scroll")); env.flush();
      expect(controller.read().progress).toBe(1);
    } finally { controller.dispose(); }
  });

  it("remeasures on chart resize and viewport resize, including restored scroll", () => {
    const env = environment();
    env.view.scrollY = 1700;
    const controller = createTroiNamProgress(env.root)!;
    try {
      expect(env.observed).toContain(env.chart);
      expect(controller.read().progress).toBe(1);
      env.chart.offsetHeight = 600;
      env.resizeChart(); env.flush();
      expect(controller.read().range.end).toBe(1800);
      expect(controller.read().progress).toBeCloseTo(16 / 17);
      env.view.innerHeight = 600;
      env.view.dispatchEvent(new Event("resize")); env.flush();
      expect(controller.read().range.end).toBe(1900);
    } finally { controller.dispose(); }
    expect(env.observed).toEqual([]);
    expect(env.attributes.has("data-troi-nam-progress")).toBe(false);
  });

  it("does not start enhancement without the real chart target", () => {
    const env = environment(false);
    const controller = createTroiNamProgress(env.root);
    try { expect(controller).toBeNull(); }
    finally { controller?.dispose(); }
  });
});
