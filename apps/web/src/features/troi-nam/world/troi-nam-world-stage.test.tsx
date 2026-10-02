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
  hooks.refs = [{ closest: () => root, querySelector: () => chart }, sticky, {}];
  vi.stubGlobal("window", Object.assign(new EventTarget(), {
    location: { search: "" }, devicePixelRatio: 1, WebGLRenderingContext: class {},
    matchMedia: () => Object.assign(new EventTarget(), { matches: false }),
  }));
  vi.stubGlobal("document", Object.assign(new EventTarget(), { visibilityState: "visible" }));
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
    expect(root.setAttribute).toHaveBeenCalledWith("data-troi-nam-world-ready", "");
    expect(rendered).toEqual({ progress: 0.94, chart: { x: 570, y: 300, width: 300, height: 300 } });
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
