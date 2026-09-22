"use client";

import { useEffect, useState } from "react";

export function isMobileKeyboardOpen(options?: {
  visualViewport?: { height: number; scale?: number } | null;
  windowInnerHeight?: number;
  activeElement?: Element | null;
}): boolean {
  const activeEl =
    options?.activeElement !== undefined
      ? options.activeElement
      : typeof document !== "undefined"
        ? document.activeElement
        : null;

  const isEditableFocused = Boolean(
    activeEl &&
      (activeEl.tagName === "INPUT" ||
        activeEl.tagName === "TEXTAREA" ||
        activeEl.tagName === "SELECT" ||
        (activeEl as HTMLElement).isContentEditable),
  );

  if (!isEditableFocused) {
    return false;
  }

  const vv =
    options?.visualViewport !== undefined
      ? options.visualViewport
      : typeof window !== "undefined"
        ? window.visualViewport
        : null;

  const innerHeight =
    options?.windowInnerHeight !== undefined
      ? options.windowInnerHeight
      : typeof window !== "undefined"
        ? window.innerHeight
        : 0;

  if (vv && innerHeight > 0) {
    return innerHeight - vv.height > 120;
  }

  return isEditableFocused;
}

export function useMobileKeyboardState(): boolean {
  const [keyboardOpen, setKeyboardOpen] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    function checkKeyboard() {
      setKeyboardOpen(isMobileKeyboardOpen());
    }

    const vv = window.visualViewport;
    if (vv) {
      vv.addEventListener("resize", checkKeyboard);
      vv.addEventListener("scroll", checkKeyboard);
    }
    window.addEventListener("focusin", checkKeyboard);
    window.addEventListener("focusout", checkKeyboard);

    checkKeyboard();

    return () => {
      if (vv) {
        vv.removeEventListener("resize", checkKeyboard);
        vv.removeEventListener("scroll", checkKeyboard);
      }
      window.removeEventListener("focusin", checkKeyboard);
      window.removeEventListener("focusout", checkKeyboard);
    };
  }, []);

  return keyboardOpen;
}
