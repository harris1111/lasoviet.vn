import { describe, expect, it, vi } from "vitest";
import { sendBrowserAnalyticsEvent } from "./browser-analytics";

describe("sendBrowserAnalyticsEvent", () => {
  it("posts canonical event with standard UUID, occurredAt, keepalive, and same-origin credentials", async () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: true });

    await sendBrowserAnalyticsEvent(
      "wizard_start",
      { locale: "vi", entry_point: "wizard_route", step: 1 },
      { fetchImpl: mockFetch as unknown as typeof fetch },
    );

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, init] = mockFetch.mock.calls[0]!;
    expect(url).toBe("/api/analytics/events");
    expect(init.method).toBe("POST");
    expect(init.credentials).toBe("same-origin");
    expect(init.keepalive).toBe(true);
    expect(init.headers["content-type"]).toBe("application/json");

    const body = JSON.parse(init.body);
    const UUID_REGEX =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    expect(body.version).toBe(1);
    expect(UUID_REGEX.test(body.idempotencyKey)).toBe(true);
    expect(body.event.name).toBe("wizard_start");
    expect(body.event.properties).toEqual({
      locale: "vi",
      entry_point: "wizard_route",
      step: 1,
    });

    // Strict negative check: no forbidden identity or server fields
    expect(body).not.toHaveProperty("visitorId");
    expect(body).not.toHaveProperty("userId");
    expect(body).not.toHaveProperty("ip");
  });

  it("skips emission cleanly if crypto.randomUUID is unavailable", async () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: true });
    const original = globalThis.crypto.randomUUID;
    try {
      // @ts-expect-error testing missing crypto
      globalThis.crypto.randomUUID = undefined;
      await sendBrowserAnalyticsEvent("landing", {}, {
        fetchImpl: mockFetch as unknown as typeof fetch,
      });
      expect(mockFetch).not.toHaveBeenCalled();
    } finally {
      globalThis.crypto.randomUUID = original;
    }
  });

  it("catches network and fetch errors silently without throwing", async () => {
    const mockFetch = vi.fn().mockRejectedValue(new Error("Network down"));
    await expect(
      sendBrowserAnalyticsEvent("landing", {}, {
        fetchImpl: mockFetch as unknown as typeof fetch,
      }),
    ).resolves.toBeUndefined();
  });
});
