"use client";
import { useEffect } from "react";

export function TopUpPresence({ orderId }: { orderId: string }) {
  useEffect(() => {
    const acknowledge = () => {
      if (document.visibilityState !== "visible") return;
      void fetch(`/api/commerce/orders/${encodeURIComponent(orderId)}/status`, { method: "POST", cache: "no-store" }).catch(() => undefined);
    };
    acknowledge();
    const interval = window.setInterval(acknowledge, 30_000);
    document.addEventListener("visibilitychange", acknowledge);
    return () => { window.clearInterval(interval); document.removeEventListener("visibilitychange", acknowledge); };
  }, [orderId]);
  return null;
}
