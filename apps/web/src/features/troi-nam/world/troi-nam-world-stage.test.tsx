import { afterEach, expect, it, vi } from "vitest";
import type { WorldHandle, WorldOptions } from "./troi-nam-world-types";

const hooks = vi.hoisted(() => ({ refs: [] as unknown[], effect: undefined as (() => void | (() => void)) | undefined, factory: vi.fn() }));
vi.mock("react", async (importOriginal) => ({
  ...await importOriginal<typeof import("react")>(),
  useRef: () => ({ current: hooks.refs.shift() }),
  useEffect: (effect: () => void | (() => void)) => { hooks.effect = effect; },
}));
vi.mock("./troi-nam-world-scene", () => ({ createTroiNamWorld: hooks.factory }));
import { TroiNamWorldStage } from "../troi-nam-world-stage";

afterEach(() => { vi.unstubAllGlobals(); hooks.factory.mockReset(); hooks.effect = undefined; });

function environment() {
  const root = Object.assign(new EventTarget(), {
    dataset: { troiNamProgress: "0.94" },
    style: { setProperty: vi.fn() },
    setAttribute: vi.fn(), removeAttribute: vi.fn(),
  });
  const sticky = { getBoundingClientRect: () => ({ left: 10, top: 20, width: 1440, height: 900 }) };
  const chart = { getBoundingClientRect: () => ({ left: 580, top: 320, width: 300, height: 300 }) };
  hooks.refs = [{ closest: () => root, querySelector: () => chart }, sticky, { appendChild() {} }];
  vi.stubGlobal("window", Object.assign(new EventTarget(), {
    location: { search: "" }, devicePixelRatio: 1, WebGLRenderingContext: class {},
    matchMedia: () => Object.assign(new EventTarget(), { matches: false }),
  }));
  vi.stubGlobal("document", Object.assign(new EventTarget(), { visibilityState: "visible", createElement: () => ({ remove() {} }) }));
  vi.stubGlobal("navigator", {});
  const Observer = class { observe() {} disconnect() {} };
  vi.stubGlobal("IntersectionObserver", Observer); vi.stubGlobal("ResizeObserver", Observer);
  return root;
}

it("renders the stored progress and canvas-local chart rect before revealing a reloaded world", async () => {
  const root = environment();
  let progress = 0;
  let chart: unknown;
  let rendered: unknown;
  const handle: WorldHandle = {
    setProgress: (value) => { progress = value; },
    setChartTarget: (value) => { chart = value; },
    resize: () => { rendered = { progress, chart }; },
    setActive: vi.fn(), dispose: vi.fn(),
  };
  hooks.factory.mockResolvedValue(handle);
  TroiNamWorldStage({ children: null });
  const cleanup = hooks.effect!();
  try {
    await vi.dynamicImportSettled();
    for (let tick = 0; tick < 12; tick++) await Promise.resolve();
    expect(root.setAttribute).toHaveBeenCalledWith("data-troi-nam-world-ready", "dark:1");
    expect(rendered).toEqual({ progress: 0.94, chart: { x: 570, y: 300, width: 300, height: 300 } });
  } finally { if (typeof cleanup === "function") cleanup(); }
});

it("keeps the latest generation alive when older theme loads finish or fail", async () => {
  const root = environment();
  let effective: "dark" | "light" = "dark";
  let change: (() => void) | undefined;
  window.__lsvTheme = {
    getSnapshot: () => ({ effective, preference: effective, source: "saved", ready: true, revision: 0 }),
    subscribe(listener) { change = listener; return () => { change = undefined; }; },
    choose() {}, refreshCapability() {},
  };
  const pending: Array<{ options: WorldOptions; resolve: (handle: WorldHandle) => void }> = [];
  hooks.factory.mockImplementation((_canvas, options) => new Promise<WorldHandle>(resolve => pending.push({ options, resolve })));
  TroiNamWorldStage({ children: null }); const cleanup = hooks.effect!();
  const flush = async () => { await vi.dynamicImportSettled(); for (let i = 0; i < 12; i++) await Promise.resolve(); };
  const makeHandle = (): WorldHandle => ({ setProgress: vi.fn(), setChartTarget: vi.fn(), resize: vi.fn(), setActive: vi.fn(), dispose: vi.fn() });
  try {
    await flush();
    for (let i = 0; i < 10; i++) { effective = effective === "light" ? "dark" : "light"; change!(); await flush(); }
    const newest = makeHandle(); pending.at(-1)!.resolve(newest); await flush();
    expect(root.setAttribute).toHaveBeenLastCalledWith("data-troi-nam-world-ready", "dark:11");
    expect(newest.setProgress).toHaveBeenCalledWith(.94);
    for (const old of pending.slice(0, -1)) {
      old.options.onFailure(); const handle = makeHandle(); old.resolve(handle); await flush();
      expect(handle.dispose).toHaveBeenCalledOnce();
    }
    expect(newest.dispose).not.toHaveBeenCalled();
    expect(root.setAttribute).toHaveBeenLastCalledWith("data-troi-nam-world-ready", "dark:11");
  } finally { if (typeof cleanup === "function") cleanup(); }
});

it("falls back without revealing a world when the viewport allocation cannot fit", async () => {
  const root = environment();
  const handle: WorldHandle = { setProgress: vi.fn(), setChartTarget: vi.fn(), resize() { throw Error("Light world scene budget exceeded"); }, setActive: vi.fn(), dispose: vi.fn() };
  hooks.factory.mockResolvedValue(handle);
  TroiNamWorldStage({ children: null }); const cleanup = hooks.effect!();
  try {
    await vi.dynamicImportSettled(); for (let i = 0; i < 12; i++) await Promise.resolve();
    expect(handle.dispose).toHaveBeenCalled();
    expect(root.setAttribute).not.toHaveBeenCalled();
    expect(root.removeAttribute).toHaveBeenCalledWith("data-troi-nam-world-ready");
  } finally { if (typeof cleanup === "function") cleanup(); }
});

it("does not reveal or dereference a cleared handle after synchronous resize fallback", async () => {
  const root = environment();
  let options: WorldOptions;
  const handle: WorldHandle = { resize: () => options.onFailure(), setProgress: vi.fn(), setChartTarget: vi.fn(), setActive: vi.fn(), dispose: vi.fn() };
  hooks.factory.mockImplementation(async (_canvas: HTMLCanvasElement, nextOptions: WorldOptions) => { options = nextOptions; return handle; });
  TroiNamWorldStage({ children: null });
  const cleanup = hooks.effect!();
  try {
    await vi.dynamicImportSettled();
    for (let tick = 0; tick < 12; tick++) await Promise.resolve();
    expect(root.setAttribute).not.toHaveBeenCalled();
    expect(root.removeAttribute).toHaveBeenCalledWith("data-troi-nam-world-ready");
    expect(handle.dispose).toHaveBeenCalled();
  } finally { if (typeof cleanup === "function") cleanup(); }
});
