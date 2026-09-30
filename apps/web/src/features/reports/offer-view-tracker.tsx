"use client";

import { useEffect, useRef } from "react";
import { sendBrowserAnalyticsEvent } from "../../analytics/browser-analytics";

export type RenderedOfferDescriptor = {
  offerId: string;
  sku: string;
  upgradeCredit?: {
    sourceSku: string;
    targetSku: string;
    creditExpiresAt: string;
  } | null;
};

export type OfferViewEvent = {
  name: "offer_view";
  properties: {
    offer_id: string;
    placement: "paid_topic_selector";
    sku: string;
  };
};

export type UpgradeViewEvent = {
  name: "upgrade_view";
  properties: {
    source_sku: string;
    target_sku: string;
    days_remaining: number;
  };
};

export function claimOfferViewEvents(
  offers: readonly RenderedOfferDescriptor[],
  seenOfferIds: Set<string>,
): OfferViewEvent[] {
  const events: OfferViewEvent[] = [];
  for (const offer of offers) {
    if (!seenOfferIds.has(offer.offerId)) {
      seenOfferIds.add(offer.offerId);
      events.push({
        name: "offer_view",
        properties: {
          offer_id: offer.offerId,
          placement: "paid_topic_selector",
          sku: offer.sku,
        },
      });
    }
  }
  return events;
}

export function claimUpgradeViewEvents(
  offers: readonly RenderedOfferDescriptor[],
  seenUpgradeKeys: Set<string>,
  nowMs: number = Date.now(),
): UpgradeViewEvent[] {
  const events: UpgradeViewEvent[] = [];
  for (const offer of offers) {
    if (offer.upgradeCredit) {
      const key = `${offer.upgradeCredit.sourceSku}->${offer.upgradeCredit.targetSku}`;
      if (!seenUpgradeKeys.has(key)) {
        seenUpgradeKeys.add(key);
        const expiresAtMs = new Date(offer.upgradeCredit.creditExpiresAt).getTime();
        const daysRemaining = Number.isNaN(expiresAtMs)
          ? 0
          : Math.max(0, Math.ceil((expiresAtMs - nowMs) / (24 * 60 * 60 * 1000)));
        events.push({
          name: "upgrade_view",
          properties: {
            source_sku: offer.upgradeCredit.sourceSku,
            target_sku: offer.upgradeCredit.targetSku,
            days_remaining: daysRemaining,
          },
        });
      }
    }
  }
  return events;
}

export type OfferViewTrackerProps = {
  offers: readonly RenderedOfferDescriptor[];
};

export function OfferViewTracker({ offers }: OfferViewTrackerProps): null {
  const seenOfferIdsRef = useRef<Set<string>>(new Set());
  const seenUpgradeKeysRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const claims = claimOfferViewEvents(offers, seenOfferIdsRef.current);
    for (const claim of claims) {
      void sendBrowserAnalyticsEvent(claim.name, claim.properties);
    }
    const upgradeClaims = claimUpgradeViewEvents(offers, seenUpgradeKeysRef.current, Date.now());
    for (const claim of upgradeClaims) {
      void sendBrowserAnalyticsEvent(claim.name, claim.properties);
    }
  }, [offers]);

  return null;
}
