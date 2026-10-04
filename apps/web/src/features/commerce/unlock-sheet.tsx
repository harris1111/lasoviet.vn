"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { WalletUnlockDialog, type WalletUnlockDialogProps } from "./wallet-unlock-dialog";

/** One native dialog owns focus; a preview embeds the same confirmation without a second modal. */
export function UnlockSheet({ embedded = false, ...props }: WalletUnlockDialogProps & { embedded?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (embedded || !props.open) return;
    const dialog = ref.current;
    const trigger = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialog?.showModal();
    return () => { dialog?.close(); document.body.style.overflow = overflow; trigger?.focus(); };
  }, [embedded, props.open]);
  if (!props.open) return null;
  const content = <WalletUnlockDialog {...props} embedded key={props.sku} />;
  if (embedded) return content;
  if (typeof document === "undefined") return null;
  return createPortal(<dialog ref={ref} className="unlock-sheet" aria-label={props.labels.title}
    onCancel={(event) => { event.preventDefault(); props.onOpenChange(false); }}
    onClick={(event) => { if (event.target === event.currentTarget) props.onOpenChange(false); }}>
    <span className="fd109-sheet-handle" aria-hidden="true" />{content}
  </dialog>, document.body);
}
