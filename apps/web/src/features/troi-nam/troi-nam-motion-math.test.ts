import { describe, expect, it } from "vitest";
import { clampProgress, scenePhases, scrollProgress, smoothstep, textDim } from "./troi-nam-motion-math";

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

describe("textDim", () => {
  const vh = 900;
  it("is 0 with no text, with text off screen and with an invalid viewport", () => {
    expect(textDim([], vh)).toBe(0);
    expect(textDim([{ top: 1200, bottom: 1800 }], vh)).toBe(0);
    expect(textDim([{ top: -700, bottom: -100 }], vh)).toBe(0);
    expect(textDim([{ top: 0, bottom: 400 }], 0)).toBe(0);
  });

  it("reaches 1 once a block is clearly on screen and rises gradually before that", () => {
    expect(textDim([{ top: 100, bottom: 700 }], vh)).toBe(1);
    const peeking = textDim([{ top: 800, bottom: 1400 }], vh); // 100px of a 600px block
    const half = textDim([{ top: 600, bottom: 1200 }], vh); // 300px of it
    expect(peeking).toBeGreaterThan(0);
    expect(half).toBeGreaterThan(peeking);
    expect(half).toBeLessThanOrEqual(1);
  });

  it("uses the strongest block and ignores empty ones", () => {
    expect(textDim([{ top: 1500, bottom: 1900 }, { top: 100, bottom: 600 }, { top: 50, bottom: 50 }], vh)).toBe(1);
  });
});
