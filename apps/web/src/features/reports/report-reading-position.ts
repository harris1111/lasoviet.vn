// A section is "being read" once its top passes 35% of the viewport.
export const READING_LINE_RATIO = 0.35;

export function resolveActiveSectionIndex(
  sectionTops: readonly number[],
  viewportHeight: number,
  atBottom: boolean,
): number {
  if (sectionTops.length === 0) return -1;
  if (atBottom) return sectionTops.length - 1;
  const line = viewportHeight * READING_LINE_RATIO;
  let active = -1;
  sectionTops.forEach((top, index) => {
    if (top < line) active = index;
  });
  return active;
}
