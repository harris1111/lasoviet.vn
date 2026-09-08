import * as internalGuard from "../auth/internal-actor.guard.js";
import { BadRequestException, ConflictException, ServiceUnavailableException, UnauthorizedException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import { createHmac } from "node:crypto";
import * as backend from "@lasoviet/backend";

import { CommerceController } from "./commerce.controller.js";

function controller(options: {
  bankCode?: string;
  accountNumber?: string;
  accountHolder?: string;
  orderTtlSeconds?: number;
  webhookSecret?: string;
  sepayEnvironment?: "disabled" | "sandbox" | "production";
} = {}) {
  const database = {} as never;
  return new CommerceController(
    database,
    "internal-secret",
    options.sepayEnvironment === "disabled" ? undefined as never : "provider-secret",
    "ingress-secret",
    (options.sepayEnvironment ?? "sandbox") as never,
    options.sepayEnvironment === "disabled" ? undefined as never : "merchant",
    "https://lasoviet.example",
    options.orderTtlSeconds ?? 900,
    options.sepayEnvironment === "disabled" ? undefined as never : (options.webhookSecret ?? "synthetic-webhook-secret"),
    options.sepayEnvironment === "disabled" ? undefined as never : (options.bankCode ?? "VCB"),
    options.sepayEnvironment === "disabled" ? undefined as never : (options.accountNumber ?? "123456789"),
    options.sepayEnvironment === "disabled" ? undefined as never : (options.accountHolder ?? "LA SO VIET"),
  );
}

const nonPaid = Buffer.from(JSON.stringify({
  timestamp: 1,
  notification_type: "TRANSACTION_VOID",
  order: {
    id: "order", order_id: "provider-order", order_status: "CANCELLED",
    order_currency: "VND", order_amount: "79000.00", order_invoice_number: "LSV-order",
    custom_data: [], user_agent: "test", ip_address: "127.0.0.1", order_description: "test",
  },
  transaction: {
    id: "transaction", payment_method: "CARD", transaction_id: "event",
    transaction_type: "PAYMENT", transaction_date: "2026-09-03 00:00:00",
    transaction_status: "DECLINED", transaction_amount: "79000.00", transaction_currency: "VND",
  },
  customer: { id: "customer", customer_id: "customer" },
}));

describe("SePay controller HTTP contract", () => {
  it("rejects an unsigned checkout request before it can reach persistence", async () => {
    await expect(controller().create(undefined, {
      chartId: "chart-1",
      sku: "ZIWEI-IDENTITY-P0",
      locale: "vi",
    })).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it("rejects a checkout locale outside vi and en before actor resolution", async () => {
    await expect(controller().create(undefined, {
      chartId: "chart-1",
      sku: "ZIWEI-IDENTITY-P0",
      locale: "fr",
    })).resolves.toEqual({
      ok: false,
      error: { code: "COMMERCE_ORDER_INVALID" },
    });
  });

  it("returns CheckoutStatus projection on order creation", async () => {
    const authSpy = vi.spyOn(internalGuard, "verifyInternalActorToken").mockResolvedValue({
      kind: "account",
      userId: "user-1",
      sessionId: "session-1",
      requestId: "req-1",
    });
    const orderRecord = {
      id: "order-1",
      invoiceNumber: "LSV-order-1",
      ownerId: "user-1",
      chartId: "chart-1",
      chartVersionId: "chart-v1",
      sku: "ZIWEI-IDENTITY-P0",
      amount: 79000,
      currency: "VND",
      locale: "vi",
      status: "pending",
      paidAt: null,
      createdAt: new Date("2026-09-05T00:00:00.000Z"),
    };
    const repoSpy = vi.spyOn(backend, "createDatabaseCommerceRepository").mockReturnValue({
      createOrder: vi.fn().mockResolvedValue({
        ok: true,
        value: orderRecord,
        reused: false,
      }),
      readOrder: vi.fn(),
      readOrderProjection: vi.fn().mockResolvedValue({
        order: orderRecord,
        reportId: null,
      }),
      recordPaid: vi.fn(),
    } as never);

    try {
      const result = await controller().create("Bearer valid-token", {
        chartId: "chart-1",
        sku: "ZIWEI-IDENTITY-P0",
        locale: "vi",
      });
      expect(result).toEqual({
        ok: true,
        value: {
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
        },
      });
    } finally {
      authSpy.mockRestore();
      repoSpy.mockRestore();
    }
  });


  it("returns reportId on order creation when reusing an already-paid order", async () => {
    const authSpy = vi.spyOn(internalGuard, "verifyInternalActorToken").mockResolvedValue({
      kind: "account",
      userId: "user-1",
      sessionId: "session-1",
      requestId: "req-1",
    });
    const paidOrderRecord = {
      id: "order-paid-1",
      invoiceNumber: "LSV-order-paid-1",
      ownerId: "user-1",
      chartId: "chart-1",
      chartVersionId: "chart-v1",
      sku: "ZIWEI-IDENTITY-P0",
      amount: 79000,
      currency: "VND",
      locale: "vi",
      status: "paid",
      paidAt: new Date("2026-09-05T00:05:00.000Z"),
      createdAt: new Date("2026-09-05T00:00:00.000Z"),
    };
    const repoSpy = vi.spyOn(backend, "createDatabaseCommerceRepository").mockReturnValue({
      createOrder: vi.fn().mockResolvedValue({
        ok: true,
        value: paidOrderRecord,
        reused: true,
      }),
      readOrder: vi.fn(),
      readOrderProjection: vi.fn().mockResolvedValue({
        order: paidOrderRecord,
        reportId: "report-res-123",
      }),
      recordPaid: vi.fn(),
    } as never);

    try {
      const result = await controller().create("Bearer valid-token", {
        chartId: "chart-1",
        sku: "ZIWEI-IDENTITY-P0",
        locale: "vi",
      });
      expect(result).toEqual({
        ok: true,
        value: {
          order: {
            id: "order-paid-1",
            status: "paid",
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
            transferDescription: "LSV-order-paid-1",
            qrUrl: "https://vietqr.app/img?acc=123456789&bank=VCB&amount=79000&des=LSV-order-paid-1&template=compact",
            expiresAt: "2026-09-05T00:15:00.000Z",
          },
          reportId: "report-res-123",
        },
      });
    } finally {
      authSpy.mockRestore();
      repoSpy.mockRestore();
    }
  });

  it("handles impossible null projection after createOrder as stable failure", async () => {
    const authSpy = vi.spyOn(internalGuard, "verifyInternalActorToken").mockResolvedValue({
      kind: "account",
      userId: "user-1",
      sessionId: "session-1",
      requestId: "req-1",
    });
    const repoSpy = vi.spyOn(backend, "createDatabaseCommerceRepository").mockReturnValue({
      createOrder: vi.fn().mockResolvedValue({
        ok: true,
        value: { id: "order-1" },
        reused: false,
      }),
      readOrder: vi.fn(),
      readOrderProjection: vi.fn().mockResolvedValue(null),
      recordPaid: vi.fn(),
    } as never);

    try {
      const result = await controller().create("Bearer valid-token", {
        chartId: "chart-1",
        sku: "ZIWEI-IDENTITY-P0",
        locale: "vi",
      });
      expect(result).toEqual({
        ok: false,
        error: { code: "COMMERCE_ORDER_CREATE_FAILED" },
      });
    } finally {
      authSpy.mockRestore();
      repoSpy.mockRestore();
    }
  });

  it("returns CheckoutStatus projection on owner order read using readOrderProjection", async () => {
    const authSpy = vi.spyOn(internalGuard, "verifyInternalActorToken").mockResolvedValue({
      kind: "account",
      userId: "user-1",
      sessionId: "session-1",
      requestId: "req-1",
    });
    const repoSpy = vi.spyOn(backend, "createDatabaseCommerceRepository").mockReturnValue({
      createOrder: vi.fn(),
      readOrder: vi.fn(),
      readOrderProjection: vi.fn().mockResolvedValue(null),
      recordPaid: vi.fn(),
    } as never);

    try {
      const result = await controller().read("Bearer valid-token", "order-nonexistent");
      expect(result).toEqual({
        ok: false,
        error: { code: "ORDER_NOT_FOUND" },
      });
    } finally {
      authSpy.mockRestore();
      repoSpy.mockRestore();
    }
  });

  it("rejects read without valid authorization", async () => {
    await expect(controller().read(undefined, "order-1")).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it("maps ingress and provider authentication failures to 401", async () => {
    await expect(controller().webhook(undefined, "provider-secret", undefined, undefined, { rawBody: nonPaid }))
      .rejects.toBeInstanceOf(UnauthorizedException);
    await expect(controller().webhook("ingress-secret", "wrong", undefined, undefined, { rawBody: nonPaid }))
      .rejects.toBeInstanceOf(UnauthorizedException);
  });

  it("maps malformed provider data to 400", async () => {
    await expect(controller().webhook("ingress-secret", "provider-secret", undefined, undefined, { rawBody: Buffer.from("{}") }))
      .rejects.toBeInstanceOf(BadRequestException);
  });

  it("returns exactly the documented acknowledgement for authenticated non-paid notifications", async () => {
    await expect(controller().webhook("ingress-secret", "provider-secret", undefined, undefined, { rawBody: nonPaid }))
      .resolves.toEqual({ success: true });
  });

  it("rejects invalid HMAC bank webhook with 401", async () => {
    const bankTransfer = {
      id: 92704,
      gateway: "Vietcombank",
      transactionDate: "2026-09-05 10:00:00",
      accountNumber: "123456789",
      subAccount: "",
      code: "LSV-order-1",
      content: "LSV-order-1 chuyen tien",
      transferType: "in",
      description: "NGUYEN VAN A chuyen tien",
      transferAmount: 79000,
      accumulated: 1000000,
      referenceCode: "FT24012345678",
    };
    const rawBody = Buffer.from(JSON.stringify(bankTransfer));
    await expect(controller().webhook("ingress-secret", undefined, "sha256=wrong", "1757066400", { rawBody }))
      .rejects.toBeInstanceOf(UnauthorizedException);
  });

  it("rejects transferType 'out' with 400", async () => {
    const bankTransfer = {
      id: 92704,
      gateway: "Vietcombank",
      transactionDate: "2026-09-05 10:00:00",
      accountNumber: "123456789",
      subAccount: "",
      code: "LSV-order-1",
      content: "LSV-order-1 chuyen tien",
      transferType: "out",
      description: "NGUYEN VAN A chuyen tien",
      transferAmount: 79000,
      accumulated: 1000000,
      referenceCode: "FT24012345678",
    };
    const rawBody = Buffer.from(JSON.stringify(bankTransfer));
    const nowEpochSeconds = Math.floor(Date.now() / 1000);
    const hmac = createHmac("sha256", "synthetic-webhook-secret");
    hmac.update(String(nowEpochSeconds) + "." + rawBody.toString("utf8"));
    const signature = "sha256=" + hmac.digest("hex");

    await expect(controller().webhook("ingress-secret", undefined, signature, String(nowEpochSeconds), { rawBody }))
      .rejects.toBeInstanceOf(BadRequestException);
  });

  it("accepts valid HMAC bank webhook through controller boundary and acknowledges payment", async () => {
    const recordPaidSpy = vi.fn().mockResolvedValue({ ok: true, replayed: false });
    const repoSpy = vi.spyOn(backend, "createDatabaseCommerceRepository").mockReturnValue({
      createOrder: vi.fn(),
      readOrder: vi.fn(),
      readOrderProjection: vi.fn(),
      recordPaid: recordPaidSpy,
    } as never);

    const bankTransfer = {
      id: 92704,
      gateway: "Vietcombank",
      transactionDate: "2026-09-05 10:00:00",
      accountNumber: "123456789",
      subAccount: "",
      code: "LSV-order-1",
      content: "LSV-order-1 chuyen tien",
      transferType: "in",
      description: "NGUYEN VAN A chuyen tien",
      transferAmount: 79000,
      accumulated: 1000000,
      referenceCode: "FT24012345678",
    };
    const rawBody = Buffer.from(JSON.stringify(bankTransfer));
    const nowEpochSeconds = Math.floor(Date.now() / 1000);
    const hmac = createHmac("sha256", "synthetic-webhook-secret");
    hmac.update(String(nowEpochSeconds) + "." + rawBody.toString("utf8"));
    const signature = "sha256=" + hmac.digest("hex");

    try {
      const result = await controller().webhook(
        "ingress-secret",
        undefined,
        signature,
        String(nowEpochSeconds),
        { rawBody },
      );

      expect(result).toEqual({ success: true });
      expect(recordPaidSpy).toHaveBeenCalledWith({
        invoiceNumber: "LSV-order-1",
        providerEventId: "92704",
        amount: 79000,
        currency: "VND",
        traceId: "sepay-webhook",
      });
    } finally {
      repoSpy.mockRestore();
    }
  });
  it("auto-confirms pending order in disabled mode and returns null payment instructions", async () => {
    const authSpy = vi.spyOn(internalGuard, "verifyInternalActorToken").mockResolvedValue({
      kind: "account",
      userId: "user-1",
      sessionId: "session-1",
      requestId: "req-1",
    });
    const orderRecord = {
      id: "order-1",
      invoiceNumber: "LSV-order-1",
      ownerId: "user-1",
      chartId: "chart-1",
      chartVersionId: "chart-v1",
      sku: "ZIWEI-IDENTITY-P0",
      amount: 79000,
      currency: "VND",
      locale: "vi",
      status: "pending",
      paidAt: null,
      createdAt: new Date("2026-09-05T00:00:00.000Z"),
    };
    const paidRecord = {
      ...orderRecord,
      status: "paid",
      paidAt: new Date("2026-09-05T00:01:00.000Z"),
    };
    const recordPaidSpy = vi.fn().mockResolvedValue({ ok: true, replayed: false });
    const repoSpy = vi.spyOn(backend, "createDatabaseCommerceRepository").mockReturnValue({
      createOrder: vi.fn().mockResolvedValue({
        ok: true,
        value: orderRecord,
        reused: false,
      }),
      readOrder: vi.fn(),
      readOrderProjection: vi.fn().mockResolvedValue({
        order: paidRecord,
        reportId: "report-auto-1",
      }),
      recordPaid: recordPaidSpy,
    } as never);

    try {
      const result = await controller({ sepayEnvironment: "disabled" }).create("Bearer valid-token", {
        chartId: "chart-1",
        sku: "ZIWEI-IDENTITY-P0",
        locale: "vi",
      });
      expect(recordPaidSpy).toHaveBeenCalledWith({
        invoiceNumber: "LSV-order-1",
        providerEventId: "disabled-autopay:order-1",
        amount: 79000,
        currency: "VND",
        traceId: "req-1",
      });
      expect(result).toEqual({
        ok: true,
        value: {
          order: {
            id: "order-1",
            status: "paid",
            amount: 79000,
            currency: "VND",
            locale: "vi",
          },
          paymentInstructions: null,
          reportId: "report-auto-1",
        },
      });
    } finally {
      authSpy.mockRestore();
      repoSpy.mockRestore();
    }
  });

  it("does not reconfirm an already-paid reused order in disabled mode", async () => {
    const authSpy = vi.spyOn(internalGuard, "verifyInternalActorToken").mockResolvedValue({
      kind: "account",
      userId: "user-1",
      sessionId: "session-1",
      requestId: "req-1",
    });
    const paidOrderRecord = {
      id: "order-paid-1",
      invoiceNumber: "LSV-order-paid-1",
      ownerId: "user-1",
      chartId: "chart-1",
      chartVersionId: "chart-v1",
      sku: "ZIWEI-IDENTITY-P0",
      amount: 79000,
      currency: "VND",
      locale: "vi",
      status: "paid",
      paidAt: new Date("2026-09-05T00:05:00.000Z"),
      createdAt: new Date("2026-09-05T00:00:00.000Z"),
    };
    const recordPaidSpy = vi.fn();
    const repoSpy = vi.spyOn(backend, "createDatabaseCommerceRepository").mockReturnValue({
      createOrder: vi.fn().mockResolvedValue({
        ok: true,
        value: paidOrderRecord,
        reused: true,
      }),
      readOrder: vi.fn(),
      readOrderProjection: vi.fn().mockResolvedValue({
        order: paidOrderRecord,
        reportId: "report-res-123",
      }),
      recordPaid: recordPaidSpy,
    } as never);

    try {
      const result = await controller({ sepayEnvironment: "disabled" }).create("Bearer valid-token", {
        chartId: "chart-1",
        sku: "ZIWEI-IDENTITY-P0",
        locale: "vi",
      });
      expect(recordPaidSpy).not.toHaveBeenCalled();
      expect(result).toEqual({
        ok: true,
        value: {
          order: {
            id: "order-paid-1",
            status: "paid",
            amount: 79000,
            currency: "VND",
            locale: "vi",
          },
          paymentInstructions: null,
          reportId: "report-res-123",
        },
      });
    } finally {
      authSpy.mockRestore();
      repoSpy.mockRestore();
    }
  });

  it("returns COMMERCE_AUTO_PAYMENT_FAILED when recordPaid fails in disabled mode", async () => {
    const authSpy = vi.spyOn(internalGuard, "verifyInternalActorToken").mockResolvedValue({
      kind: "account",
      userId: "user-1",
      sessionId: "session-1",
      requestId: "req-1",
    });
    const orderRecord = {
      id: "order-1",
      invoiceNumber: "LSV-order-1",
      ownerId: "user-1",
      chartId: "chart-1",
      chartVersionId: "chart-v1",
      sku: "ZIWEI-IDENTITY-P0",
      amount: 79000,
      currency: "VND",
      locale: "vi",
      status: "pending",
      paidAt: null,
      createdAt: new Date("2026-09-05T00:00:00.000Z"),
    };
    const repoSpy = vi.spyOn(backend, "createDatabaseCommerceRepository").mockReturnValue({
      createOrder: vi.fn().mockResolvedValue({
        ok: true,
        value: orderRecord,
        reused: false,
      }),
      readOrder: vi.fn(),
      readOrderProjection: vi.fn(),
      recordPaid: vi.fn().mockResolvedValue({ ok: false, code: "PAYMENT_STATE_CONFLICT" }),
    } as never);

    try {
      const result = await controller({ sepayEnvironment: "disabled" }).create("Bearer valid-token", {
        chartId: "chart-1",
        sku: "ZIWEI-IDENTITY-P0",
        locale: "vi",
      });
      expect(result).toEqual({
        ok: false,
        error: { code: "COMMERCE_AUTO_PAYMENT_FAILED" },
      });
    } finally {
      authSpy.mockRestore();
      repoSpy.mockRestore();
    }
  });

  it("returns COMMERCE_AUTO_PAYMENT_FAILED when projection is null after auto-payment in disabled mode", async () => {
    const authSpy = vi.spyOn(internalGuard, "verifyInternalActorToken").mockResolvedValue({
      kind: "account",
      userId: "user-1",
      sessionId: "session-1",
      requestId: "req-1",
    });
    const orderRecord = {
      id: "order-1",
      invoiceNumber: "LSV-order-1",
      ownerId: "user-1",
      chartId: "chart-1",
      chartVersionId: "chart-v1",
      sku: "ZIWEI-IDENTITY-P0",
      amount: 79000,
      currency: "VND",
      locale: "vi",
      status: "pending",
      paidAt: null,
      createdAt: new Date("2026-09-05T00:00:00.000Z"),
    };
    const repoSpy = vi.spyOn(backend, "createDatabaseCommerceRepository").mockReturnValue({
      createOrder: vi.fn().mockResolvedValue({
        ok: true,
        value: orderRecord,
        reused: false,
      }),
      readOrder: vi.fn(),
      readOrderProjection: vi.fn().mockResolvedValue(null),
      recordPaid: vi.fn().mockResolvedValue({ ok: true, replayed: false }),
    } as never);

    try {
      const result = await controller({ sepayEnvironment: "disabled" }).create("Bearer valid-token", {
        chartId: "chart-1",
        sku: "ZIWEI-IDENTITY-P0",
        locale: "vi",
      });
      expect(result).toEqual({
        ok: false,
        error: { code: "COMMERCE_AUTO_PAYMENT_FAILED" },
      });
    } finally {
      authSpy.mockRestore();
      repoSpy.mockRestore();
    }
  });

  it("returns null paymentInstructions on order read in disabled mode", async () => {
    const authSpy = vi.spyOn(internalGuard, "verifyInternalActorToken").mockResolvedValue({
      kind: "account",
      userId: "user-1",
      sessionId: "session-1",
      requestId: "req-1",
    });
    const orderRecord = {
      id: "order-1",
      invoiceNumber: "LSV-order-1",
      ownerId: "user-1",
      chartId: "chart-1",
      chartVersionId: "chart-v1",
      sku: "ZIWEI-IDENTITY-P0",
      amount: 79000,
      currency: "VND",
      locale: "vi",
      status: "paid",
      paidAt: new Date("2026-09-05T00:05:00.000Z"),
      createdAt: new Date("2026-09-05T00:00:00.000Z"),
    };
    const repoSpy = vi.spyOn(backend, "createDatabaseCommerceRepository").mockReturnValue({
      createOrder: vi.fn(),
      readOrder: vi.fn(),
      readOrderProjection: vi.fn().mockResolvedValue({
        order: orderRecord,
        reportId: "report-123",
      }),
      recordPaid: vi.fn(),
    } as never);

    try {
      const result = await controller({ sepayEnvironment: "disabled" }).read("Bearer valid-token", "order-1");
      expect(result).toEqual({
        ok: true,
        value: {
          order: {
            id: "order-1",
            status: "paid",
            amount: 79000,
            currency: "VND",
            locale: "vi",
          },
          paymentInstructions: null,
          reportId: "report-123",
        },
      });
    } finally {
      authSpy.mockRestore();
      repoSpy.mockRestore();
    }
  });

  it("rejects webhooks with 503 SEPAY_DISABLED when disabled", async () => {
    await expect(
      controller({ sepayEnvironment: "disabled" }).webhook(
        "ingress-secret",
        "provider-secret",
        undefined,
        undefined,
        { rawBody: nonPaid },
      ),
    ).rejects.toMatchObject({
      status: 503,
      response: { code: "SEPAY_DISABLED" },
    });
  });

  it("returns COMMERCE_AUTO_PAYMENT_FAILED when recordPaid rejects in disabled mode", async () => {
    const authSpy = vi.spyOn(internalGuard, "verifyInternalActorToken").mockResolvedValue({
      kind: "account",
      userId: "user-1",
      sessionId: "session-1",
      requestId: "req-1",
    });
    const orderRecord = {
      id: "order-1",
      invoiceNumber: "LSV-order-1",
      ownerId: "user-1",
      chartId: "chart-1",
      chartVersionId: "chart-v1",
      sku: "ZIWEI-IDENTITY-P0",
      amount: 79000,
      currency: "VND",
      locale: "vi",
      status: "pending",
      paidAt: null,
      createdAt: new Date("2026-09-05T00:00:00.000Z"),
    };
    const repoSpy = vi.spyOn(backend, "createDatabaseCommerceRepository").mockReturnValue({
      createOrder: vi.fn().mockResolvedValue({
        ok: true,
        value: orderRecord,
        reused: false,
      }),
      readOrder: vi.fn(),
      readOrderProjection: vi.fn(),
      recordPaid: vi.fn().mockRejectedValue(new Error("database transaction aborted")),
    } as never);

    try {
      const result = await controller({ sepayEnvironment: "disabled" }).create("Bearer valid-token", {
        chartId: "chart-1",
        sku: "ZIWEI-IDENTITY-P0",
        locale: "vi",
      });
      expect(result).toEqual({
        ok: false,
        error: { code: "COMMERCE_AUTO_PAYMENT_FAILED" },
      });
    } finally {
      authSpy.mockRestore();
      repoSpy.mockRestore();
    }
  });

  it("returns COMMERCE_AUTO_PAYMENT_FAILED when readOrderProjection rejects in disabled mode", async () => {
    const authSpy = vi.spyOn(internalGuard, "verifyInternalActorToken").mockResolvedValue({
      kind: "account",
      userId: "user-1",
      sessionId: "session-1",
      requestId: "req-1",
    });
    const orderRecord = {
      id: "order-1",
      invoiceNumber: "LSV-order-1",
      ownerId: "user-1",
      chartId: "chart-1",
      chartVersionId: "chart-v1",
      sku: "ZIWEI-IDENTITY-P0",
      amount: 79000,
      currency: "VND",
      locale: "vi",
      status: "pending",
      paidAt: null,
      createdAt: new Date("2026-09-05T00:00:00.000Z"),
    };
    const repoSpy = vi.spyOn(backend, "createDatabaseCommerceRepository").mockReturnValue({
      createOrder: vi.fn().mockResolvedValue({
        ok: true,
        value: orderRecord,
        reused: false,
      }),
      readOrder: vi.fn(),
      readOrderProjection: vi.fn().mockRejectedValue(new Error("connection pool timeout")),
      recordPaid: vi.fn().mockResolvedValue({ ok: true, replayed: false }),
    } as never);

    try {
      const result = await controller({ sepayEnvironment: "disabled" }).create("Bearer valid-token", {
        chartId: "chart-1",
        sku: "ZIWEI-IDENTITY-P0",
        locale: "vi",
      });
      expect(result).toEqual({
        ok: false,
        error: { code: "COMMERCE_AUTO_PAYMENT_FAILED" },
      });
    } finally {
      authSpy.mockRestore();
      repoSpy.mockRestore();
    }
  });

  it("rejects library and history requests without valid authorization", async () => {
    await expect(controller().library(undefined)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    await expect(controller().history(undefined)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    await expect(controller().library("InvalidToken")).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it("returns owner-scoped library projection on library read", async () => {
    const authSpy = vi.spyOn(internalGuard, "verifyInternalActorToken").mockResolvedValue({
      kind: "account",
      userId: "user-1",
      sessionId: "session-1",
      requestId: "req-1",
    });
    const mockLibrary = {
      version: 1 as const,
      groups: [
        {
          profileId: "profile-1",
          profileDisplayName: "Nguyễn Văn A",
          chartId: "chart-1",
          items: [
            {
              id: "ent-1",
              entitlementId: "ent-1",
              orderId: "order-1",
              chartId: "chart-1",
              profileId: "profile-1",
              profileDisplayName: "Nguyễn Văn A",
              sku: "ZIWEI-IDENTITY-P0" as const,
              productTitle: "Bản mệnh & tiềm năng",
              productName: "Bản mệnh & tiềm năng",
              orderStatus: "paid" as const,
              entitlementStatus: "active" as const,
              reportId: "rep-1",
              readUrl: "/bao-cao/rep-1",
              reportStatus: "ready",
              locale: "vi" as const,
              createdAt: "2026-09-08T00:00:00.000Z",
              purchasedAt: "2026-09-08T00:05:00.000Z",
            },
          ],
          latestReportId: "rep-1",
          latestReadUrl: "/bao-cao/rep-1",
        },
      ],
      items: [
        {
          id: "ent-1",
          entitlementId: "ent-1",
          orderId: "order-1",
          chartId: "chart-1",
          profileId: "profile-1",
          profileDisplayName: "Nguyễn Văn A",
          sku: "ZIWEI-IDENTITY-P0" as const,
          productTitle: "Bản mệnh & tiềm năng",
          productName: "Bản mệnh & tiềm năng",
          orderStatus: "paid" as const,
          entitlementStatus: "active" as const,
          reportId: "rep-1",
          readUrl: "/bao-cao/rep-1",
          reportStatus: "ready",
          locale: "vi" as const,
          createdAt: "2026-09-08T00:00:00.000Z",
          purchasedAt: "2026-09-08T00:05:00.000Z",
        },
      ],
      latestReadableReport: {
        id: "ent-1",
        entitlementId: "ent-1",
        orderId: "order-1",
        chartId: "chart-1",
        profileId: "profile-1",
        profileDisplayName: "Nguyễn Văn A",
        sku: "ZIWEI-IDENTITY-P0" as const,
        productTitle: "Bản mệnh & tiềm năng",
        productName: "Bản mệnh & tiềm năng",
        orderStatus: "paid" as const,
        entitlementStatus: "active" as const,
        reportId: "rep-1",
        readUrl: "/bao-cao/rep-1",
        reportStatus: "ready",
        locale: "vi" as const,
        createdAt: "2026-09-08T00:00:00.000Z",
        purchasedAt: "2026-09-08T00:05:00.000Z",
      },
      totalCount: 1,
    };
    const readAccountLibrarySpy = vi.fn().mockResolvedValue(mockLibrary);
    const repoSpy = vi.spyOn(backend, "createDatabaseCommerceRepository").mockReturnValue({
      createOrder: vi.fn(),
      readOrder: vi.fn(),
      readOrderProjection: vi.fn(),
      recordPaid: vi.fn(),
      readAccountLibrary: readAccountLibrarySpy,
      readOrderHistory: vi.fn(),
    } as never);

    try {
      const result = await controller().library("Bearer valid-token");
      expect(result).toEqual({
        ok: true,
        value: mockLibrary,
      });
      expect(readAccountLibrarySpy).toHaveBeenCalledWith({
        kind: "account",
        userId: "user-1",
        sessionId: "session-1",
        requestId: "req-1",
      });
    } finally {
      authSpy.mockRestore();
      repoSpy.mockRestore();
    }
  });

  it("returns owner-scoped OrderHistoryV1 on history read including expired orders", async () => {
    const authSpy = vi.spyOn(internalGuard, "verifyInternalActorToken").mockResolvedValue({
      kind: "account",
      userId: "user-1",
      sessionId: "session-1",
      requestId: "req-1",
    });
    const mockHistory = {
      version: 1 as const,
      orders: [
        {
          id: "order-1",
          orderId: "order-1",
          invoiceNumber: "LSV-order-1",
          chartId: "chart-1",
          profileId: "profile-1",
          profileDisplayName: "Nguyễn Văn A",
          sku: "ZIWEI-IDENTITY-P0" as const,
          productTitle: "Bản mệnh & tiềm năng",
          productName: "Bản mệnh & tiềm năng",
          amount: 79000,
          currency: "VND",
          status: "expired" as const,
          orderStatus: "expired" as const,
          locale: "vi" as const,
          createdAt: "2026-09-01T00:00:00.000Z",
          paidAt: null,
          reportId: null,
          readUrl: null,
          supportUrl: "/lien-he?orderId=order-1",
        },
      ],
      items: [
        {
          id: "order-1",
          orderId: "order-1",
          invoiceNumber: "LSV-order-1",
          chartId: "chart-1",
          profileId: "profile-1",
          profileDisplayName: "Nguyễn Văn A",
          sku: "ZIWEI-IDENTITY-P0" as const,
          productTitle: "Bản mệnh & tiềm năng",
          productName: "Bản mệnh & tiềm năng",
          amount: 79000,
          currency: "VND",
          status: "expired" as const,
          orderStatus: "expired" as const,
          locale: "vi" as const,
          createdAt: "2026-09-01T00:00:00.000Z",
          paidAt: null,
          reportId: null,
          readUrl: null,
          supportUrl: "/lien-he?orderId=order-1",
        },
      ],
      totalCount: 1,
    };
    const readOrderHistorySpy = vi.fn().mockResolvedValue(mockHistory);
    const repoSpy = vi.spyOn(backend, "createDatabaseCommerceRepository").mockReturnValue({
      createOrder: vi.fn(),
      readOrder: vi.fn(),
      readOrderProjection: vi.fn(),
      recordPaid: vi.fn(),
      readAccountLibrary: vi.fn(),
      readOrderHistory: readOrderHistorySpy,
    } as never);

    try {
      const result = await controller().history("Bearer valid-token");
      expect(result).toEqual({
        ok: true,
        value: mockHistory,
      });
      expect(readOrderHistorySpy).toHaveBeenCalledWith({
        kind: "account",
        userId: "user-1",
        sessionId: "session-1",
        requestId: "req-1",
      });
    } finally {
      authSpy.mockRestore();
      repoSpy.mockRestore();
    }
  });

  it("returns empty library and history for anonymous actors without error", async () => {
    const authSpy = vi.spyOn(internalGuard, "verifyInternalActorToken").mockResolvedValue({
      kind: "anonymous",
      anonymousActorId: "anon-1",
      sessionId: "session-1",
      requestId: "req-1",
      expiresAt: "2026-09-09T00:00:00+00:00",
    });
    const emptyLib = {
      version: 1 as const,
      groups: [],
      items: [],
      latestReadableReport: null,
      totalCount: 0,
    };
    const emptyHist = {
      version: 1 as const,
      orders: [],
      items: [],
      totalCount: 0,
    };
    const repoSpy = vi.spyOn(backend, "createDatabaseCommerceRepository").mockReturnValue({
      createOrder: vi.fn(),
      readOrder: vi.fn(),
      readOrderProjection: vi.fn(),
      recordPaid: vi.fn(),
      readAccountLibrary: vi.fn().mockResolvedValue(emptyLib),
      readOrderHistory: vi.fn().mockResolvedValue(emptyHist),
    } as never);

    try {
      const libResult = await controller().library("Bearer anon-token");
      expect(libResult).toEqual({ ok: true, value: emptyLib });

      const histResult = await controller().history("Bearer anon-token");
      expect(histResult).toEqual({ ok: true, value: emptyHist });
    } finally {
      authSpy.mockRestore();
      repoSpy.mockRestore();
    }
  });
});
