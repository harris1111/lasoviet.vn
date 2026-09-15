"use client";

import { useEffect, useRef } from "react";
import { sendBrowserAnalyticsEvent } from "../../analytics/browser-analytics";

export type RenderedOfferDescriptor = {
  offerId: string;
  sku: string;
};

export type OfferViewEvent = {
  name: "offer_view";
  properties: {
    offer_id: string;
    placement: "paid_topic_selector";
    sku: string;
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

export type OfferViewTrackerProps = {
  offers: readonly RenderedOfferDescriptor[];
};

export function OfferViewTracker({ offers }: OfferViewTrackerProps): null {
  const seenOfferIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const claims = claimOfferViewEvents(offers, seenOfferIdsRef.current);
    for (const claim of claims) {
      void sendBrowserAnalyticsEvent(claim.name, claim.properties);
    }
  }, [offers]);

  return null;
}
