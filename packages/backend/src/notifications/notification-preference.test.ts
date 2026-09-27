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
});
