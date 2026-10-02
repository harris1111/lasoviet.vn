import { describe, expect, it } from "vitest";
import type { ReportChartPalaceV1 } from "@lasoviet/contracts";
import { nextChartPalace, reportChartPosition } from "./report-chart-navigation";

const branches = ["snake", "horse", "goat", "monkey", "dragon", "rooster", "rabbit", "dog", "tiger", "ox", "rat", "pig"];
const palaces = branches.map((branch) => ({ palaceId: branch, earthlyBranchId: `ziwei.branch.${branch}` })) as unknown as ReportChartPalaceV1[];

describe("chart keyboard navigation", () => {
  it("moves geometrically and skips the empty centre", () => {
    expect(nextChartPalace(palaces, "dragon", "ArrowRight")).toBe("rooster");
    expect(nextChartPalace(palaces, "horse", "ArrowDown")).toBe("ox");
    expect(nextChartPalace(palaces, "ox", "ArrowUp")).toBe("horse");
    expect(nextChartPalace(palaces, "snake", "ArrowRight")).toBe("horse");
  });
  it("wraps a row or column while leaving Enter for native activation", () => {
    expect(nextChartPalace(palaces, "snake", "ArrowLeft")).toBe("monkey");
    expect(nextChartPalace(palaces, "snake", "ArrowUp")).toBe("tiger");
    expect(nextChartPalace(palaces, "snake", "Enter")).toBeNull();
    expect(nextChartPalace(palaces, "unknown", "ArrowRight")).toBeNull();
    expect(reportChartPosition("ziwei.branch.unknown")).toBeUndefined();
  });
});
