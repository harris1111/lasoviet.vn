/** Travel speed of the homepage chip rows, in CSS px per second. */
export const MARQUEE_SPEED_PX_PER_SECOND = 48;

export interface MarqueeGeometry {
  /** How many label cycles one group repeats. */
  copies: number;
  /** Duration of one full loop (one group width) at constant speed. */
  seconds: number;
}

/**
 * The track holds two identical groups and slides exactly one group width.
 * A group must therefore be wider than the viewport, or the right edge shows a gap mid-loop.
 */
export function computeMarqueeGeometry(viewportWidth: number, cycleWidth: number): MarqueeGeometry | null {
  if (!(viewportWidth > 0) || !(cycleWidth > 0)) return null;
  const copies = Math.max(1, Math.ceil(viewportWidth / cycleWidth) + 1);
  return { copies, seconds: (copies * cycleWidth) / MARQUEE_SPEED_PX_PER_SECOND };
}
