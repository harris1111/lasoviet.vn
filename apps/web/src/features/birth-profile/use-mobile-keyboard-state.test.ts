import { describe, expect, it } from "vitest";
import { isMobileKeyboardOpen } from "./use-mobile-keyboard-state";

describe("isMobileKeyboardOpen", () => {
  it("returns false when no editable element is focused", () => {
    const activeElement = { tagName: "BUTTON" } as unknown as Element;
    expect(
      isMobileKeyboardOpen({
        activeElement,
        windowInnerHeight: 844,
        visualViewport: { height: 500 },
      }),
    ).toBe(false);
  });

  it("returns false when document has no active element", () => {
    expect(
      isMobileKeyboardOpen({
        activeElement: null,
        windowInnerHeight: 844,
        visualViewport: { height: 500 },
      }),
    ).toBe(false);
  });

  it("returns true when input is focused and visualViewport is reduced by >= 120px", () => {
    const activeElement = { tagName: "INPUT" } as unknown as Element;
    expect(
      isMobileKeyboardOpen({
        activeElement,
        windowInnerHeight: 844,
        visualViewport: { height: 520 }, // 844 - 520 = 324 > 120
      }),
    ).toBe(true);
  });

  it("returns false when input is focused but visualViewport height is unchanged (e.g. desktop)", () => {
    const activeElement = { tagName: "INPUT" } as unknown as Element;
    expect(
      isMobileKeyboardOpen({
        activeElement,
        windowInnerHeight: 844,
        visualViewport: { height: 844 }, // height diff = 0 <= 120
      }),
    ).toBe(false);
  });

  it("returns true for textarea when keyboard reduces viewport", () => {
    const activeElement = { tagName: "TEXTAREA" } as unknown as Element;
    expect(
      isMobileKeyboardOpen({
        activeElement,
        windowInnerHeight: 800,
        visualViewport: { height: 480 },
      }),
    ).toBe(true);
  });

  it("does NOT mark keyboard open merely from focus when visualViewport is unavailable", () => {
    const activeElement = { tagName: "INPUT" } as unknown as Element;
    expect(
      isMobileKeyboardOpen({
        activeElement,
        windowInnerHeight: 0,
        visualViewport: null,
      }),
    ).toBe(false);
    expect(
      isMobileKeyboardOpen({
        activeElement,
        windowInnerHeight: 844,
        visualViewport: null,
      }),
    ).toBe(false);
  });
});
