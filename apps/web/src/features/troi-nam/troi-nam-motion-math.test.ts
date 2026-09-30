import { describe, expect, it } from "vitest";
import { clampProgress, scenePhases, scrollProgress, smoothstep } from "./troi-nam-motion-math";

describe("Trời Nam scroll contract", () => {
  it("clamps finite progress and rejects non-finite input", () => {
    const cases: Array<[number, number]> = [[-1, 0], [0.5, 0.5], [2, 1], [NaN, 0], [Infinity, 0]];
    for (const [input, output] of cases) {
      expect(clampProgress(input)).toBe(output);
    }
  });

  it("uses the declared phase boundaries and smoothstep midpoints", () => {
    expect(scenePhases(0)).toEqual({ dusk: 0, night: 0, chart: 0 });
    expect(scenePhases(0.375)).toEqual({ dusk: 0.5, night: 0, chart: 0 });
    expect(scenePhases(0.625)).toEqual({ dusk: 1, night: 0.5, chart: 0 });
    expect(scenePhases(0.875)).toEqual({ dusk: 1, night: 1, chart: 0.5 });
    expect(scenePhases(1)).toEqual({ dusk: 1, night: 1, chart: 1 });
  });

  it("keeps light weights normalized across the journey", () => {
    for (let i = 0; i <= 100; i++) {
      const { dusk, night } = scenePhases(i / 100);
      expect((1 - dusk) + dusk * (1 - night) + night).toBeCloseTo(1, 10);
    }
  });

  it("smoothsteps to 0/1 outside its bounds and eases monotonically between them", () => {
    expect(smoothstep(0, 0.2, 0.6)).toBe(0);
    expect(smoothstep(0.1, 0.2, 0.6)).toBe(0);
    expect(smoothstep(0.6, 0.2, 0.6)).toBe(1);
    expect(smoothstep(1, 0.2, 0.6)).toBe(1);
    expect(smoothstep(0.4, 0.2, 0.6)).toBeCloseTo(0.5, 10);
    let previous = -1;
    for (let i = 0; i <= 100; i++) {
      const value = smoothstep(i / 100, 0.2, 0.6);
      expect(value).toBeGreaterThanOrEqual(previous);
      previous = value;
    }
  });

  it("uses document offsets and returns dawn for invalid geometry", () => {
    expect(scrollProgress(600, { start: 100, end: 1100 })).toBe(0.5);
    expect(scrollProgress(2000, { start: 100, end: 1100 })).toBe(1);
    expect(scrollProgress(-100, { start: 100, end: 1100 })).toBe(0);
    expect(scrollProgress(10, { start: 20, end: 20 })).toBe(0);
    expect(scrollProgress(10, { start: 20, end: 10 })).toBe(0);
    expect(scrollProgress(NaN, { start: 0, end: 10 })).toBe(0);
  });
});
