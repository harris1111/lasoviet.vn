import { describe, expect, it } from "vitest";
import { parseCheckoutStatus } from "./checkout-status.js";

const validCheckoutStatus = {
  order: {
    id: "order-1",
    status: "pending",
    amount: 79000,
    currency: "VND",
    locale: "vi",
  },
  paymentInstructions: {
    bankCode: "VCB",
    accountNumber: "123456789",
    accountHolder: "LA SO VIET",
    amount: 79000,
    currency: "VND",
    transferDescription: "LSV-order-1",
    qrUrl: "https://vietqr.app/img?acc=123456789&bank=VCB&amount=79000&des=LSV-order-1&template=compact",
    expiresAt: "2026-09-05T00:15:00.000Z",
  },
  reportId: null,
};

describe("parseCheckoutStatus", () => {
  it("parses valid pending checkout status without reportId", () => {
    const result = parseCheckoutStatus(validCheckoutStatus);
    expect(result).toEqual(validCheckoutStatus);
  });

  it("parses valid paid checkout status with reportId", () => {
    const paid = {
      ...validCheckoutStatus,
      order: { ...validCheckoutStatus.order, status: "paid" },
      reportId: "report-123",
    };
    const result = parseCheckoutStatus(paid);
    expect(result).toEqual(paid);
  });

  it("rejects unknown order status", () => {
    expect(() =>
      parseCheckoutStatus({
        ...validCheckoutStatus,
        order: { ...validCheckoutStatus.order, status: "completed" },
      }),
    ).toThrow();
  });

  it("rejects non-VND currency in order", () => {
    expect(() =>
      parseCheckoutStatus({
        ...validCheckoutStatus,
        order: { ...validCheckoutStatus.order, currency: "USD" },
      }),
    ).toThrow();
  });

  it("rejects non-VND currency in paymentInstructions", () => {
    expect(() =>
      parseCheckoutStatus({
        ...validCheckoutStatus,
        paymentInstructions: {
          ...validCheckoutStatus.paymentInstructions,
          currency: "USD",
        },
      }),
    ).toThrow();
  });

  it("rejects QR URL with origin outside https://vietqr.app", () => {
    expect(() =>
      parseCheckoutStatus({
        ...validCheckoutStatus,
        paymentInstructions: {
          ...validCheckoutStatus.paymentInstructions,
          qrUrl: "https://evil.example.com/img?acc=123",
        },
      }),
    ).toThrow();
  });

  it("rejects malformed expiresAt date", () => {
    expect(() =>
      parseCheckoutStatus({
        ...validCheckoutStatus,
        paymentInstructions: {
          ...validCheckoutStatus.paymentInstructions,
          expiresAt: "not-a-date",
        },
      }),
    ).toThrow();
  });

  it("rejects secret-like extra fields in root", () => {
    expect(() =>
      parseCheckoutStatus({
        ...validCheckoutStatus,
        secretKey: "secret-token",
      }),
    ).toThrow();
  });

  it("rejects secret-like extra fields in paymentInstructions", () => {
    expect(() =>
      parseCheckoutStatus({
        ...validCheckoutStatus,
        paymentInstructions: {
          ...validCheckoutStatus.paymentInstructions,
          webhookSecret: "secret-token",
        },
      }),
    ).toThrow();
  });

  it("rejects secret-like extra fields in order", () => {
    expect(() =>
      parseCheckoutStatus({
        ...validCheckoutStatus,
        order: {
          ...validCheckoutStatus.order,
          internalSecret: "secret-token",
        },
      }),
    ).toThrow();
  });
  it("parses valid paid checkout status with null paymentInstructions", () => {
    const paidNull = {
      order: {
        id: "order-1",
        status: "paid" as const,
        amount: 79000,
        currency: "VND" as const,
        locale: "vi" as const,
      },
      paymentInstructions: null,
      reportId: "report-123",
    };
    const result = parseCheckoutStatus(paidNull);
    expect(result).toEqual(paidNull);
  });

  it.each(["expired", "failed", "refunded"] as const)(
    "parses valid %s checkout status with null paymentInstructions",
    (status) => {
      const nonPendingNull = {
        order: {
          id: "order-1",
          status,
          amount: 79000,
          currency: "VND" as const,
          locale: "vi" as const,
        },
        paymentInstructions: null,
        reportId: null,
      };
      const result = parseCheckoutStatus(nonPendingNull);
      expect(result).toEqual(nonPendingNull);
    },
  );

  it("rejects pending order with null paymentInstructions", () => {
    expect(() =>
      parseCheckoutStatus({
        ...validCheckoutStatus,
        paymentInstructions: null,
      }),
    ).toThrow();
  });

  it("rejects extra fields in root when paymentInstructions is null", () => {
    expect(() =>
      parseCheckoutStatus({
        order: {
          id: "order-1",
          status: "paid",
          amount: 79000,
          currency: "VND",
          locale: "vi",
        },
        paymentInstructions: null,
        reportId: "report-123",
        extraField: "not-allowed",
      }),
    ).toThrow();
  });

});
