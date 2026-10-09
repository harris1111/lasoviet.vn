"use client";

import { useEffect, useState } from "react";
import { authClient } from "../../auth/auth-client";
import { deterministicAnalyticsKey, trackWelcomeGrant } from "../analytics/funnel-analytics";
import { LaMark } from "../../components/la-icons";

export function WelcomeGrantNotice({ locale }: { locale: "vi" | "en" }) {
  const { data: session } = authClient.useSession();
  const ownerId = session?.user.emailVerified === true ? session.user.id : undefined;
  const [visibleFor, setVisibleFor] = useState<string>();

  useEffect(() => {
    if (!ownerId) return;
    const controller = new AbortController();
    const key = `lasoviet:welcome-grant-seen:${ownerId}`;
    void (async () => {
      try {
        const response = await fetch("/api/commerce/wallet/balance", { cache: "no-store", signal: controller.signal });
        if (!response.ok || !response.headers.get("x-wallet-welcome-granted-at")) return;
        try { if (localStorage.getItem(key)) return; } catch { /* Storage may be unavailable. */ }
        if (controller.signal.aborted) return;
        setVisibleFor(ownerId);
        void trackWelcomeGrant({ amount: 60 }, {
          idempotencyKey: deterministicAnalyticsKey("welcome-grant", ownerId),
        });
        try { localStorage.setItem(key, "1"); } catch { /* A receipt still permits the notice. */ }
      } catch { /* The next authenticated visit retries. */ }
    })();
    return () => controller.abort();
  }, [ownerId]);

  if (!ownerId || visibleFor !== ownerId) return null;
  return (
    <aside role="status" className="welcome-grant-notice">
      <LaMark name="gift" size={40} />
      <span>{locale === "vi" ? "Bạn đã nhận 60 Lá chào mừng vào ví." : "Your wallet has received 60 welcome Lá."}</span>
      <button type="button" onClick={() => setVisibleFor(undefined)} aria-label={locale === "vi" ? "Đóng thông báo" : "Dismiss notification"}>×</button>
    </aside>
  );
}
