import { describe, expect, it } from "vitest";

import { clamp, parallaxOffset, pointerVector } from "./homepage-v3-motion-math";

describe("motion math", () => {
  it("clamps", () => {
    expect(clamp(5, 0, 3)).toBe(3);
    expect(clamp(-1, 0, 3)).toBe(0);
    expect(clamp(2, 0, 3)).toBe(2);
  });

  it("parallax is 0 when the element is centred in the viewport and capped at ±max", () => {
    expect(parallaxOffset({ top: 400, height: 100 }, 900, 24)).toBeCloseTo(0, 5);
    expect(parallaxOffset({ top: 2000, height: 100 }, 900, 24)).toBe(24);
    expect(parallaxOffset({ top: -2000, height: 100 }, 900, 24)).toBe(-24);
  });

  it("pointer vector is -1..1 from the element centre", () => {
    const box = { left: 100, top: 100, width: 200, height: 100 };
    expect(pointerVector(200, 150, box)).toEqual({ x: 0, y: 0 });
    expect(pointerVector(300, 200, box)).toEqual({ x: 1, y: 1 });
    expect(pointerVector(0, 0, box)).toEqual({ x: -1, y: -1 });
  });

  it("pointer vector survives a zero-size box", () => {
    expect(pointerVector(10, 10, { left: 0, top: 0, width: 0, height: 0 })).toEqual({ x: 0, y: 0 });
  });
});
