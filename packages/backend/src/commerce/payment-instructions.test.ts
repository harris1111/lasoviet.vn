import { describe, expect, it } from "vitest";
import { createPaymentInstructions } from "./payment-instructions.js";

describe("createPaymentInstructions", () => {
  it("builds valid VietQR payment instructions with exact query fields and ISO expiration", () => {
    const instructions = createPaymentInstructions({
      bankCode: "VCB",
      accountNumber: "123456789",
      accountHolder: "LA SO VIET",
      amount: 79_000,
      currency: "VND",
      invoiceNumber: "LSV-order-1",
      createdAt: new Date("2026-09-05T00:00:00.000Z"),
      orderTtlSeconds: 900,
    });

    expect(instructions).toEqual({
      bankCode: "VCB",
      accountNumber: "123456789",
      accountHolder: "LA SO VIET",
      amount: 79_000,
      currency: "VND",
      transferDescription: "LSV-order-1",
      qrUrl: "https://vietqr.app/img?acc=123456789&bank=VCB&amount=79000&des=LSV-order-1&template=compact",
      expiresAt: "2026-09-05T00:15:00.000Z",
    });

    const parsedUrl = new URL(instructions.qrUrl);
    expect(parsedUrl.origin).toBe("https://vietqr.app");
    expect(parsedUrl.pathname).toBe("/img");
    expect(Array.from(parsedUrl.searchParams.keys())).toEqual([
      "acc",
      "bank",
      "amount",
      "des",
      "template",
    ]);
    expect(parsedUrl.searchParams.get("acc")).toBe("123456789");
    expect(parsedUrl.searchParams.get("bank")).toBe("VCB");
    expect(parsedUrl.searchParams.get("amount")).toBe("79000");
    expect(parsedUrl.searchParams.get("des")).toBe("LSV-order-1");
    expect(parsedUrl.searchParams.get("template")).toBe("compact");
  });

  it("rejects non-positive, non-integer, or non-finite TTL values", () => {
    const base = {
      bankCode: "VCB",
      accountNumber: "123456789",
      accountHolder: "LA SO VIET",
      amount: 79_000,
      currency: "VND" as const,
      invoiceNumber: "LSV-order-1",
      createdAt: new Date("2026-09-05T00:00:00.000Z"),
    };

    for (const invalidTtl of [0, -900, 900.5, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(() =>
        createPaymentInstructions({
          ...base,
          orderTtlSeconds: invalidTtl,
        }),
      ).toThrow();
    }
  });

  it("rejects invalid amounts or invalid dates or non-VND currency", () => {
    const base = {
      bankCode: "VCB",
      accountNumber: "123456789",
      accountHolder: "LA SO VIET",
      amount: 79_000,
      currency: "VND" as const,
      invoiceNumber: "LSV-order-1",
      createdAt: new Date("2026-09-05T00:00:00.000Z"),
      orderTtlSeconds: 900,
    };

    expect(() =>
      createPaymentInstructions({
        ...base,
        amount: 0,
      }),
    ).toThrow();

    expect(() =>
      createPaymentInstructions({
        ...base,
        amount: -100,
      }),
    ).toThrow();

    expect(() =>
      createPaymentInstructions({
        ...base,
        amount: 100.5,
      }),
    ).toThrow();

    expect(() =>
      createPaymentInstructions({
        ...base,
        createdAt: new Date("invalid"),
      }),
    ).toThrow();

    expect(() =>
      createPaymentInstructions({
        ...base,
        currency: "USD" as unknown as "VND",
      }),
    ).toThrow();
  });

  it("rejects empty or whitespace bank metadata", () => {
    const base = {
      bankCode: "VCB",
      accountNumber: "123456789",
      accountHolder: "LA SO VIET",
      amount: 79_000,
      currency: "VND" as const,
      invoiceNumber: "LSV-order-1",
      createdAt: new Date("2026-09-05T00:00:00.000Z"),
      orderTtlSeconds: 900,
    };

    expect(() =>
      createPaymentInstructions({
        ...base,
        bankCode: "  ",
      }),
    ).toThrow();

    expect(() =>
      createPaymentInstructions({
        ...base,
        accountNumber: "",
      }),
    ).toThrow();

    expect(() =>
      createPaymentInstructions({
        ...base,
        accountHolder: "   ",
      }),
    ).toThrow();

    expect(() =>
      createPaymentInstructions({
        ...base,
        invoiceNumber: "",
      }),
    ).toThrow();
  });
});