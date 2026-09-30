import { describe, expect, it } from "vitest";

import {
  generateUnsubscribeToken,
  verifyUnsubscribeToken,
  fingerprintEmail,
  createDatabaseNotificationPreferenceStore,
} from "./notification-preference.js";

describe("notification-preference token handling", () => {
  const secret = "test-secret-key-1234567890123456";

  it("generates and verifies a valid unsubscribe token", () => {
    const now = new Date("2026-09-27T12:00:00Z");
    const token = generateUnsubscribeToken(
      { userId: "usr-123", email: "User@Test.com" },
      secret,
      now,
    );

    const verified = verifyUnsubscribeToken(token, secret, undefined, now);
    expect(verified.ok).toBe(true);
    if (verified.ok) {
      expect(verified.value.userId).toBe("usr-123");
      expect(verified.value.email).toBe("user@test.com");
    }
  });

  it("rejects a tampered token signature", () => {
    const now = new Date("2026-09-27T12:00:00Z");
    const token = generateUnsubscribeToken(
      { userId: "usr-123", email: "user@test.com" },
      secret,
      now,
    );
    const tampered = token.slice(0, -4) + "abcd";

    const verified = verifyUnsubscribeToken(tampered, secret, undefined, now);
    expect(verified.ok).toBe(false);
    if (!verified.ok) {
      expect(verified.error.code).toBe("TOKEN_INVALID");
    }
  });

  it("rejects an expired token based on injected clock and maxAge", () => {
    const tokenIssuedAt = new Date("2026-08-01T12:00:00Z");
    const token = generateUnsubscribeToken(
      { userId: "usr-123", email: "user@test.com" },
      secret,
      tokenIssuedAt,
    );

    const nowAfter31Days = new Date("2026-09-02T12:00:00Z");
    const verified = verifyUnsubscribeToken(
      token,
      secret,
      30 * 24 * 60 * 60 * 1000,
      nowAfter31Days,
    );

    expect(verified.ok).toBe(false);
    if (!verified.ok) {
      expect(verified.error.code).toBe("TOKEN_EXPIRED");
    }
  });
  it("rejects a future-issued token beyond bounded clock skew", () => {
    const baseTime = new Date("2026-09-27T12:00:00Z");
    const futureIssuedAt = new Date("2026-09-27T12:05:00Z"); // 5 minutes in the future
    const token = generateUnsubscribeToken(
      { userId: "usr-123", email: "user@test.com" },
      secret,
      futureIssuedAt,
    );

    const verified = verifyUnsubscribeToken(token, secret, undefined, baseTime);
    expect(verified.ok).toBe(false);
    if (!verified.ok) {
      expect(verified.error.code).toBe("TOKEN_INVALID");
    }
  });

  it("accepts a token within bounded future skew", () => {
    const baseTime = new Date("2026-09-27T12:00:00Z");
    const slightFutureTime = new Date("2026-09-27T12:00:30Z"); // 30 seconds future (within 60s)
    const token = generateUnsubscribeToken(
      { userId: "usr-123", email: "user@test.com" },
      secret,
      slightFutureTime,
    );

    const verified = verifyUnsubscribeToken(token, secret, undefined, baseTime);
    expect(verified.ok).toBe(true);
  });

  it("fails closed on missing or empty secret", () => {
    const now = new Date("2026-09-27T12:00:00Z");
    expect(() => generateUnsubscribeToken({ userId: "u1", email: "u1@test.com" }, "")).toThrow(
      "NOTIFICATION_PREFERENCE_SECRET_REQUIRED",
    );
    expect(() => fingerprintEmail("u1@test.com", "")).toThrow(
      "NOTIFICATION_PREFERENCE_SECRET_REQUIRED",
    );

    const token = generateUnsubscribeToken({ userId: "u1", email: "u1@test.com" }, secret, now);
    const verified = verifyUnsubscribeToken(token, "", undefined, now);
    expect(verified.ok).toBe(false);
    if (!verified.ok) {
      expect(verified.error.code).toBe("TOKEN_INVALID");
    }

    expect(() => createDatabaseNotificationPreferenceStore(null as any, "")).toThrow(
      "NOTIFICATION_PREFERENCE_STORE_CONFIG_INVALID",
    );
  });
});
