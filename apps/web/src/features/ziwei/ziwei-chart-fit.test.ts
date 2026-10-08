import { describe, expect, it } from "vitest";

import { fitBoard, stepZoom, ZOOM_MAX, ZOOM_MIN } from "./ziwei-chart-fit";

describe("enlarged chart fits the sheet width", () => {
  it("never lets the scaled board exceed the container at the fitted zoom (no cropped cells)", () => {
    for (const width of [358, 390, 768, 1024, 1280, 1440]) {
      const { layoutWidth, scale } = fitBoard(width, 1);
      expect(layoutWidth * scale).toBeLessThanOrEqual(width + 0.5);
    }
  });
  it("scales phones down from the 560px design width and large screens up to at most 1.6x", () => {
    expect(fitBoard(390, 1).scale).toBeCloseTo(390 / 560, 2);
    expect(fitBoard(2400, 1).scale).toBe(1.6);
    expect(fitBoard(700, 1)).toEqual({ layoutWidth: 700, scale: 1 });
  });
  it("zoom multiplies the fitted size and stays inside the limits", () => {
    expect(fitBoard(560, 2).scale).toBe(2);
    expect(stepZoom(1, 1)).toBe(1.25);
    expect(stepZoom(ZOOM_MAX, 1)).toBe(ZOOM_MAX);
    expect(stepZoom(ZOOM_MIN, -1)).toBe(ZOOM_MIN);
  });
  it("tolerates an unmeasured container", () => {
    expect(fitBoard(0, 1)).toEqual({ layoutWidth: 560, scale: 1 });
  });
});
