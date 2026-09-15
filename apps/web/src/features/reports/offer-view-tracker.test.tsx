import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

vi.mock("../../analytics/browser-analytics", () => ({
  sendBrowserAnalyticsEvent: vi.fn(),
}));

import {
  claimOfferViewEvents,
  OfferViewTracker,
} from "./offer-view-tracker";

describe("OfferViewTracker", () => {
  it("renders null without displaying any visual UI elements", () => {
    const html = renderToStaticMarkup(
      <OfferViewTracker
        offers={[{ offerId: "ziwei-comprehensive", sku: "ZIWEI-IDENTITY-P0" }]}
      />,
    );
    expect(html).toBe("");
  });

  it("claims offer_view for unseen offers with exact three allowed properties and no forbidden fields", () => {
    const descriptors = [
      { offerId: "ziwei-natal-excerpt", sku: "ZIWEI-NATAL-EXCERPT-P0" },
      { offerId: "ziwei-comprehensive", sku: "ZIWEI-IDENTITY-P0" },
    ];
    const seen = new Set<string>();
    const claims = claimOfferViewEvents(descriptors, seen);

    expect(claims).toHaveLength(2);
    expect(claims[0]).toEqual({
      name: "offer_view",
      properties: {
        offer_id: "ziwei-natal-excerpt",
        placement: "paid_topic_selector",
        sku: "ZIWEI-NATAL-EXCERPT-P0",
      },
    });
    expect(claims[1]).toEqual({
      name: "offer_view",
      properties: {
        offer_id: "ziwei-comprehensive",
        placement: "paid_topic_selector",
        sku: "ZIWEI-IDENTITY-P0",
      },
    });
    // Strict check that forbidden properties are absent
    expect(claims[0]!.properties).not.toHaveProperty("chartId");
    expect(claims[0]!.properties).not.toHaveProperty("price");
    expect(claims[0]!.properties).not.toHaveProperty("birthSummary");

    // Proves repeated claims are skipped
    const repeatClaims = claimOfferViewEvents(descriptors, seen);
    expect(repeatClaims).toHaveLength(0);

    // Adding a new unseen offer claims only the new one
    const newDescriptor = [{ offerId: "new-pack", sku: "NEW-SKU" }];
    const newClaims = claimOfferViewEvents(newDescriptor, seen);
    expect(newClaims).toHaveLength(1);
    expect(newClaims[0]!.properties.offer_id).toBe("new-pack");
  });
});
