import { describe, expect, it } from "vitest";

import { requireSentAuthEmailDelivery } from "./auth-email-delivery-outcome.js";

describe("auth email client delivery outcome", () => {
  it("rejects a private 200 non-delivery outcome", () => {
    expect(() =>
      requireSentAuthEmailDelivery({
        status: "failed_retryable",
        attemptCount: 1,
        providerMessageId: null,
        errorCode: "SMTP_RETRYABLE",
      }),
    ).toThrow("AUTH_EMAIL_DELIVERY_FAILED");
  });

  it("accepts only a sent delivery outcome", () => {
    expect(() =>
      requireSentAuthEmailDelivery({
        status: "sent",
        attemptCount: 1,
        providerMessageId: "provider-message",
        errorCode: null,
      }),
    ).not.toThrow();
  });
});
