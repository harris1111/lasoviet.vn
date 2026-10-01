import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as THREE from "three";
import { createTroiNamWorld } from "./troi-nam-world-scene";

const rendererState = vi.hoisted(() => ({ instances: [] as Array<{ dispose: ReturnType<typeof vi.fn>; forceContextLoss: ReturnType<typeof vi.fn>; render: ReturnType<typeof vi.fn>; setRenderTarget: ReturnType<typeof vi.fn> }> }));
vi.mock("three", async (importOriginal) => {
  const actual = await importOriginal<typeof import("three")>();
  class Renderer {
    capabilities = { getMaxAnisotropy: () => 4 };
    ratio = 1;
    width = 1;
    height = 1;
    render = vi.fn();
    dispose = vi.fn();
    forceContextLoss = vi.fn();
    constructor() { rendererState.instances.push(this); }
    setPixelRatio(value: number) { this.ratio = value; }
    getPixelRatio() { return this.ratio; }
    setSize(width: number, height: number) { this.width = width; this.height = height; }
    getDrawingBufferSize(target: THREE.Vector2) { return target.set(Math.floor(this.width * this.ratio), Math.floor(this.height * this.ratio)); }
    setRenderTarget = vi.fn();
  }
  return { ...actual, WebGLRenderer: Renderer };
});

type Pending = { texture: THREE.Texture<HTMLImageElement>; ok: (texture: THREE.Texture<HTMLImageElement>) => void; fail: (error: unknown) => void };
let pending: Pending[];
let frames: Map<number, FrameRequestCallback>;
function canvas() { return Object.assign(new EventTarget(), { clientWidth: 1440, clientHeight: 900 }) as unknown as HTMLCanvasElement; }
async function loadedWorld(quality: "high" | "low" = "high") {
  const failure = vi.fn();
  const onOpacity = vi.fn();
  const promise = createTroiNamWorld(canvas(), { quality, seed: 1, onFailure: failure, onOpacity, diagnostics: true });
  pending.forEach(({ texture, ok }) => ok(texture));
  return { handle: await promise, failure, onOpacity };
}
function frame(now: number) {
  const queued = [...frames.values()]; frames.clear();
  queued.forEach((callback) => callback(now));
}

beforeEach(() => {
  pending = []; frames = new Map(); rendererState.instances.length = 0;
  let id = 0;
  vi.stubGlobal("requestAnimationFrame", vi.fn((callback: FrameRequestCallback) => { frames.set(++id, callback); return id; }));
  vi.stubGlobal("cancelAnimationFrame", vi.fn((key: number) => { frames.delete(key); }));
  vi.spyOn(THREE.TextureLoader.prototype, "load").mockImplementation((_url, ok, _progress, fail) => {
    const texture = new THREE.Texture<HTMLImageElement>(); vi.spyOn(texture, "dispose");
    pending.push({ texture, ok: ok!, fail: fail! });
    return texture;
  });
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe("world factory lifecycle and projection", () => {
  it("keeps the high-tier scene target and final output pass when rays are disabled and at the cutoff", async () => {
    const { handle } = await loadedWorld();
    const renderer = rendererState.instances[0]!;
    const sceneTarget = renderer.setRenderTarget.mock.calls.at(-2)![0];
    expect(sceneTarget).toBeInstanceOf(THREE.WebGLRenderTarget);
    try {
      for (const progress of [0.15, 0.599999, 0.6, 0.75]) {
        handle.setProgress(progress);
        handle.setDebug!({ rays: false });
        renderer.setRenderTarget.mockClear(); renderer.render.mockClear();
        handle.resize(1440, 900, 1);
        expect(renderer.setRenderTarget.mock.calls.map(([target]) => target)).toEqual([sceneTarget, null]);
        expect(renderer.render).toHaveBeenCalledTimes(2);
        const finalScene = renderer.render.mock.calls.at(-1)![0] as THREE.Scene;
        const material = (finalScene.children[0] as THREE.Mesh).material as THREE.ShaderMaterial;
        expect(material.uniforms.uScene!.value).toBe(sceneTarget.texture);
        expect(material.uniforms.uStrength!.value).toBe(0);
        handle.setDebug!({ rays: true });
        renderer.setRenderTarget.mockClear();
        handle.resize(1440, 900, 1);
        expect(renderer.setRenderTarget.mock.calls.slice(-2).map(([target]) => target)).toEqual([sceneTarget, null]);
      }
    } finally { handle.dispose(); }
  });
  it("releases every context across ten mounts without duplicate fallback or RAF", async () => {
    for (let mount = 0; mount < 10; mount++) {
      const { handle, failure } = await loadedWorld();
      handle.dispose(); handle.dispose();
      expect(failure).not.toHaveBeenCalled();
      expect(frames.size).toBe(0);
    }
    expect(rendererState.instances).toHaveLength(10);
    for (const renderer of rendererState.instances) {
      expect(renderer.dispose).toHaveBeenCalledOnce();
      expect(renderer.forceContextLoss).toHaveBeenCalledOnce();
    }
  });
  it("holds readiness for required art and rejects a missing asset with complete disposal", async () => {
    const failure = vi.fn();
    const promise = createTroiNamWorld(canvas(), { quality: "high", seed: 1, onFailure: failure });
    expect(frames.size).toBe(0);
    pending.slice(1).forEach(({ texture, ok }) => ok(texture));
    pending[0]!.fail(new Error("missing W04"));
    await expect(promise).rejects.toThrow("missing W04");
    expect(failure).toHaveBeenCalledOnce();
    expect(rendererState.instances[0]!.dispose).toHaveBeenCalledOnce();
    expect(rendererState.instances[0]!.forceContextLoss).toHaveBeenCalledOnce();
    expect(pending.every(({ texture }) => vi.mocked(texture.dispose).mock.calls.length > 0)).toBe(true);
    expect(frames.size).toBe(0);
  });

  it("aborts and disposes before delayed required textures settle, including late callbacks", async () => {
    const abort = new AbortController();
    const failure = vi.fn();
    const promise = createTroiNamWorld(canvas(), { quality: "high", seed: 1, onFailure: failure, signal: abort.signal });
    abort.abort();
    await expect(promise).rejects.toThrow("cancelled");
    expect(rendererState.instances[0]!.dispose).toHaveBeenCalledOnce();
    expect(rendererState.instances[0]!.forceContextLoss).toHaveBeenCalledOnce();
    expect(pending.every(({ texture }) => vi.mocked(texture.dispose).mock.calls.length > 0)).toBe(true);
    pending.forEach(({ texture, ok }) => ok(texture));
    await Promise.resolve();
    expect(frames.size).toBe(0);
    expect(failure).not.toHaveBeenCalled();
  });

  it("only uploads ring targets after chart begins and when inputs change; fade reverses", async () => {
    const { handle, onOpacity } = await loadedWorld();
    handle.resize(1440, 900, 1.5);
    handle.setChartTarget({ x: 880, y: 140, width: 460, height: 500 });
    handle.setProgress(0.7); frame(100);
    expect(handle.getDiagnostics!().targetUploads).toBe(0);
    handle.setProgress(0.9); frame(116);
    expect(handle.getDiagnostics!().targetUploads).toBe(1);
    const targets = handle.getDiagnostics!().ringTargets;
    frame(132); frame(148);
    expect(handle.getDiagnostics!().targetUploads).toBe(1);
    handle.setChartTarget({ x: 880, y: 140, width: 460, height: 500 }); frame(164);
    expect(handle.getDiagnostics!().targetUploads).toBe(1);
    handle.setProgress(1); frame(180);
    expect(onOpacity).toHaveBeenLastCalledWith(0);
    handle.setProgress(0.9); frame(196);
    expect(handle.getDiagnostics!().ringTargets).toEqual(targets);
    expect(handle.getDiagnostics!().opacity).toBe(1);
    expect(handle.getDiagnostics!().drawingBuffer).toEqual({ width: 2160, height: 1350 });
    expect(handle.getDiagnostics!().rayBuffer).toEqual({ width: 1080, height: 675 });
    handle.dispose(); expect(frames.size).toBe(0);
  });

  it("starts low at 30fps with no rays, and falls back once after sustained poor frames", async () => {
    const { handle, failure } = await loadedWorld("low");
    handle.resize(390, 844, 2);
    const renderer = rendererState.instances[0]!;
    renderer.render.mockClear();
    frame(100); frame(108); frame(116); frame(124); frame(134);
    expect(renderer.render).toHaveBeenCalledTimes(2);
    expect(handle.getDiagnostics!().rayBuffer).toBeNull();
    expect(handle.getDiagnostics!().drawingBuffer).toEqual({ width: 390, height: 844 });
    for (let now = 234; now <= 2434; now += 100) frame(now);
    expect(failure).toHaveBeenCalledOnce();
    expect(renderer.dispose).toHaveBeenCalledOnce();
    expect(frames.size).toBe(0);
  });

  it("falls back on a render error without leaving a scheduled frame", async () => {
    const { handle, failure } = await loadedWorld();
    rendererState.instances[0]!.render.mockImplementation(() => { throw new Error("GPU render"); });
    handle.resize(390, 844, 1);
    expect(failure).toHaveBeenCalledOnce();
    handle.dispose();
    expect(frames.size).toBe(0);
  });
});
