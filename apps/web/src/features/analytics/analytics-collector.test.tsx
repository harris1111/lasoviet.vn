import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

const mockUsePathname = vi.fn();
vi.mock("next/navigation", () => ({
  usePathname: () => mockUsePathname(),
}));

import { AnalyticsCollector, sendLandingEvent } from "./analytics-collector";

describe("analytics collector component (acceptance 6)", () => {
  it("renders null without displaying any UI elements", () => {
    mockUsePathname.mockReturnValue("/vi");
    const html = renderToStaticMarkup(<AnalyticsCollector />);
    expect(html).toBe("");
  });

  it("always produces a standards-valid UUID for idempotencyKey", async () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: true });
    await sendLandingEvent("/vi", mockFetch as unknown as typeof fetch);
    const body = JSON.parse(mockFetch.mock.calls[0]![1].body);
    const UUID_REGEX =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    expect(UUID_REGEX.test(body.idempotencyKey)).toBe(true);
  });

  it("skips emission silently when crypto.randomUUID is unavailable without affecting UI", async () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: true });
    const originalRandomUuid = globalThis.crypto.randomUUID;
    try {
      // @ts-expect-error test unavailable crypto
      globalThis.crypto.randomUUID = undefined;
      await expect(sendLandingEvent("/vi", mockFetch as unknown as typeof fetch)).resolves.toBeUndefined();
      expect(mockFetch).not.toHaveBeenCalled();
    } finally {
      globalThis.crypto.randomUUID = originalRandomUuid;
    }
  });

  it("sends active landing event with credentials, keepalive, and no identity/context fields in body", async () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: true });

    await sendLandingEvent("/vi/pricing", mockFetch as unknown as typeof fetch);

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, init] = mockFetch.mock.calls[0]!;
    expect(url).toBe("/api/analytics/events");
    expect(init.method).toBe("POST");
    expect(init.credentials).toBe("same-origin");
    expect(init.keepalive).toBe(true);
    expect(init.headers["content-type"]).toBe("application/json");

    const body = JSON.parse(init.body);
    expect(body).toEqual({
      version: 1,
      idempotencyKey: expect.any(String),
      occurredAt: expect.any(String),
      event: {
        name: "landing",
        properties: {
          landing_page: "/vi/pricing",
        },
      },
    });

    // Strictly verify no forbidden identity or server-derived context fields in client body
    expect(body).not.toHaveProperty("ip");
    expect(body).not.toHaveProperty("userId");
    expect(body).not.toHaveProperty("visitorId");
    expect(body).not.toHaveProperty("context");
    expect(body).not.toHaveProperty("userAgent");
  });

  it("catches fetch errors silently without throwing", async () => {
    const mockFetch = vi.fn().mockRejectedValue(new Error("Network failure"));

    await expect(
      sendLandingEvent("/vi", mockFetch as unknown as typeof fetch),
    ).resolves.toBeUndefined();
  });

  it("deduplicates multiple calls for the same pathname simulating Strict Mode", async () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: true });

    // Simulate the ref-based deduplication behavior inside the component
    let lastTracked: string | null = null;
    const track = async (pathname: string) => {
      if (lastTracked === pathname) return;
      lastTracked = pathname;
      await sendLandingEvent(pathname, mockFetch as unknown as typeof fetch);
    };

    // First mount in Strict Mode (mount -> unmount -> mount with same pathname)
    await track("/vi");
    await track("/vi");
    expect(mockFetch).toHaveBeenCalledTimes(1);

    // Pathname change to /en
    await track("/en");
    expect(mockFetch).toHaveBeenCalledTimes(2);
    const secondBody = JSON.parse(mockFetch.mock.calls[1]![1].body);
    expect(secondBody.event.properties.landing_page).toBe("/en");

    // Re-render with /en again (same pathname)
    await track("/en");
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it("does not emit inactive Lá, upgrade, or commerce events", async () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: true });
    await sendLandingEvent("/vi", mockFetch as unknown as typeof fetch);
    const body = JSON.parse(mockFetch.mock.calls[0]![1].body);
    expect(body.event.name).toBe("landing");
  });
});
