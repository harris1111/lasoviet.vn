import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import type {
  AccountLibraryV1,
  CurrentActor,
  OrderHistoryV1,
} from "@lasoviet/contracts";

import {
  createAccountDataLoader,
  loadAccountLibrary,
  loadOrderHistory,
} from "./account-data-loader";

const mockActor: CurrentActor = {
  kind: "account",
  userId: "user-test-123",
  sessionId: "session-test-456",
  requestId: "req-test-789",
};

const validLibrary: AccountLibraryV1 = {
  version: 1,
  totalCount: 1,
  latestReadableReport: {
    id: "item-1",
    entitlementId: "ent-1",
    orderId: "ord-1",
    chartId: "chart-1",
    profileId: "prof-1",
    profileDisplayName: "Nguyen Van A",
    sku: "ZIWEI-IDENTITY-P0",
    productTitle: "Bản mệnh & tiềm năng",
    productName: "Bản mệnh & tiềm năng",
    orderStatus: "paid",
    entitlementStatus: "active",
    reportId: "rep-1",
    readUrl: "/bao-cao/rep-1",
    reportStatus: "ready",
    locale: "vi",
    createdAt: "2026-09-08T10:00:00.000+07:00",
    purchasedAt: "2026-09-08T10:05:00.000+07:00",
  },
  groups: [
    {
      profileId: "prof-1",
      profileDisplayName: "Nguyen Van A",
      chartId: "chart-1",
      latestReportId: "rep-1",
      latestReadUrl: "/bao-cao/rep-1",
      items: [
        {
          id: "item-1",
          entitlementId: "ent-1",
          orderId: "ord-1",
          chartId: "chart-1",
          profileId: "prof-1",
          profileDisplayName: "Nguyen Van A",
          sku: "ZIWEI-IDENTITY-P0",
          productTitle: "Bản mệnh & tiềm năng",
          productName: "Bản mệnh & tiềm năng",
          orderStatus: "paid",
          entitlementStatus: "active",
          reportId: "rep-1",
          readUrl: "/bao-cao/rep-1",
          reportStatus: "ready",
          locale: "vi",
          createdAt: "2026-09-08T10:00:00.000+07:00",
          purchasedAt: "2026-09-08T10:05:00.000+07:00",
        },
      ],
    },
  ],
  items: [
    {
      id: "item-1",
      entitlementId: "ent-1",
      orderId: "ord-1",
      chartId: "chart-1",
      profileId: "prof-1",
      profileDisplayName: "Nguyen Van A",
      sku: "ZIWEI-IDENTITY-P0",
      productTitle: "Bản mệnh & tiềm năng",
      productName: "Bản mệnh & tiềm năng",
      orderStatus: "paid",
      entitlementStatus: "active",
      reportId: "rep-1",
      readUrl: "/bao-cao/rep-1",
      reportStatus: "ready",
      locale: "vi",
      createdAt: "2026-09-08T10:00:00.000+07:00",
      purchasedAt: "2026-09-08T10:05:00.000+07:00",
    },
  ],
};

const validHistory: OrderHistoryV1 = {
  version: 1,
  totalCount: 1,
  orders: [
    {
      id: "hist-1",
      orderId: "ord-1",
      invoiceNumber: "LSV-INV-001",
      chartId: "chart-1",
      profileId: "prof-1",
      profileDisplayName: "Nguyen Van A",
      sku: "ZIWEI-IDENTITY-P0",
      productTitle: "Bản mệnh & tiềm năng",
      productName: "Bản mệnh & tiềm năng",
      amount: 79000,
      currency: "VND",
      status: "paid",
      orderStatus: "paid",
      locale: "vi",
      createdAt: "2026-09-08T10:00:00.000+07:00",
      paidAt: "2026-09-08T10:05:00.000+07:00",
      reportId: "rep-1",
      readUrl: "/bao-cao/rep-1",
      supportUrl: "/ho-tro?order=LSV-INV-001",
    },
  ],
  items: [
    {
      id: "hist-1",
      orderId: "ord-1",
      invoiceNumber: "LSV-INV-001",
      chartId: "chart-1",
      profileId: "prof-1",
      profileDisplayName: "Nguyen Van A",
      sku: "ZIWEI-IDENTITY-P0",
      productTitle: "Bản mệnh & tiềm năng",
      productName: "Bản mệnh & tiềm năng",
      amount: 79000,
      currency: "VND",
      status: "paid",
      orderStatus: "paid",
      locale: "vi",
      createdAt: "2026-09-08T10:00:00.000+07:00",
      paidAt: "2026-09-08T10:05:00.000+07:00",
      reportId: "rep-1",
      readUrl: "/bao-cao/rep-1",
      supportUrl: "/ho-tro?order=LSV-INV-001",
    },
  ],
};

describe("account-data-loader", () => {
  it("calls only /commerce/library with server-derived actor and validates schema", async () => {
    const request = vi.fn().mockResolvedValue({
      ok: true,
      value: validLibrary,
    });
    const privateApiClient = vi.fn().mockReturnValue({ request });
    const loader = createAccountDataLoader({ privateApiClient });

    const result = await loader.loadLibrary(mockActor);

    expect(privateApiClient).toHaveBeenCalledTimes(1);
    expect(privateApiClient).toHaveBeenCalledWith(mockActor, mockActor.requestId);
    expect(request).toHaveBeenCalledTimes(1);
    expect(request).toHaveBeenCalledWith("/commerce/library");
    expect(result).toEqual({
      ok: true,
      value: validLibrary,
    });
  });

  it("calls only /commerce/orders with server-derived actor and validates schema", async () => {
    const request = vi.fn().mockResolvedValue({
      ok: true,
      value: validHistory,
    });
    const privateApiClient = vi.fn().mockReturnValue({ request });
    const loader = createAccountDataLoader({ privateApiClient });

    const result = await loader.loadOrders(mockActor);

    expect(privateApiClient).toHaveBeenCalledTimes(1);
    expect(privateApiClient).toHaveBeenCalledWith(mockActor, mockActor.requestId);
    expect(request).toHaveBeenCalledTimes(1);
    expect(request).toHaveBeenCalledWith("/commerce/orders");
    expect(result).toEqual({
      ok: true,
      value: validHistory,
    });
  });

  it("returns bounded local error on private API failure without leaking provider text", async () => {
    const request = vi.fn().mockRejectedValue(
      new Error("FATAL: postgres connection timeout password=leaked_secret"),
    );
    const privateApiClient = vi.fn().mockReturnValue({ request });
    const loader = createAccountDataLoader({ privateApiClient });

    const result = await loader.loadLibrary(mockActor);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("COMMERCE_UNAVAILABLE");
      expect(result.error.retryable).toBe(true);
      expect(JSON.stringify(result.error)).not.toContain("postgres");
      expect(JSON.stringify(result.error)).not.toContain("leaked_secret");
    }
  });

  it("returns bounded local error on API error envelope without leaking untrusted text", async () => {
    const request = vi.fn().mockResolvedValue({
      ok: false,
      error: { code: "UNEXPECTED_SERVER_CRASH", details: "internal dump" },
    });
    const privateApiClient = vi.fn().mockReturnValue({ request });
    const loader = createAccountDataLoader({ privateApiClient });

    const result = await loader.loadOrders(mockActor);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("COMMERCE_UNAVAILABLE");
      expect(result.error.retryable).toBe(true);
      expect(JSON.stringify(result.error)).not.toContain("internal dump");
    }
  });

  it("returns bounded COMMERCE_PROJECTION_INVALID error on schema validation failure", async () => {
    const request = vi.fn().mockResolvedValue({
      ok: true,
      value: { invalid: "payload", version: 999 },
    });
    const privateApiClient = vi.fn().mockReturnValue({ request });
    const loader = createAccountDataLoader({ privateApiClient });

    const result = await loader.loadLibrary(mockActor);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("COMMERCE_PROJECTION_INVALID");
      expect(result.error.retryable).toBe(false);
    }
  });

  it("works with helper functions loadAccountLibrary and loadOrderHistory", async () => {
    const requestLib = vi.fn().mockResolvedValue({ ok: true, value: validLibrary });
    const requestHist = vi.fn().mockResolvedValue({ ok: true, value: validHistory });
    const privateApiClient = vi.fn().mockImplementation((_actor, _reqId) => ({
      request: (path: string) => {
        if (path === "/commerce/library") return requestLib();
        if (path === "/commerce/orders") return requestHist();
        throw new Error("unexpected path");
      },
    }));

    const libRes = await loadAccountLibrary(mockActor, { privateApiClient });
    const ordRes = await loadOrderHistory(mockActor, { privateApiClient });

    expect(libRes.ok).toBe(true);
    expect(ordRes.ok).toBe(true);
  });
});
