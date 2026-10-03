import { describe, expect, it } from "vitest";

import { shouldSimplifyMotion } from "./troi-nam-motion";

const capable = { prefersReducedMotion: false, hasIntersectionObserver: true, deviceMemory: 8, hardwareConcurrency: 8 };

describe("shouldSimplifyMotion", () => {
  it("keeps the motion on a capable device with no preference against it", () => {
    expect(shouldSimplifyMotion(capable)).toBe(false);
    expect(shouldSimplifyMotion({ prefersReducedMotion: false, hasIntersectionObserver: true })).toBe(false);
  });

  it("steps aside for reduced motion, data saver and missing IntersectionObserver", () => {
    expect(shouldSimplifyMotion({ ...capable, prefersReducedMotion: true })).toBe(true);
    expect(shouldSimplifyMotion({ ...capable, saveData: true })).toBe(true);
    expect(shouldSimplifyMotion({ ...capable, hasIntersectionObserver: false })).toBe(true);
  });

  it("steps aside on devices that look underpowered", () => {
    expect(shouldSimplifyMotion({ ...capable, deviceMemory: 2 })).toBe(true);
    expect(shouldSimplifyMotion({ ...capable, hardwareConcurrency: 2 })).toBe(true);
    expect(shouldSimplifyMotion({ ...capable, deviceMemory: 4, hardwareConcurrency: 4 })).toBe(false);
  });
});
