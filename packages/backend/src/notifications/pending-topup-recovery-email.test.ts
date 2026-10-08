import { describe, expect, it } from "vitest";

import { renderPendingTopUpRecoveryEmail, type PendingTopUpRecoveryEmailInput } from "./pending-topup-recovery-email.js";
import { verifyUnsubscribeToken } from "./notification-preference.js";

const NOW = new Date("2026-10-07T12:00:00.000Z");
const SECRET = "synthetic-recovery-email-secret-not-a-provider-credential";
const input: PendingTopUpRecoveryEmailInput = {
  userId: "synthetic-owner",
  email: "owner@example.test",
  orderId: "11111111-1111-4111-8111-111111111111",
  deliveryId: "22222222-2222-4222-8222-222222222222",
  locale: "vi",
  productSku: "ZIWEI-IDENTITY-P0",
  amountLa: 960,
  topUpSku: "LA-ENTRY-300",
  topUpVnd: 29000,
  tokenSecret: SECRET,
  now: NOW,
};

function links(html: string): string[] {
  return [...html.matchAll(/href="([^"]+)"/g)].map(match => match[1]!.replaceAll("&amp;", "&"));
}

describe("pending top-up recovery email preparation", () => {
  it.each(["vi", "en"] as const)("renders usable %s action and unsubscribe links in both formats", locale => {
    const message = renderPendingTopUpRecoveryEmail({ ...input, locale });
    const action = new URL(message.actionUrl);
    expect(action.origin).toBe("https://lasoviet.net");
    expect(action.pathname).toBe(`${locale === "en" ? "/en" : ""}/thanh-toan/${input.orderId}`);
    expect([...action.searchParams]).toEqual([["utm_source", "reminder"]]);
    expect(action.hash).toBe(`#recovery=${input.deliveryId}`);
    expect(links(message.html)).toEqual([message.actionUrl, message.unsubscribeUrl]);
    expect(message.text).toContain(message.actionUrl);
    expect(message.text).toContain(message.unsubscribeUrl);
    expect(message.text).toContain(locale === "vi" ? "29.000 VNĐ" : "29,000 VND");
    expect(message.text).toContain(locale === "vi" ? "Tử Vi trọn đời" : "Lifetime Zi Wei reading");
    expect(message.text).toContain(locale === "vi" ? "bỏ qua email" : "ignore this email");
    expect(message.html).not.toContain("{actionUrl}");
    expect(message.html).not.toContain(input.email);
    expect(message.subject).not.toContain(input.email);
  });

  it("binds the signed unsubscribe token to the original owner/email and injected clock", () => {
    const message = renderPendingTopUpRecoveryEmail({ ...input, email: " OWNER@EXAMPLE.TEST " });
    const url = new URL(message.unsubscribeUrl);
    expect(url.origin).toBe("https://lasoviet.net");
    expect(url.pathname).toBe("/thong-bao/huy-dang-ky");
    expect(url.search).toBe("");
    const token = new URLSearchParams(url.hash.slice(1)).get("token")!;
    expect(verifyUnsubscribeToken(token, SECRET, undefined, NOW)).toMatchObject({
      ok: true, value: { userId: input.userId, email: input.email },
    });
    expect(verifyUnsubscribeToken(token, "wrong-synthetic-secret", undefined, NOW).ok).toBe(false);
    expect(verifyUnsubscribeToken(token, SECRET, 1000, new Date(NOW.getTime() + 1001)).ok).toBe(false);
  });

  it.each([
    { orderId: "../another-order" },
    { orderId: "order?redirect=https://example.test" },
    { orderId: 'order"><script>' },
    { orderId: "order\nheader" },
    { deliveryId: 'receipt" onclick="alert(1)' },
    { deliveryId: "not-a-delivery-uuid" },
    { productSku: "ZIWEI-CAREER-P0", amountLa: 480 },
    { productSku: "UNKNOWN-SKU" },
    { amountLa: 720 },
    { amountLa: Number.NaN },
    { topUpSku: "UNKNOWN-PACK" },
    { topUpVnd: 99000 },
    { locale: "fr" as "vi" },
    { email: "invalid-email" },
    { userId: "" },
    { now: new Date(Number.NaN) },
  ])("rejects malformed routes, held products and inconsistent original facts: %j", overrides => {
    expect(() => renderPendingTopUpRecoveryEmail({ ...input, ...overrides })).toThrow("RECOVERY_EMAIL_INPUT_INVALID");
  });

  it("cannot mint an unsubscribe action without a valid token secret", () => {
    expect(() => renderPendingTopUpRecoveryEmail({ ...input, tokenSecret: "" }))
      .toThrow("NOTIFICATION_PREFERENCE_SECRET_REQUIRED");
  });

  it("keeps the subject free of recipient-controlled header text", () => {
    expect(() => renderPendingTopUpRecoveryEmail({ ...input, email: "owner@example.test\nBcc: other@example.test" }))
      .toThrow("RECOVERY_EMAIL_INPUT_INVALID");
  });
});
