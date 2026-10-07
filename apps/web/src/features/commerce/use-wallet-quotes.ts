"use client";

import { useCallback, useEffect, useState } from "react";
import { WalletQuotesV1Schema, type WalletQuotesV1, type WalletQuoteV1 } from "@lasoviet/contracts";

export type InitialWalletQuotes = { status: "guest" | "error" } | { status: "ready"; value: WalletQuotesV1 };
export function useWalletQuotes(chartId: string, chartVersionId: string, locale: "vi" | "en", initial?: InitialWalletQuotes) {
  const signature = JSON.stringify([chartId, chartVersionId, locale]);
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<{ signature: string; status: "loading" | "ready" | "guest" | "error"; quotes: WalletQuoteV1[] | null }>(
    () => {
      if (initial?.status === "guest" || initial?.status === "error") return { signature, status: initial.status, quotes: null };
      const parsed = WalletQuotesV1Schema.safeParse(initial?.status === "ready" ? initial.value : undefined);
      return parsed.success && parsed.data.chartId === chartId && parsed.data.chartVersionId === chartVersionId && parsed.data.locale === locale
        ? { signature, status: "ready", quotes: parsed.data.quotes } : { signature, status: "loading", quotes: null };
    },
  );
  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    const timeout = window.setTimeout(() => controller.abort(), 15000);
    async function load() {
      try {
        const query = new URLSearchParams({ chartId, chartVersionId, locale });
        const response = await fetch(`/api/commerce/wallet/quotes?${query}`, { signal: controller.signal, cache: "no-store" });
        if (!active) return;
        if (response.status === 401) { setState({ signature, status: "guest", quotes: null }); return; }
        if (!response.ok) throw new Error("QUOTE_UNAVAILABLE");
        const parsed = WalletQuotesV1Schema.safeParse(await response.json());
        if (!parsed.success || parsed.data.chartId !== chartId || parsed.data.chartVersionId !== chartVersionId || parsed.data.locale !== locale) throw new Error("QUOTE_INVALID");
        if (active) setState({ signature, status: "ready", quotes: parsed.data.quotes });
      } catch { if (active) setState({ signature, status: "error", quotes: null }); }
      finally { window.clearTimeout(timeout); }
    }
    void load();
    return () => { active = false; controller.abort(); window.clearTimeout(timeout); };
  }, [chartId, chartVersionId, locale, signature, attempt]);
  const retry = useCallback(() => setAttempt(value => value + 1), []);
  return { ...(state.signature === signature ? state : { signature, status: "loading" as const, quotes: null }), retry };
}
