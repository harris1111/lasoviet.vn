"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import type { ReactNode } from "react";

import { Icon } from "../icon";

type BottomSheetProps = {
  children: ReactNode;
  initiallyOpen?: boolean;
  title: string;
  triggerLabel: string;
};

const focusableSelector = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

export function BottomSheet({
  children,
  initiallyOpen = false,
  title,
  triggerLabel,
}: BottomSheetProps) {
  const [open, setOpen] = useState(initiallyOpen);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  function close() {
    setOpen(false);
    window.requestAnimationFrame(() => triggerRef.current?.focus());
  }

  useEffect(() => {
    if (!open) return undefined;

    const dialog = dialogRef.current;
    const firstFocusable = dialog?.querySelector<HTMLElement>(focusableSelector);
    firstFocusable?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        close();
        return;
      }
      if (event.key !== "Tab" || dialog === null) return;

      const focusable = [...dialog.querySelectorAll<HTMLElement>(focusableSelector)];
      const first = focusable[0];
      const last = focusable.at(-1);
      if (first === undefined || last === undefined) {
        event.preventDefault();
        return;
      }
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <>
      <button
        className="ui-button ui-button--secondary"
        onClick={() => setOpen(true)}
        ref={triggerRef}
        type="button"
      >
        {triggerLabel}
      </button>
      {open ? (
        <>
          <button
            aria-label="Đóng bảng"
            className="ui-bottom-sheet__backdrop"
            onClick={close}
            type="button"
          />
          <div
            aria-labelledby={titleId}
            aria-modal="true"
            className="ui-bottom-sheet__dialog"
            ref={dialogRef}
            role="dialog"
          >
            <div className="ui-bottom-sheet__handle" />
            <div className="ui-bottom-sheet__header">
              <h2 className="ui-bottom-sheet__title" id={titleId}>{title}</h2>
              <button aria-label="Đóng" className="ui-icon-button" onClick={close} type="button">
                <Icon name="close" />
              </button>
            </div>
            <div className="ui-bottom-sheet__content">{children}</div>
          </div>
        </>
      ) : null}
    </>
  );
}
