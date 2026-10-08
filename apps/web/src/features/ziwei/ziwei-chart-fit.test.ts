import { describe, expect, it } from "vitest";

import { fitBoard, stepZoom, zoomForKey, ZOOM_MAX, ZOOM_MIN } from "./ziwei-chart-fit";

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
  it("maps + - 0 to zoom steps and ignores other keys", () => {
    expect(zoomForKey(1, "+")).toBe(1.25);
    expect(zoomForKey(1, "-")).toBe(0.75);
    expect(zoomForKey(2.5, "0")).toBe(1);
    expect(zoomForKey(1, "a")).toBeNull();
  });
  it("tolerates an unmeasured container", () => {
    expect(fitBoard(0, 1)).toEqual({ layoutWidth: 560, scale: 1 });
  });
  it("fits height as well so all 12 cells show at common viewports", () => {
    // [sheet viewport width, sheet viewport height] for 1024x768, 1280x720, 1440x900 and 390x844 windows.
    const cases: Array<[number, number]> = [[560, 560], [760, 480], [900, 740], [358, 640]];
    for (const [width, height] of cases) {
      const layoutWidth = Math.min(820, Math.max(560, width));
      const boardHeight = layoutWidth * 0.95; // 4 rows of ~150px+ at the design width
      const fitted = fitBoard(width, 1, height, boardHeight);
      expect(boardHeight * fitted.scale).toBeLessThanOrEqual(height + 0.5);
      expect(fitted.layoutWidth * fitted.scale).toBeLessThanOrEqual(width + 0.5);
    }
  });
  it("ignores the height until the board is measured", () => {
    expect(fitBoard(700, 1, 0, 600)).toEqual(fitBoard(700, 1));
    expect(fitBoard(700, 1, 500, 0)).toEqual(fitBoard(700, 1));
  });
});
