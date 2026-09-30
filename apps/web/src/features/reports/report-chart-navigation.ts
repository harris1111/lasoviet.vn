import type { ReportChartPalaceV1 } from "@lasoviet/contracts";

// Traditional chart positions, with the four central cells left empty.
const POSITIONS: Record<string, readonly [number, number]> = {
  snake: [1, 1], horse: [1, 2], goat: [1, 3], monkey: [1, 4],
  dragon: [2, 1], rooster: [2, 4], rabbit: [3, 1], dog: [3, 4],
  tiger: [4, 1], ox: [4, 2], rat: [4, 3], pig: [4, 4],
};

export function reportChartPosition(branchId: string): readonly [number, number] | undefined {
  return POSITIONS[branchId.split(".").at(-1) ?? ""];
}

export function nextChartPalace(
  palaces: readonly ReportChartPalaceV1[],
  currentId: string,
  key: string,
): string | null {
  if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(key)) return null;
  const current = palaces.find((palace) => palace.palaceId === currentId);
  const position = current && reportChartPosition(current.earthlyBranchId);
  if (!position) return null;
  const horizontal = key === "ArrowLeft" || key === "ArrowRight";
  const laneAxis = horizontal ? 0 : 1;
  const moveAxis = horizontal ? 1 : 0;
  const lane = palaces.flatMap((palace) => {
    const point = reportChartPosition(palace.earthlyBranchId);
    return point && point[laneAxis] === position[laneAxis] ? [{ id: palace.palaceId, point }] : [];
  }).sort((a, b) => a.point[moveAxis] - b.point[moveAxis]);
  const index = lane.findIndex((palace) => palace.id === currentId);
  const step = key === "ArrowRight" || key === "ArrowDown" ? 1 : -1;
  return lane[(index + step + lane.length) % lane.length]?.id ?? null;
}
