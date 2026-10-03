import { describe, expect, it } from "vitest";
import { mapFreePalaceStatus } from "./free-palace-read.service.js";

describe("free palace status mapping (stored state -> contract status)", () => {
  it.each([
    ["reserved", "requested"],
    ["dispatching", "generating"],
    ["terminal_failure", "terminal_failure"],
    ["cost_unknown", "cost_unknown"],
    ["cancelled", "unavailable"],
    ["ready", "unavailable"], // `ready` is decided only by the validated-artifact path, never by the label
    [null, "unavailable"],
    ["something_new", "unavailable"],
  ])("%s -> %s", (stored, exposed) => {
    expect(mapFreePalaceStatus(stored)).toBe(exposed);
  });
  it("never emits budget_exhausted, which is an admission refusal and has no stored state", () => {
    for (const stored of ["reserved", "dispatching", "ready", "cancelled", "terminal_failure", "cost_unknown", null]) {
      expect(mapFreePalaceStatus(stored)).not.toBe("budget_exhausted");
    }
  });
});
