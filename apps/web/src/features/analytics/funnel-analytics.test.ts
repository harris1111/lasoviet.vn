import { describe, expect, it, vi } from "vitest";

import {
  sanitizeAnalyticsProperties,
  trackTopupView,
  trackPackSelected,
  trackUnlockConfirmView,
  trackUnlockConfirmed,
  trackReturnVisit,
  trackUpgradeView,
  trackUpgradePurchased,
  trackWelcomeGrant,
  trackPartFeedback,
  trackGuaranteeClaimed,
  deterministicAnalyticsKey,
} from "./funnel-analytics";

describe("funnel-analytics helpers", () => {
  it("creates stable opaque telemetry keys without exposing input values", () => {
    const first = deterministicAnalyticsKey("feedback", "chart-1", "insight-1");
    expect(first).toBe(deterministicAnalyticsKey("feedback", "chart-1", "insight-1"));
    expect(first).not.toContain("chart-1");
    expect(first).not.toContain("insight-1");
  });
  describe("sanitizeAnalyticsProperties (FD-053/FD-080/FD-081 privacy boundaries)", () => {
    it("strips forbidden properties including chart_id, birth data, user_id, and report content", () => {
      const input = {
        sku: "ZIWEI-NATAL-EXCERPT-P0",
        price_la: 240,
        chart_id: "chart_secret_123",
        chartId: "chart_secret_123",
        birth_date: "1990-01-01",
        birth_year: 1990,
        user_id: "usr_123",
        userId: "usr_123",
        visitor_id: "vis_123",
        account_id: "acc_123",
        email: "test@example.com",
        name: "Nguyen Van A",
        report_content: "Secret prophecy",
        evidence_text: "Secret text",
        question: "Will I be rich?",
        free_text: "Some note",
      };

      const sanitized = sanitizeAnalyticsProperties(input);

      expect(sanitized).toEqual({
        sku: "ZIWEI-NATAL-EXCERPT-P0",
        price_la: 240,
      });
      expect(sanitized).not.toHaveProperty("chart_id");
      expect(sanitized).not.toHaveProperty("birth_date");
      expect(sanitized).not.toHaveProperty("email");
      expect(sanitized).not.toHaveProperty("report_content");
    });
  });

  describe("event tracking calls", () => {
    it("trackTopupView sends canonical topup_view event", async () => {
      const mockFetch = vi.fn().mockResolvedValue({ ok: true });
      await trackTopupView(
        { pack_id: "LA-ENTRY-300", placement: "wallet_unlock_dialog" },
        { fetchImpl: mockFetch as unknown as typeof fetch },
      );

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const body = JSON.parse(mockFetch.mock.calls[0]![1].body);
      expect(body.event).toEqual({
        name: "topup_view",
        properties: {
          pack_id: "LA-ENTRY-300",
          placement: "wallet_unlock_dialog",
        },
      });
    });

    it("trackPackSelected sends canonical pack_selected event", async () => {
      const mockFetch = vi.fn().mockResolvedValue({ ok: true });
      await trackPackSelected(
        { pack_id: "LA-START-1100", price_vnd: 99000, la_amount: 1100 },
        { fetchImpl: mockFetch as unknown as typeof fetch },
      );

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const body = JSON.parse(mockFetch.mock.calls[0]![1].body);
      expect(body.event).toEqual({
        name: "pack_selected",
        properties: {
          pack_id: "LA-START-1100",
          price_vnd: 99000,
          la_amount: 1100,
        },
      });
    });

    it("trackUnlockConfirmView sends canonical unlock_confirm_view event", async () => {
      const mockFetch = vi.fn().mockResolvedValue({ ok: true });
      await trackUnlockConfirmView(
        {
          sku: "ZIWEI-NATAL-EXCERPT-P0",
          price_la: 240,
          balance: 300,
          balance_after: 60,
          placement: "wallet_unlock_dialog",
        },
        { fetchImpl: mockFetch as unknown as typeof fetch },
      );

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const body = JSON.parse(mockFetch.mock.calls[0]![1].body);
      expect(body.event).toEqual({
        name: "unlock_confirm_view",
        properties: {
          sku: "ZIWEI-NATAL-EXCERPT-P0",
          price_la: 240,
          amount: 240,
          balance: 300,
          balance_after: 60,
          placement: "wallet_unlock_dialog",
        },
      });
    });

    it("trackUnlockConfirmed sends canonical unlock_confirmed event", async () => {
      const mockFetch = vi.fn().mockResolvedValue({ ok: true });
      await trackUnlockConfirmed(
        {
          sku: "ZIWEI-NATAL-EXCERPT-P0",
          price_la: 240,
          balance_after: 60,
        },
        { fetchImpl: mockFetch as unknown as typeof fetch },
      );

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const body = JSON.parse(mockFetch.mock.calls[0]![1].body);
      expect(body.event).toEqual({
        name: "unlock_confirmed",
        properties: {
          sku: "ZIWEI-NATAL-EXCERPT-P0",
          price_la: 240,
          amount: 240,
          balance_after: 60,
        },
      });
    });

    it("trackReturnVisit sends canonical return_visit event", async () => {
      const mockFetch = vi.fn().mockResolvedValue({ ok: true });
      await trackReturnVisit(
        { days_since_last_visit: 5, return_count: 2 },
        { fetchImpl: mockFetch as unknown as typeof fetch },
      );

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const body = JSON.parse(mockFetch.mock.calls[0]![1].body);
      expect(body.event).toEqual({
        name: "return_visit",
        properties: {
          days_since_last_visit: 5,
          return_count: 2,
        },
      });
    });

    it("trackUpgradeView sends canonical upgrade_view event", async () => {
      const mockFetch = vi.fn().mockResolvedValue({ ok: true });
      await trackUpgradeView(
        {
          source_sku: "ZIWEI-NATAL-EXCERPT-P0",
          target_sku: "ZIWEI-IDENTITY-P0",
          days_remaining: 6,
        },
        { fetchImpl: mockFetch as unknown as typeof fetch },
      );

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const body = JSON.parse(mockFetch.mock.calls[0]![1].body);
      expect(body.event).toEqual({
        name: "upgrade_view",
        properties: {
          source_sku: "ZIWEI-NATAL-EXCERPT-P0",
          target_sku: "ZIWEI-IDENTITY-P0",
          days_remaining: 6,
        },
      });
    });

    it("trackUpgradePurchased sends canonical upgrade_purchased event", async () => {
      const mockFetch = vi.fn().mockResolvedValue({ ok: true });
      await trackUpgradePurchased(
        {
          source_sku: "ZIWEI-NATAL-EXCERPT-P0",
          target_sku: "ZIWEI-IDENTITY-P0",
          amount: 720,
          currency: "LA",
        },
        { fetchImpl: mockFetch as unknown as typeof fetch },
      );

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const body = JSON.parse(mockFetch.mock.calls[0]![1].body);
      expect(body.event).toEqual({
        name: "upgrade_purchased",
        properties: {
          source_sku: "ZIWEI-NATAL-EXCERPT-P0",
          target_sku: "ZIWEI-IDENTITY-P0",
          amount: 720,
          currency: "LA",
        },
      });
    });

    it("trackWelcomeGrant sends canonical welcome_grant event", async () => {
      const mockFetch = vi.fn().mockResolvedValue({ ok: true });
      await trackWelcomeGrant(
        { amount: 60, balance_after: 60, grant_type: "welcome_verified_account" },
        { fetchImpl: mockFetch as unknown as typeof fetch },
      );

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const body = JSON.parse(mockFetch.mock.calls[0]![1].body);
      expect(body.event).toEqual({
        name: "welcome_grant",
        properties: {
          amount: 60,
          balance_after: 60,
          grant_type: "welcome_verified_account",
        },
      });
    });

    it("trackPartFeedback sends canonical part_feedback event", async () => {
      const mockFetch = vi.fn().mockResolvedValue({ ok: true });
      await trackPartFeedback(
        {
          section_id: "insight_1",
          feedback: "accurate",
          is_free: true,
        },
        { fetchImpl: mockFetch as unknown as typeof fetch },
      );

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const body = JSON.parse(mockFetch.mock.calls[0]![1].body);
      expect(body.event).toEqual({
        name: "part_feedback",
        properties: {
          section_id: "insight_1",
          feedback: "accurate",
          is_free: true,
        },
      });
    });

    it("trackGuaranteeClaimed sends canonical guarantee_claimed event", async () => {
      const mockFetch = vi.fn().mockResolvedValue({ ok: true });
      await trackGuaranteeClaimed(
        {
          sku: "ZIWEI-NATAL-EXCERPT-P0",
          amount_restored: 240,
          reason: "inaccurate",
          section_id: "career_palace",
        },
        { fetchImpl: mockFetch as unknown as typeof fetch },
      );

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const body = JSON.parse(mockFetch.mock.calls[0]![1].body);
      expect(body.event).toEqual({
        name: "guarantee_claimed",
        properties: {
          sku: "ZIWEI-NATAL-EXCERPT-P0",
          amount: 240,
          amount_restored: 240,
          reason: "inaccurate",
          section_id: "career_palace",
        },
      });
    });

    it("is non-blocking and swallows fetch network failures without throwing", async () => {
      const mockFetch = vi.fn().mockRejectedValue(new Error("Connection refused"));
      await expect(
        trackTopupView(
          { pack_id: "LA-ENTRY-300", placement: "wallet_unlock_dialog" },
          { fetchImpl: mockFetch as unknown as typeof fetch },
        ),
      ).resolves.toBeUndefined();
    });
  });
});
