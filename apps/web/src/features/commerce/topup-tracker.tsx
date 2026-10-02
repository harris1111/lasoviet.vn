"use client";

import { useEffect, useRef } from "react";
import { trackTopupView, trackPackSelected } from "../analytics/funnel-analytics";
import { LA_TOP_UP_PACKS } from "./la-packs";

export type TopupTrackerProps = {
  activeTab: "luan-giai" | "hoi-vien" | "nap-la";
  placement?: string;
};

export function TopupTracker({
  activeTab,
  placement = "paid_topic_selector",
}: TopupTrackerProps): null {
  const seenPacksRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    function trackPacksView() {
      for (const pack of LA_TOP_UP_PACKS) {
        if (!seenPacksRef.current.has(pack.id)) {
          seenPacksRef.current.add(pack.id);
          void trackTopupView({ pack_id: pack.id, placement });
        }
      }
    }

    if (activeTab === "nap-la") {
      trackPacksView();
    }

    const handleDocumentClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target) return;

      const tabTarget = target.closest("[data-target]")?.getAttribute("data-target");
      if (tabTarget === "nap-la") {
        trackPacksView();
      }

      const packCard = target.closest("[data-pack-id]");
      if (packCard) {
        const packId = packCard.getAttribute("data-pack-id");
        const pack = LA_TOP_UP_PACKS.find((p) => p.id === packId);
        if (pack) {
          void trackPackSelected({
            pack_id: pack.id,
            price_vnd: pack.vndAmount,
            la_amount: pack.totalLa,
          });
        }
      }

      const submitBtn = target.closest("form button[type=submit]");
      if (submitBtn) {
        const form = submitBtn.closest("form");
        const packIdInput = form?.querySelector("input[name=packId]") as HTMLInputElement | null;
        if (packIdInput?.value) {
          const pack = LA_TOP_UP_PACKS.find((p) => p.id === packIdInput.value);
          if (pack) {
            void trackPackSelected({
              pack_id: pack.id,
              price_vnd: pack.vndAmount,
              la_amount: pack.totalLa,
            });
          }
        }
      }
    };

    document.addEventListener("click", handleDocumentClick);
    return () => {
      document.removeEventListener("click", handleDocumentClick);
    };
  }, [activeTab, placement]);

  return null;
}
