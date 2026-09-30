import { describe, expect, it, vi } from "vitest";

import {
  trackUnlockConfirmView,
  trackUnlockConfirmed,
  trackTopupView,
  trackPackSelected,
} from "../analytics/funnel-analytics";
import { findSmallestCoveringPack } from "./la-packs";

describe("wallet unlock dialog analytics events", () => {
  it("formats unlock_confirm_view with valid properties and strictly no forbidden data", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });

    await trackUnlockConfirmView(
      {
        sku: "ZIWEI-NATAL-EXCERPT-P0",
        price_la: 240,
        balance: 300,
        balance_after: 60,
        placement: "wallet_unlock_dialog",
      },
      { fetchImpl: fetchMock as unknown as typeof fetch },
    );

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const body = JSON.parse(fetchMock.mock.calls[0]![1].body);

    expect(body.event.name).toBe("unlock_confirm_view");
    expect(body.event.properties).toEqual({
      sku: "ZIWEI-NATAL-EXCERPT-P0",
      price_la: 240,
      amount: 240,
      balance: 300,
      balance_after: 60,
      placement: "wallet_unlock_dialog",
    });

    // Privacy boundary assertions
    expect(body.event.properties).not.toHaveProperty("chartId");
    expect(body.event.properties).not.toHaveProperty("chart_id");
    expect(body.event.properties).not.toHaveProperty("birthDate");
    expect(body.event.properties).not.toHaveProperty("userId");
  });

  it("formats unlock_confirmed on unlock success", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });

    await trackUnlockConfirmed(
      {
        sku: "ZIWEI-NATAL-EXCERPT-P0",
        price_la: 240,
        balance_after: 60,
      },
      { fetchImpl: fetchMock as unknown as typeof fetch },
    );

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const body = JSON.parse(fetchMock.mock.calls[0]![1].body);

    expect(body.event.name).toBe("unlock_confirmed");
    expect(body.event.properties).toEqual({
      sku: "ZIWEI-NATAL-EXCERPT-P0",
      price_la: 240,
      amount: 240,
      balance_after: 60,
    });
    expect(body.event.properties).not.toHaveProperty("chart_id");
  });

  it("formats topup_view and pack_selected when short balance is reached", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });

    const priceLa = 240;
    const currentBalance = 50;
    const gap = priceLa - currentBalance;
    const coveringPack = findSmallestCoveringPack(gap);

    // Short balance renders covering pack view
    await trackTopupView(
      {
        pack_id: coveringPack.id,
        placement: "wallet_unlock_dialog",
      },
      { fetchImpl: fetchMock as unknown as typeof fetch },
    );

    const viewBody = JSON.parse(fetchMock.mock.calls[0]![1].body);
    expect(viewBody.event.name).toBe("topup_view");
    expect(viewBody.event.properties.pack_id).toBe(coveringPack.id);
    expect(viewBody.event.properties.placement).toBe("wallet_unlock_dialog");

    // Clicking top-up CTA emits pack_selected
    await trackPackSelected(
      {
        pack_id: coveringPack.id,
        price_vnd: coveringPack.vndAmount,
        la_amount: coveringPack.totalLa,
      },
      { fetchImpl: fetchMock as unknown as typeof fetch },
    );

    const selectedBody = JSON.parse(fetchMock.mock.calls[1]![1].body);
    expect(selectedBody.event.name).toBe("pack_selected");
    expect(selectedBody.event.properties).toEqual({
      pack_id: coveringPack.id,
      price_vnd: coveringPack.vndAmount,
      la_amount: coveringPack.totalLa,
    });
  });
});
