import { describe, expect, it, vi } from "vitest";
import {
  generateUnsubscribeToken,
  type NotificationPreferenceStore,
} from "@lasoviet/backend/notifications/notification-preference";
import {
  createUnsubscribeRouteHandler,
  GET,
  MAX_UNSUBSCRIBE_BODY_BYTES,
  NO_STORE_NO_REFERRER_HEADERS,
} from "./route";

describe("POST /api/notifications/unsubscribe", () => {
  const secret = "test-internal-actor-secret-key-123456";
  const canonicalOrigin = "https://lasoviet.net";
  const now = new Date("2026-09-28T12:00:00Z");

  function createMockStore(overrides?: Partial<NotificationPreferenceStore>): NotificationPreferenceStore {
    const unsubscribedEmails = new Set<string>();

    return {
      async getPreferences() {
        return { nurtureEmailsAllowed: true, hanRemindersAllowed: true, unsubscribedAll: false };
      },
      async updatePreferences() {},
      async unsubscribeEmail(email: string) {
        unsubscribedEmails.add(email);
      },
      async unsubscribeByToken(token: string) {
        const { verifyUnsubscribeToken } = await import("@lasoviet/backend/notifications/notification-preference");
        const verified = verifyUnsubscribeToken(token, secret, undefined, now);
        if (!verified.ok) return verified;
        unsubscribedEmails.add(verified.value.email);
        return { ok: true, value: verified.value };
      },
      async isNonTransactionalAllowed(recipient: string) {
        return !unsubscribedEmails.has(recipient);
      },
      ...overrides,
    };
  }

  function makePostRequest(
    body: unknown,
    options?: {
      origin?: string | null;
      contentType?: string | null;
      secFetchSite?: string;
      contentLength?: string | null;
      rawStream?: ReadableStream<Uint8Array>;
    },
  ): Request {
    const headers = new Headers();
    if (options?.contentType !== null) {
      headers.set("content-type", options?.contentType ?? "application/json");
    }
    if (options?.origin !== null && options?.origin !== undefined) {
      headers.set("origin", options.origin);
    } else if (options?.origin === undefined) {
      headers.set("origin", canonicalOrigin);
    }
    if (options?.secFetchSite) {
      headers.set("sec-fetch-site", options.secFetchSite);
    }
    if (options?.contentLength !== null && options?.contentLength !== undefined) {
      headers.set("content-length", options.contentLength);
    }

    if (options?.rawStream) {
      return new Request("https://lasoviet.net/api/notifications/unsubscribe", {
        method: "POST",
        headers,
        body: options.rawStream,
        // @ts-expect-error Node/undici RequestInit duplex
        duplex: "half",
      });
    }

    return new Request("https://lasoviet.net/api/notifications/unsubscribe", {
      method: "POST",
      headers,
      body: typeof body === "string" ? body : JSON.stringify(body),
    });
  }

  it("successfully unsubscribes with a valid token and returns no PII", async () => {
    const store = createMockStore();
    const handler = createUnsubscribeRouteHandler({
      preferenceStore: store,
      canonicalOrigin,
      secret,
      now: () => now,
    });

    const token = generateUnsubscribeToken(
      { userId: "user-456", email: "sensitive.user@example.com" },
      secret,
      now,
    );

    const req = makePostRequest({ token });
    const res = await handler(req);

    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe(NO_STORE_NO_REFERRER_HEADERS["cache-control"]);
    expect(res.headers.get("referrer-policy")).toBe(NO_STORE_NO_REFERRER_HEADERS["referrer-policy"]);

    const json = await res.json();
    expect(json).toEqual({ ok: true });
    expect(JSON.stringify(json)).not.toContain("sensitive.user@example.com");
    expect(JSON.stringify(json)).not.toContain("user-456");

    expect(await store.isNonTransactionalAllowed("sensitive.user@example.com")).toBe(false);
  });

  it("handles idempotent replay of the same token without error", async () => {
    const store = createMockStore();
    const handler = createUnsubscribeRouteHandler({
      preferenceStore: store,
      canonicalOrigin,
      secret,
      now: () => now,
    });

    const token = generateUnsubscribeToken(
      { userId: "user-456", email: "user@example.com" },
      secret,
      now,
    );

    const first = await handler(makePostRequest({ token }));
    expect(first.status).toBe(200);

    const replay = await handler(makePostRequest({ token }));
    expect(replay.status).toBe(200);
    expect(await replay.json()).toEqual({ ok: true });
  });

  it("returns uniform error on tampered token without account enumeration", async () => {
    const store = createMockStore();
    const handler = createUnsubscribeRouteHandler({
      preferenceStore: store,
      canonicalOrigin,
      secret,
      now: () => now,
    });

    const token = generateUnsubscribeToken(
      { userId: "user-456", email: "user@example.com" },
      secret,
      now,
    );
    const tampered = token.slice(0, -6) + "123456";

    const res = await handler(makePostRequest({ token: tampered }));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({
      ok: false,
      error: { code: "UNSUBSCRIBE_TOKEN_INVALID" },
    });
  });

  it("returns uniform error on expired token (> 30 days)", async () => {
    const store = createMockStore();
    const handler = createUnsubscribeRouteHandler({
      preferenceStore: store,
      canonicalOrigin,
      secret,
      now: () => now,
    });

    const thirtyOneDaysAgo = new Date(now.getTime() - 31 * 24 * 60 * 60 * 1000);
    const expiredToken = generateUnsubscribeToken(
      { userId: "user-456", email: "user@example.com" },
      secret,
      thirtyOneDaysAgo,
    );

    const res = await handler(makePostRequest({ token: expiredToken }));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({
      ok: false,
      error: { code: "UNSUBSCRIBE_TOKEN_INVALID" },
    });
  });

  it("returns uniform error on future-issued token beyond bounded skew", async () => {
    const store = createMockStore();
    const handler = createUnsubscribeRouteHandler({
      preferenceStore: store,
      canonicalOrigin,
      secret,
      now: () => now,
    });

    const futureTime = new Date(now.getTime() + 10 * 60 * 1000);
    const futureToken = generateUnsubscribeToken(
      { userId: "user-456", email: "user@example.com" },
      secret,
      futureTime,
    );

    const res = await handler(makePostRequest({ token: futureToken }));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({
      ok: false,
      error: { code: "UNSUBSCRIBE_TOKEN_INVALID" },
    });
  });

  it("rejects missing, null, or wrong Origin with 403 Forbidden", async () => {
    const store = createMockStore();
    const handler = createUnsubscribeRouteHandler({
      preferenceStore: store,
      canonicalOrigin,
      secret,
      now: () => now,
    });

    const token = generateUnsubscribeToken({ userId: "u1", email: "u1@test.com" }, secret, now);

    // Missing origin
    const noOrigin = makePostRequest({ token }, { origin: null });
    expect((await handler(noOrigin)).status).toBe(403);

    // Empty origin
    const emptyOrigin = makePostRequest({ token }, { origin: "   " });
    expect((await handler(emptyOrigin)).status).toBe(403);

    // Wrong origin
    const wrongOrigin = makePostRequest({ token }, { origin: "https://evil.com" });
    expect((await handler(wrongOrigin)).status).toBe(403);

    // sec-fetch-site: cross-site
    const crossSite = makePostRequest({ token }, { secFetchSite: "cross-site" });
    expect((await handler(crossSite)).status).toBe(403);
  });

  it("requires application/json content-type header", async () => {
    const store = createMockStore();
    const handler = createUnsubscribeRouteHandler({
      preferenceStore: store,
      canonicalOrigin,
      secret,
      now: () => now,
    });

    const token = generateUnsubscribeToken({ userId: "u1", email: "u1@test.com" }, secret, now);

    // Missing content-type
    const noContentType = makePostRequest({ token }, { contentType: null });
    expect((await handler(noContentType)).status).toBe(415);

    // Text content-type
    const textContentType = makePostRequest({ token }, { contentType: "text/plain" });
    expect((await handler(textContentType)).status).toBe(415);

    // application/jsonp rejected
    const jsonpContentType = makePostRequest({ token }, { contentType: "application/jsonp" });
    expect((await handler(jsonpContentType)).status).toBe(415);

    // application/json with parameters accepted
    const charsetJson = makePostRequest({ token }, { contentType: "application/json; charset=utf-8" });
    expect((await handler(charsetJson)).status).toBe(200);
  });

  it("catches getOrCreateDefaultStore initialization failures and returns generic 503", async () => {
    const handler = createUnsubscribeRouteHandler({
      canonicalOrigin,
      getDefaultStore: () => {
        throw new Error("ENV_LOAD_FAILED_SECRET_UNAVAILABLE");
      },
      now: () => now,
    });

    const token = generateUnsubscribeToken({ userId: "u1", email: "u1@test.com" }, secret, now);
    const res = await handler(makePostRequest({ token }));

    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body).toEqual({
      ok: false,
      error: { code: "SERVICE_UNAVAILABLE" },
    });
    expect(JSON.stringify(body)).not.toContain("ENV_LOAD_FAILED");
  });

  it("catches store/database exceptions and returns generic 503 with no leaked data", async () => {
    const failingStore = createMockStore({
      async unsubscribeByToken() {
        throw new Error("FATAL_POSTGRES_CONNECTION_ERROR_SELECT_PG_SHADOW_CONFIDENTIAL");
      },
    });

    const handler = createUnsubscribeRouteHandler({
      preferenceStore: failingStore,
      canonicalOrigin,
      secret,
      now: () => now,
    });

    const token = generateUnsubscribeToken({ userId: "u1", email: "u1@test.com" }, secret, now);
    const res = await handler(makePostRequest({ token }));

    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body).toEqual({
      ok: false,
      error: { code: "SERVICE_UNAVAILABLE" },
    });
    // Verify no raw exception data leaked
    expect(JSON.stringify(body)).not.toContain("FATAL_POSTGRES");
  });

  it("rejects streaming body exceeding 4096 bytes WITHOUT content-length header", async () => {
    const store = createMockStore();
    const handler = createUnsubscribeRouteHandler({
      preferenceStore: store,
      canonicalOrigin,
      secret,
      now: () => now,
    });

    // Generate stream with 5000 bytes
    const largeChunk = new Uint8Array(5000).fill(120);
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(largeChunk);
        controller.close();
      },
    });

    const req = makePostRequest(null, {
      rawStream: stream,
      contentLength: null, // missing content-length
    });

    const res = await handler(req);
    expect(res.status).toBe(413);
  });

  it("rejects streaming body exceeding 4096 bytes WITH forged small content-length header", async () => {
    const store = createMockStore();
    const handler = createUnsubscribeRouteHandler({
      preferenceStore: store,
      canonicalOrigin,
      secret,
      now: () => now,
    });

    // Stream with 5000 bytes, but forged content-length: 10
    const largeChunk = new Uint8Array(5000).fill(120);
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(largeChunk);
        controller.close();
      },
    });

    const req = makePostRequest(null, {
      rawStream: stream,
      contentLength: "10", // forged short content-length
    });

    const res = await handler(req);
    expect(res.status).toBe(413);
  });

  it("rejects declared content-length header exceeding 4096 bytes", async () => {
    const store = createMockStore();
    const handler = createUnsubscribeRouteHandler({
      preferenceStore: store,
      canonicalOrigin,
      secret,
      now: () => now,
    });

    const res = await handler(
      makePostRequest({ token: "a" }, { contentLength: String(MAX_UNSUBSCRIBE_BODY_BYTES + 1) }),
    );
    expect(res.status).toBe(413);
  });

  it("rejects GET requests with 405 Method Not Allowed and causes no mutation", async () => {
    const res = await GET();
    expect(res.status).toBe(405);
    expect(res.headers.get("cache-control")).toBe(NO_STORE_NO_REFERRER_HEADERS["cache-control"]);
    expect(await res.json()).toEqual({
      ok: false,
      error: { code: "METHOD_NOT_ALLOWED" },
    });
  });
});
