"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { findLaProduct, PendingUnlockHintV1Schema, type PendingUnlockHintV1 } from "@lasoviet/contracts";
import { authClient } from "../../auth/auth-client";
import { ladderSelectionQuery } from "./offer-selection";

/** Account-scoped hint. Following the link always loads fresh confirmation terms. */
export function PendingUnlockBanner({ locale }: { locale: "vi" | "en" }) {
  const t = useTranslations("reports");
  const pathname = usePathname();
  const { data: session } = authClient.useSession();
  const ownerId = session?.user.emailVerified === true ? session.user.id : undefined;
  const [state, setState] = useState<{ signature: string; hint: PendingUnlockHintV1 | null } | null>(null);
  const normalizedPath = (pathname ?? "").replace(/^\/en(?=\/|$)/, "");
  // FD069/101/109/110 keep the homepage and uninterrupted free result price-free.
  const allowed = normalizedPath === "/tai-khoan" || normalizedPath.startsWith("/tai-khoan/") ||
    /^\/la-so\/[^/]+\/chon-luan-giai$/.test(normalizedPath) || /^\/bao-cao\/[^/]+$/.test(normalizedPath);
  const excluded = !pathname || !allowed;
  const generation = useRef(0);
  const dismissed = useRef(new Set<string>());
  const signature = JSON.stringify([ownerId, pathname, locale]);
  useEffect(() => {
    if (!ownerId || excluded) return;
    let controller: AbortController | undefined;
    function refresh() {
      controller?.abort();
      controller = new AbortController();
      const active = controller;
      const current = ++generation.current;
      // Hide old terms immediately; absence, invalidity and failed reads stay hidden.
      setState({ signature, hint: null });
      void (async () => {
        try {
          const response = await fetch(`/api/commerce/wallet/pending-unlock?locale=${locale}`, { cache: "no-store", signal: active.signal });
          if (!response.ok) return;
          const body: unknown = await response.json();
          if (active.signal.aborted || current !== generation.current || body === null) return;
          const parsed = PendingUnlockHintV1Schema.safeParse(body);
          if (!parsed.success || parsed.data.ownerId !== ownerId || parsed.data.locale !== locale) return;
          const dismissalKey = `lsv:resume-dismissed:${ownerId}:${parsed.data.intentId}`;
          if (dismissed.current.has(dismissalKey)) return;
          try { if (sessionStorage.getItem(dismissalKey)) return; } catch { /* Dismissal still works for this mount. */ }
          if (!active.signal.aborted && current === generation.current) setState({ signature, hint: parsed.data });
        } catch { /* A recovery hint must never interrupt the current page. */ }
      })();
    }
    function onVisible() { if (document.visibilityState === "visible") refresh(); }
    // The microtask keeps the effect setup free of synchronous React state changes.
    let disposed = false;
    queueMicrotask(() => { if (!disposed) refresh(); });
    window.addEventListener("focus", refresh);
    window.addEventListener("lsv:wallet-changed", refresh);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      disposed = true; controller?.abort();
      window.removeEventListener("focus", refresh); window.removeEventListener("lsv:wallet-changed", refresh);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [ownerId, excluded, signature, locale]);
  const hint = !excluded && ownerId && state?.signature === signature ? state.hint : null;
  const product = hint ? findLaProduct(hint.sku) : undefined;
  if (!hint || !product) return null;
  const query = new URLSearchParams({ ...ladderSelectionQuery(hint.sku), resume: "1" });
  const href = `${locale === "en" ? "/en" : ""}/la-so/${encodeURIComponent(hint.chartId)}/chon-luan-giai?${query}`;
  function dismiss() {
    const key = `lsv:resume-dismissed:${ownerId}:${hint!.intentId}`;
    dismissed.current.add(key);
    try { sessionStorage.setItem(key, "1"); } catch { /* Storage may be disabled. */ }
    setState({ signature, hint: null });
  }
  return <aside className="pending-unlock-banner container" aria-label={t("selection.pendingUnlockLabel")} data-testid="pending-unlock-banner">
    <p>{t("selection.pendingUnlockBody", { item: product.name[locale], gap: hint.gapLa })}</p>
    <Link className="button button-small" href={href}>{t("selection.pendingUnlockContinue")}</Link>
    <button type="button" aria-label={t("selection.pendingUnlockDismiss")} onClick={dismiss}>×</button>
  </aside>;
}
