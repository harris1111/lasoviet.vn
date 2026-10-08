// Enlarged chart: the board keeps a design width and is scaled to the sheet, so no cell is ever cropped.
export const BOARD_MIN_LAYOUT_WIDTH = 560;
export const BOARD_MAX_LAYOUT_WIDTH = 820;
export const ZOOM_MIN = 0.6;
export const ZOOM_MAX = 3;
export const ZOOM_STEP = 0.25;

export function fitBoard(containerWidth: number, zoom: number): { layoutWidth: number; scale: number } {
  const width = Math.max(0, containerWidth);
  const layoutWidth = Math.min(BOARD_MAX_LAYOUT_WIDTH, Math.max(BOARD_MIN_LAYOUT_WIDTH, width));
  // Fit-to-width never exceeds 1.6x, and zoom multiplies the fitted size.
  const fit = width === 0 ? 1 : Math.min(1.6, width / layoutWidth);
  return { layoutWidth, scale: Math.round(fit * zoom * 1000) / 1000 };
}

// Keyboard on the enlarged chart: "+" "-" step, "0" returns to fit-to-frame. Anything else is ignored.
export function zoomForKey(zoom: number, key: string): number | null {
  if (key === "+" || key === "=") return stepZoom(zoom, 1);
  if (key === "-" || key === "_") return stepZoom(zoom, -1);
  if (key === "0") return 1;
  return null;
}

export function stepZoom(zoom: number, direction: 1 | -1): number {
  const next = Math.round((zoom + direction * ZOOM_STEP) * 100) / 100;
  return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, next));
}
