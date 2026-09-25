import { describe, expect, it } from "vitest";

import { computeMarqueeGeometry, MARQUEE_SPEED_PX_PER_SECOND } from "./homepage-v3-marquee-geometry";

const VIEWPORTS = [320, 360, 375, 768, 1024, 1440, 1920, 2560, 3840, 5120];
const CYCLES = [180, 420, 680, 920, 1260, 5000];

describe("computeMarqueeGeometry", () => {
  it("keeps the two equal groups covering the viewport at every offset", () => {
    for (const viewport of VIEWPORTS) {
      for (const cycle of CYCLES) {
        const geometry = computeMarqueeGeometry(viewport, cycle)!;
        const group = geometry.copies * cycle;
        expect(group).toBeGreaterThan(viewport);
        for (let step = 0; step <= 100; step += 1) {
          const offset = (-group * step) / 100;
          expect(offset).toBeLessThanOrEqual(0);
          expect(offset + group * 2).toBeGreaterThanOrEqual(viewport);
        }
      }
    }
  });

  it("travels at the same speed regardless of viewport width", () => {
    for (const viewport of VIEWPORTS) {
      const geometry = computeMarqueeGeometry(viewport, 680)!;
      expect((geometry.copies * 680) / geometry.seconds).toBeCloseTo(MARQUEE_SPEED_PX_PER_SECOND, 5);
    }
  });

  it("returns null until both widths are measurable", () => {
    expect(computeMarqueeGeometry(0, 680)).toBeNull();
    expect(computeMarqueeGeometry(1440, 0)).toBeNull();
    expect(computeMarqueeGeometry(Number.NaN, 680)).toBeNull();
  });
});
