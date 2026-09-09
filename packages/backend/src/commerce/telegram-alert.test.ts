import { describe, expect, it, vi } from "vitest";
import { createTelegramAlertProvider } from "./telegram-alert.js";

describe("TelegramAlertProvider", () => {
  it("returns unconfigured when credentials are absent or empty", async () => {
    const unconfigured = createTelegramAlertProvider({});
    expect(unconfigured.isConfigured()).toBe(false);

    const staleRes = await unconfigured.sendStalePaymentAlert({
      providerEventId: "ev-1",
      amount: 79000,
      receivedAt: new Date("2026-09-05T10:00:00.000Z"),
      reason: "NO_VALID_PAYMENT_CODE",
    });
    expect(staleRes).toEqual({ status: "unconfigured" });

    const circuitRes = await unconfigured.sendCircuitOpenAlert({
      openedAt: new Date("2026-09-05T10:00:00.000Z"),
      reasonCode: "MATCH_RATE_LOW",
      idempotencyKey: "circuit-open:1",
    });
    expect(circuitRes).toEqual({ status: "unconfigured" });
  });

  it("sends stale alert with only bounded fields when configured", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
    });
    const provider = createTelegramAlertProvider({
      botToken: "synthetic-token-12345",
      chatId: "-1001234567890",
      fetch: mockFetch as never,
    });

    expect(provider.isConfigured()).toBe(true);

    const result = await provider.sendStalePaymentAlert({
      providerEventId: "provider-event-99",
      amount: 79000,
      receivedAt: new Date("2026-09-05T03:30:00.000Z"),
      reason: "NO_VALID_PAYMENT_CODE",
    });

    expect(result).toEqual({ status: "delivered" });
    expect(mockFetch).toHaveBeenCalledTimes(1);

    const [url, requestInit] = mockFetch.mock.calls[0];
    expect(url).toBe("https://api.telegram.org/botsynthetic-token-12345/sendMessage");
    expect(requestInit.method).toBe("POST");
    expect(requestInit.headers).toEqual({ "Content-Type": "application/json" });

    const body = JSON.parse(requestInit.body);
    expect(body.chat_id).toBe("-1001234567890");
    expect(body.text).toContain("provider-event-99");
    expect(body.text).toContain("79000 VND");
    expect(body.text).toContain("2026-09-05T03:30:00.000Z");
    expect(body.text).toContain("NO_VALID_PAYMENT_CODE");
    // Ensure no sender data or raw payload is present
    expect(body.text).not.toContain("NGUYEN VAN A");
    expect(body.text).not.toContain("rawPayload");
  });

  it("sends circuit open alert with bounded summary", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
    });
    const provider = createTelegramAlertProvider({
      botToken: "synthetic-token-12345",
      chatId: "-1001234567890",
      fetch: mockFetch as never,
    });

    const result = await provider.sendCircuitOpenAlert({
      openedAt: new Date("2026-09-05T10:00:00.000Z"),
      reasonCode: "MATCH_RATE_LOW",
      idempotencyKey: "circuit-open:2026-09-05T10:00:00.000Z",
      autoMatched: 18,
      totalReceived: 20,
    });

    expect(result).toEqual({ status: "delivered" });
    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.text).toContain("MATCH_RATE_LOW");
    expect(body.text).toContain("2026-09-05T10:00:00.000Z");
    expect(body.text).toContain("circuit-open:2026-09-05T10:00:00.000Z");
    expect(body.text).toContain("Giao dich 24h: 20 (Tu dong khop: 18)");
  });

  it("returns retryable_failure on non-2xx response without exposing token", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 502,
    });
    const provider = createTelegramAlertProvider({
      botToken: "super-secret-token",
      chatId: "-1001234567890",
      fetch: mockFetch as never,
    });

    const result = await provider.sendStalePaymentAlert({
      providerEventId: "ev-fail",
      amount: 79000,
      receivedAt: new Date("2026-09-05T03:30:00.000Z"),
      reason: "NO_VALID_PAYMENT_CODE",
    });

    expect(result).toEqual({
      status: "retryable_failure",
      error: "TELEGRAM_HTTP_502",
    });
    expect(JSON.stringify(result)).not.toContain("super-secret-token");
  });

  it("returns retryable_failure on network failure without exposing token", async () => {
    const mockFetch = vi.fn().mockRejectedValue(new Error("connect ECONNREFUSED"));
    const provider = createTelegramAlertProvider({
      botToken: "super-secret-token",
      chatId: "-1001234567890",
      fetch: mockFetch as never,
    });

    const result = await provider.sendCircuitOpenAlert({
      openedAt: new Date("2026-09-05T10:00:00.000Z"),
      reasonCode: "MATCH_RATE_LOW",
      idempotencyKey: "circuit-open:test",
    });

    expect(result).toEqual({
      status: "retryable_failure",
      error: "TELEGRAM_NETWORK_ERROR",
    });
    expect(JSON.stringify(result)).not.toContain("super-secret-token");
  });
  it("returns retryable_failure on timeout without exposing token", async () => {
    const timeoutError = new Error("The operation was aborted due to timeout");
    timeoutError.name = "TimeoutError";
    const mockFetch = vi.fn().mockRejectedValue(timeoutError);
    const provider = createTelegramAlertProvider({
      botToken: "super-secret-token",
      chatId: "-1001234567890",
      fetch: mockFetch as never,
      timeoutMs: 100,
    });

    const result = await provider.sendCircuitOpenAlert({
      openedAt: new Date("2026-09-05T10:00:00.000Z"),
      reasonCode: "MATCH_RATE_LOW",
      idempotencyKey: "circuit-open:timeout",
    });

    expect(result).toEqual({
      status: "retryable_failure",
      error: "TELEGRAM_TIMEOUT",
    });
    expect(JSON.stringify(result)).not.toContain("super-secret-token");
  });
});
