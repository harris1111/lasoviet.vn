export const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

/** Offset in px, 0 when the element's centre is at the viewport centre, capped at ±max. */
export function parallaxOffset(box: { top: number; height: number }, viewportHeight: number, max: number): number {
  const centre = box.top + box.height / 2;
  const progress = (centre - viewportHeight / 2) / viewportHeight;
  return clamp(progress * max * 2, -max, max);
}

/** Pointer position relative to the element centre, each axis -1..1. */
export function pointerVector(
  x: number,
  y: number,
  box: { left: number; top: number; width: number; height: number },
): { x: number; y: number } {
  if (box.width <= 0 || box.height <= 0) return { x: 0, y: 0 };
  return {
    x: clamp(((x - box.left) / box.width) * 2 - 1, -1, 1),
    y: clamp(((y - box.top) / box.height) * 2 - 1, -1, 1),
  };
}
