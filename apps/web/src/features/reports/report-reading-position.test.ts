import { describe, expect, it } from "vitest";

import { resolveActiveSectionIndex } from "./report-reading-position";

describe("resolveActiveSectionIndex", () => {
  it("returns -1 before the first section reaches the reading line", () => {
    expect(resolveActiveSectionIndex([500, 1400], 1000, false)).toBe(-1);
  });

  it("keeps a very tall section active while it fills the screen", () => {
    expect(resolveActiveSectionIndex([-15000, -12000, -9000, -6000, 900], 1000, false)).toBe(3);
  });

  it("activates the last section at the bottom of the page", () => {
    expect(resolveActiveSectionIndex([-3000, -1000, 700], 1000, true)).toBe(2);
  });

  it("returns -1 for no sections", () => {
    expect(resolveActiveSectionIndex([], 1000, false)).toBe(-1);
  });
});
