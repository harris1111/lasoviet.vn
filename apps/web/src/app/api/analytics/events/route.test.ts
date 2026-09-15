import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("server-only", () => ({}));

const mockGetSession = vi.fn();
vi.mock("../../../../auth/auth", () => ({
  getAuth: () => ({
    api: {
      getSession: mockGetSession,
    },
  }),
}));

const mockSendCommand = vi.fn();
vi.mock("../../../../analytics/analytics-client", () => ({
  sendAnalyticsIngestCommand: (...args: any[]) => mockSendCommand(...args),
}));

import { createAnalyticsRouteHandler, POST } from "./route";
import { VISITOR_COOKIE_NAME } from "../../../../analytics/visitor-cookie";

const TEST_NOW = new Date("2026-09-14T10:00:00.000Z");
const testHandler = createAnalyticsRouteHandler({ now: () => TEST_NOW });

describe("analytics events web route (acceptance 5)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSession.mockResolvedValue(null);
    mockSendCommand.mockResolvedValue({
      ok: true,
      value: { replayed: false },
    });
  });

  const validPayload = {
    version: 1,
    idempotencyKey: "synthetic-idem-1",
    occurredAt: TEST_NOW.toISOString(),
    event: {
      name: "landing",
      properties: { landing_page: "/vi" },
    },
  };

  it("ignores spoofed x-forwarded-for and x-real-ip headers, persists null IP if trusted header is absent", async () => {
    const request = new NextRequest("http://localhost:3000/api/analytics/events", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-forwarded-for": "198.51.100.1, 198.51.100.2",
        "x-real-ip": "198.51.100.1",
      },
      body: JSON.stringify(validPayload),
    });

    const response = await testHandler(request);
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(mockSendCommand).toHaveBeenCalledTimes(1);
    const sent = mockSendCommand.mock.calls[0]![0];
    expect(sent.ip).toBeNull();
  });

  it("accepts valid dedicated x-lasoviet-client-ip header and rejects comma lists or invalid IPs", async () => {
    // Valid IP
    const validReq = new NextRequest(
      "http://localhost:3000/api/analytics/events",
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-lasoviet-client-ip": "203.0.113.195",
        },
        body: JSON.stringify(validPayload),
      },
    );
    await testHandler(validReq);
    expect(mockSendCommand.mock.calls[0]![0].ip).toBe("203.0.113.195");

    // Invalid IP with comma
    mockSendCommand.mockClear();
    const invalidReq = new NextRequest(
      "http://localhost:3000/api/analytics/events",
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-lasoviet-client-ip": "203.0.113.195, 1.1.1.1",
        },
        body: JSON.stringify(validPayload),
      },
    );
    await testHandler(invalidReq);
    expect(mockSendCommand.mock.calls[0]![0].ip).toBeNull();
  });

  it("derives UA, referrer, UTM params, pathname, locale, and deviceClass server-side", async () => {
    const request = new NextRequest("http://localhost:3000/api/analytics/events", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "user-agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X)",
        referer:
          "http://localhost:3000/en/pricing?utm_source=fb&utm_medium=paid&utm_campaign=fall&utm_content=img1&utm_term=horoscope",
      },
      body: JSON.stringify(validPayload),
    });

    const response = await testHandler(request);
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    const sent = mockSendCommand.mock.calls[0]![0];
    expect(sent.deviceClass).toBe("mobile");
    expect(sent.locale).toBe("en");
    expect(sent.pathname).toBe("/en/pricing");
    expect(sent.utmSource).toBe("fb");
    expect(sent.utmMedium).toBe("paid");
    expect(sent.utmCampaign).toBe("fall");
    expect(sent.utmContent).toBe("img1");
    expect(sent.utmTerm).toBe("horoscope");
  });

  it("rejects cross-origin referer from setting first-party pathname or UTM params", async () => {
    const request = new NextRequest("http://localhost:3000/api/analytics/events", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        referer:
          "https://external-search.example/search?utm_source=evil&utm_campaign=hack",
      },
      body: JSON.stringify(validPayload),
    });

    const response = await testHandler(request);
    expect(response.status).toBe(200);
    const sent = mockSendCommand.mock.calls[0]![0];
    expect(sent.referrer).toBe("https://external-search.example/search?utm_source=evil&utm_campaign=hack");
    expect(sent.pathname).toBeNull();
    expect(sent.utmSource).toBeNull();
    expect(sent.locale).toBe("vi");
  });

  it("observes account session strictly when session and user IDs match; rejects anonymous, mismatched or empty IDs", async () => {
    // Coherent matching account session
    mockGetSession.mockResolvedValueOnce({
      session: { userId: "user_logged_in_123" },
      user: { id: "user_logged_in_123", isAnonymous: false },
    });
    const loggedInReq = new NextRequest(
      "http://localhost:3000/api/analytics/events",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(validPayload),
      },
    );
    await testHandler(loggedInReq);
    expect(mockSendCommand.mock.calls[0]![0].userId).toBe("user_logged_in_123");

    // Mismatched session userId vs user id
    mockSendCommand.mockClear();
    mockGetSession.mockResolvedValueOnce({
      session: { userId: "user_session_abc" },
      user: { id: "user_profile_xyz", isAnonymous: false },
    });
    const mismatchedReq = new NextRequest(
      "http://localhost:3000/api/analytics/events",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(validPayload),
      },
    );
    await testHandler(mismatchedReq);
    expect(mockSendCommand.mock.calls[0]![0].userId).toBeNull();

    // Anonymous session -> userId must be null
    mockSendCommand.mockClear();
    mockGetSession.mockResolvedValueOnce({
      session: { userId: "anon_actor_123" },
      user: { id: "anon_actor_123", isAnonymous: true },
    });
    const anonReq = new NextRequest(
      "http://localhost:3000/api/analytics/events",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(validPayload),
      },
    );
    await testHandler(anonReq);
    expect(mockSendCommand.mock.calls[0]![0].userId).toBeNull();
  });

  it("rotates visitor_id cookie and returns 409 on VISITOR_ACCOUNT_CONFLICT", async () => {
    mockSendCommand.mockResolvedValueOnce({
      ok: false,
      error: { code: "VISITOR_ACCOUNT_CONFLICT" },
    });

    const initialVisitorId = "123e4567-e89b-12d3-a456-426614174000";
    const request = new NextRequest("http://localhost:3000/api/analytics/events", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie: `${VISITOR_COOKIE_NAME}=${initialVisitorId}`,
      },
      body: JSON.stringify(validPayload),
    });

    const response = await testHandler(request);
    expect(response.status).toBe(409);
    expect(response.headers.get("cache-control")).toBe("no-store");
    const body = await response.json();
    expect(body).toEqual({
      ok: false,
      error: { code: "VISITOR_ACCOUNT_CONFLICT" },
    });

    const setCookieHeader = response.cookies.get(VISITOR_COOKIE_NAME)?.value;
    expect(setCookieHeader).toBeDefined();
    expect(setCookieHeader).not.toBe(initialVisitorId);
  });

  it("rejects invalid events not conforming to the config event allowlist", async () => {
    const invalidEventPayload = {
      ...validPayload,
      event: { name: "unknown_custom_event", properties: {} },
    };
    const request = new NextRequest("http://localhost:3000/api/analytics/events", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(invalidEventPayload),
    });
    const response = await testHandler(request);
    expect(response.status).toBe(400);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(mockSendCommand).not.toHaveBeenCalled();
  });

  it("rejects occurredAt timestamps skewed by more than 5 minutes relative to server clock", async () => {
    // 6 minutes in the future
    const futurePayload = {
      ...validPayload,
      occurredAt: new Date(TEST_NOW.getTime() + 6 * 60 * 1000).toISOString(),
    };
    const futureReq = new NextRequest("http://localhost:3000/api/analytics/events", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(futurePayload),
    });
    const futureRes = await testHandler(futureReq);
    expect(futureRes.status).toBe(400);

    // 6 minutes in the past
    const pastPayload = {
      ...validPayload,
      occurredAt: new Date(TEST_NOW.getTime() - 6 * 60 * 1000).toISOString(),
    };
    const pastReq = new NextRequest("http://localhost:3000/api/analytics/events", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(pastPayload),
    });
    const pastRes = await testHandler(pastReq);
    expect(pastRes.status).toBe(400);
  });

  it("catches unexpected client failure and returns bounded 503 with cache-control no-store", async () => {
    mockSendCommand.mockRejectedValueOnce(new Error("Unexpected throw inside client"));
    const request = new NextRequest("http://localhost:3000/api/analytics/events", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(validPayload),
    });
    const response = await testHandler(request);
    expect(response.status).toBe(503);
    expect(response.headers.get("cache-control")).toBe("no-store");
    const body = await response.json();
    expect(body).toEqual({ ok: false, error: { code: "ANALYTICS_DELIVERY_FAILED" } });
  });
});
