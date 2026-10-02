import { describe, expect, it, vi } from "vitest";
import * as THREE from "three";

import { createChartProjection, projectChartRing } from "./troi-nam-world-ring";
import { createWorldScheduler, initializeWorld } from "./troi-nam-world-runtime";
import { createWorldTextures } from "./troi-nam-world-textures";
import type { WorldHandle } from "./troi-nam-world-types";

function mockHandle(): WorldHandle {
  return { resize: vi.fn(), setProgress: vi.fn(), setChartTarget: vi.fn(), setActive: vi.fn(), dispose: vi.fn() };
}

describe("painted world runtime contracts", () => {
  it("rejects a failed required texture while another request hangs, and disposes its late callback", async () => {
    const callbacks: Array<{ ok: (texture: THREE.Texture<HTMLImageElement>) => void; fail: (error: unknown) => void; texture: THREE.Texture<HTMLImageElement> }> = [];
    const textures = createWorldTextures({ load: (_url, ok, _progress, fail) => {
      const texture = new THREE.Texture<HTMLImageElement>();
      vi.spyOn(texture, "dispose");
      callbacks.push({ ok: ok!, fail: fail!, texture });
      return texture;
    } });
    textures.load("fails"); textures.load("hangs");
    let failure: unknown;
    const barrier = textures.ready().catch((error: unknown) => { failure = error; });
    const expected = new Error("required art unavailable");
    callbacks[0]!.fail(expected);
    for (let tick = 0; tick < 6; tick++) await Promise.resolve();
    try {
      expect(failure).toBe(expected);
    } finally {
      textures.dispose();
      callbacks[1]!.ok(callbacks[1]!.texture);
      await barrier;
    }
    expect(callbacks[1]!.texture.dispose).toHaveBeenCalledTimes(2);
  });
  it("projects one square and twelve evenly spaced targets inside a non-square chart, after refreshing the camera", () => {
    const camera = new THREE.PerspectiveCamera(50, 2, 0.1, 100);
    camera.position.set(1, 3, 7);
    camera.lookAt(0, 1, -3);
    const output = createChartProjection();
    const targets = output.targets;
    const corners = output.corners;
    const rect = { x: 230, y: 140, width: 500, height: 300 };
    projectChartRing(camera, rect, 1000, 500, output);
    const screen = (values: Float32Array, i: number) => {
      const v = new THREE.Vector3().fromArray(values, i * 3).project(camera);
      return { x: (v.x + 1) * 500, y: (1 - v.y) * 250 };
    };
    const a = screen(corners, 0);
    const b = screen(corners, 1);
    const c = screen(corners, 2);
    expect(b.x - a.x).toBeCloseTo(300, 3);
    expect(a.y - c.y).toBeCloseTo(300, 3);
    for (let i = 0; i < 12; i++) {
      const point = screen(targets, i);
      expect(Math.hypot(point.x - 480, point.y - 290)).toBeCloseTo(150 * 0.86, 3);
      const next = screen(targets, (i + 1) % 12);
      expect(Math.hypot(point.x - next.x, point.y - next.y)).toBeCloseTo(2 * 129 * Math.sin(Math.PI / 12), 3);
    }
    const before = targets.slice();
    projectChartRing(camera, rect, 1000, 500, output);
    expect(output.targets).toBe(targets);
    expect(output.corners).toBe(corners);
    expect(targets).toEqual(before);
  });

  it("caps low from its first frame and degrades high then low after sustained poor frames", () => {
    const low = createWorldScheduler("low");
    expect(low.shouldRender(100)).toBe(true);
    expect(low.shouldRender(110)).toBe(false);
    expect(low.shouldRender(134)).toBe(true);
    for (let now = 200; now <= 2300; now += 100) low.recordFrame(now, 100);
    expect(low.tier).toBe("static");
    const high = createWorldScheduler("high");
    for (let now = 100; now <= 2200; now += 100) high.recordFrame(now, 100);
    expect(high.tier).toBe("low");
    high.reset();
    high.recordFrame(6000, 0);
    expect(high.tier).toBe("low");
  });

  it("never invokes the loaded factory after cancellation", async () => {
    let cancelled = false;
    const factory = vi.fn(async () => mockHandle());
    const run = initializeWorld({ load: async () => { cancelled = true; return factory; }, cancelled: () => cancelled, prepare: vi.fn(), ready: vi.fn(), failure: vi.fn() });
    await run;
    expect(factory).not.toHaveBeenCalled();
  });

  it("disposes an in-flight handle and catches synchronous preparation failure without ready", async () => {
    const handle = mockHandle();
    const ready = vi.fn();
    const failure = vi.fn();
    await initializeWorld({ load: async () => async () => handle, cancelled: () => false, prepare: () => { throw new Error("resize"); }, ready, failure });
    expect(handle.dispose).toHaveBeenCalledOnce();
    expect(failure).toHaveBeenCalledOnce();
    expect(ready).not.toHaveBeenCalled();
    let cancelled = false;
    const late = mockHandle();
    await initializeWorld({ load: async () => async () => { cancelled = true; return late; }, cancelled: () => cancelled, prepare: vi.fn(), ready, failure });
    expect(late.dispose).toHaveBeenCalledOnce();
  });

  it("waits for every required texture, rejects failures, and disposes late loads", async () => {
    const callbacks: Array<{ ok: (t: THREE.Texture<HTMLImageElement>) => void; fail: (e: unknown) => void; texture: THREE.Texture<HTMLImageElement> }> = [];
    const textures = createWorldTextures({ load: (_url, ok, _progress, fail) => {
      const texture = new THREE.Texture<HTMLImageElement>();
      vi.spyOn(texture, "dispose");
      callbacks.push({ ok: ok!, fail: fail!, texture });
      return texture;
    } });
    textures.load("one");
    textures.load("two");
    let settled = false;
    const ready = textures.ready().finally(() => { settled = true; });
    callbacks[0]!.ok(callbacks[0]!.texture);
    await Promise.resolve();
    expect(settled).toBe(false);
    callbacks[1]!.fail(new Error("required texture failed"));
    await expect(ready).rejects.toThrow("required texture failed");
    textures.dispose();
    expect(callbacks[0]!.texture.dispose).toHaveBeenCalled();
    expect(callbacks[1]!.texture.dispose).toHaveBeenCalled();
  });
});
