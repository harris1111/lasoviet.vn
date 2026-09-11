import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

import type { CheckoutStatus } from "./checkout-status";
import {
  copyCheckoutField,
  formatCheckoutRemainingTime,
  startVietQrCheckoutPolling,
  VietQrCheckout,
} from "./vietqr-checkout";

function checkoutStatus(
  status: CheckoutStatus["order"]["status"] = "pending",
  reportId: string | null = null,
  locale: "vi" | "en" = "vi",
): CheckoutStatus {
  return {
    order: {
      id: "order-1",
      status,
      amount: 79_000,
      currency: "VND",
      locale,
      productTitle: locale === "en" ? "Comprehensive Zi Wei reading" : "Luận giải Tử Vi toàn diện",
      paymentCode: "LSVK7M2P9QXJ",
      chartId: "chart-1",
      createdAt: "2026-09-05T00:00:00.000Z",
      creditApplied: 0,
      creditExpiresAt: null,
      supportUrl: locale === "en" ? "/en/lien-he?order=LSV-order-1" : "/lien-he?order=LSV-order-1",
    },
    paymentInstructions: {
      bankCode: "VCB",
      accountNumber: "0123456789",
      accountHolder: "LA SO VIET",
      amount: 79_000,
      currency: "VND",
      transferDescription: "LSV-order-1",
      qrUrl: "https://vietqr.app/qr/order-1.png",
      expiresAt: "2026-09-05T12:15:00.000Z",
    },
    reportId,
  };
}

function visibilityHarness(initiallyVisible = true) {
  let visible = initiallyVisible;
  const listeners = new Set<() => void>();

  return {
    isVisible: () => visible,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    setVisible(nextVisible: boolean) {
      visible = nextVisible;
      for (const listener of listeners) listener();
    },
    listenerCount: () => listeners.size,
  };
}

describe("VietQR checkout polling", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("polls pending checkout status every exactly 2500 milliseconds", async () => {
    const fetchStatus = vi.fn().mockResolvedValue(checkoutStatus());
    const deliverStatus = vi.fn();

    const cleanup = startVietQrCheckoutPolling({
      initialStatus: checkoutStatus(),
      fetchStatus,
      deliverStatus,
      navigate: vi.fn(),
      visibility: visibilityHarness(),
    });

    await vi.advanceTimersByTimeAsync(2_499);
    expect(fetchStatus).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1);
    expect(fetchStatus).toHaveBeenCalledTimes(1);
    expect(deliverStatus).toHaveBeenCalledWith(checkoutStatus());

    await vi.advanceTimersByTimeAsync(2_500);
    expect(fetchStatus).toHaveBeenCalledTimes(2);
    cleanup();
  });

  it("pauses while hidden, refreshes immediately when visible, then resumes polling", async () => {
    const visibility = visibilityHarness(false);
    const fetchStatus = vi.fn().mockResolvedValue(checkoutStatus());

    const cleanup = startVietQrCheckoutPolling({
      initialStatus: checkoutStatus(),
      fetchStatus,
      deliverStatus: vi.fn(),
      navigate: vi.fn(),
      visibility,
    });

    await vi.advanceTimersByTimeAsync(5_000);
    expect(fetchStatus).not.toHaveBeenCalled();

    visibility.setVisible(true);
    await vi.waitFor(() => expect(fetchStatus).toHaveBeenCalledTimes(1));

    await vi.advanceTimersByTimeAsync(2_499);
    expect(fetchStatus).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(fetchStatus).toHaveBeenCalledTimes(2);

    visibility.setVisible(false);
    await vi.advanceTimersByTimeAsync(5_000);
    expect(fetchStatus).toHaveBeenCalledTimes(2);
    cleanup();
  });

  it("rejects malformed payloads, preserves current state, and retries later", async () => {
    const fetchStatus = vi
      .fn()
      .mockResolvedValueOnce({
        ...checkoutStatus(),
        secretKey: "must-not-enter-state",
      })
      .mockRejectedValueOnce(new Error("network detail"))
      .mockResolvedValueOnce(checkoutStatus("paid", null));
    const deliverStatus = vi.fn();

    const cleanup = startVietQrCheckoutPolling({
      initialStatus: checkoutStatus(),
      fetchStatus,
      deliverStatus,
      navigate: vi.fn(),
      visibility: visibilityHarness(),
    });

    await vi.advanceTimersByTimeAsync(2_500);
    await vi.advanceTimersByTimeAsync(2_500);
    expect(deliverStatus).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(2_500);
    expect(deliverStatus).toHaveBeenCalledOnce();
    expect(deliverStatus).toHaveBeenCalledWith(checkoutStatus("paid", null));
    cleanup();
  });

  it("keeps bounded polling active for paid status without a report id", async () => {
    const fetchStatus = vi.fn().mockResolvedValue(checkoutStatus("paid", null));

    const cleanup = startVietQrCheckoutPolling({
      initialStatus: checkoutStatus("paid", null),
      fetchStatus,
      deliverStatus: vi.fn(),
      navigate: vi.fn(),
      visibility: visibilityHarness(),
    });

    await vi.advanceTimersByTimeAsync(5_000);
    expect(fetchStatus).toHaveBeenCalledTimes(2);
    cleanup();
  });

  it.each([
    ["vi", "/bao-cao/report%2Fone"],
    ["en", "/en/bao-cao/report%2Fone"],
  ] as const)(
    "navigates once for paid %s status with a report id",
    async (locale, expectedPath) => {
      const fetchStatus = vi
        .fn()
        .mockResolvedValue(checkoutStatus("paid", "report/one", locale));
      const navigate = vi.fn();

      const cleanup = startVietQrCheckoutPolling({
        initialStatus: checkoutStatus("pending", null, locale),
        fetchStatus,
        deliverStatus: vi.fn(),
        navigate,
        visibility: visibilityHarness(),
      });

      await vi.advanceTimersByTimeAsync(2_500);
      expect(navigate).toHaveBeenCalledOnce();
      expect(navigate).toHaveBeenCalledWith(expectedPath);

      await vi.advanceTimersByTimeAsync(10_000);
      expect(fetchStatus).toHaveBeenCalledOnce();
      expect(navigate).toHaveBeenCalledOnce();
      cleanup();
    },
  );

  it.each(["expired", "failed", "refunded"] as const)(
    "does not poll terminal %s status",
    async (status) => {
      const fetchStatus = vi.fn();

      const cleanup = startVietQrCheckoutPolling({
        initialStatus: checkoutStatus(status),
        fetchStatus,
        deliverStatus: vi.fn(),
        navigate: vi.fn(),
        visibility: visibilityHarness(),
      });

      await vi.advanceTimersByTimeAsync(10_000);
      expect(fetchStatus).not.toHaveBeenCalled();
      cleanup();
    },
  );

  it("navigates and delivers status when polling transitions from pending to paid with null paymentInstructions", async () => {
    const initial = checkoutStatus("pending", null, "vi");
    const paidNull: CheckoutStatus = {
      ...initial,
      order: { ...initial.order, status: "paid" },
      paymentInstructions: null,
      reportId: "report-123",
    };
    const fetchStatus = vi.fn().mockResolvedValue(paidNull);
    const deliverStatus = vi.fn();
    const navigate = vi.fn();

    const cleanup = startVietQrCheckoutPolling({
      initialStatus: initial,
      fetchStatus,
      deliverStatus,
      navigate,
      visibility: visibilityHarness(),
    });

    await vi.advanceTimersByTimeAsync(2_500);
    expect(deliverStatus).toHaveBeenCalledWith(paidNull);
    expect(navigate).toHaveBeenCalledWith("/bao-cao/report-123");
    cleanup();
  });

  it("cleanup removes timers and the visibility listener", async () => {
    const visibility = visibilityHarness();
    const fetchStatus = vi.fn().mockResolvedValue(checkoutStatus());

    const cleanup = startVietQrCheckoutPolling({
      initialStatus: checkoutStatus(),
      fetchStatus,
      deliverStatus: vi.fn(),
      navigate: vi.fn(),
      visibility,
    });

    expect(visibility.listenerCount()).toBe(1);
    cleanup();
    expect(visibility.listenerCount()).toBe(0);

    visibility.setVisible(false);
    visibility.setVisible(true);
    await vi.advanceTimersByTimeAsync(10_000);
    expect(fetchStatus).not.toHaveBeenCalled();
  });

  it("invokes default timers with the global receiver to prevent illegal invocation", () => {
    const originalSetInterval = globalThis.setInterval;
    const originalClearInterval = globalThis.clearInterval;
    let setIntervalReceiver: unknown;
    let clearIntervalReceiver: unknown;

    globalThis.setInterval = function (
      this: unknown,
      callback: () => void,
      delayMs?: number,
    ) {
      setIntervalReceiver = this;
      if (this !== globalThis) throw new TypeError("Illegal invocation");
      return originalSetInterval.call(globalThis, callback, delayMs);
    } as typeof globalThis.setInterval;

    globalThis.clearInterval = function (
      this: unknown,
      handle?: ReturnType<typeof setInterval>,
    ) {
      clearIntervalReceiver = this;
      if (this !== globalThis) throw new TypeError("Illegal invocation");
      return originalClearInterval.call(globalThis, handle);
    } as typeof globalThis.clearInterval;

    try {
      const cleanup = startVietQrCheckoutPolling({
        initialStatus: checkoutStatus(),
        fetchStatus: vi.fn().mockResolvedValue(checkoutStatus()),
        deliverStatus: vi.fn(),
        navigate: vi.fn(),
        visibility: visibilityHarness(),
      });
      expect(setIntervalReceiver).toBe(globalThis);
      cleanup();
      expect(clearIntervalReceiver).toBe(globalThis);
    } finally {
      globalThis.setInterval = originalSetInterval;
      globalThis.clearInterval = originalClearInterval;
    }
  });
});

describe("VietQR checkout remaining time", () => {
  it("clamps at zero and formats the remaining duration as MM:SS", () => {
    expect(
      formatCheckoutRemainingTime(
        "2026-09-05T12:15:00.000Z",
        Date.parse("2026-09-05T12:12:54.000Z"),
      ),
    ).toBe("02:06");
    expect(
      formatCheckoutRemainingTime(
        "2026-09-05T12:15:00.000Z",
        Date.parse("2026-09-05T12:15:01.000Z"),
      ),
    ).toBe("00:00");
  });
});

describe("VietQR checkout copy controls", () => {
  const labels = {
    instructionsTitle: "Bank transfer details",
    bankCode: "Bank",
    accountNumber: "Account number",
    accountHolder: "Account holder",
    amount: "Amount",
    transferDescription: "Transfer description",
    remainingTime: "Remaining time",
    qrAlt: "VietQR payment code",
    copyAccountNumber: "Copy account number",
    copyAmount: "Copy amount",
    copyTransferDescription: "Copy transfer description",
    copied: "Copied",
    status: {
      pending: "Awaiting payment",
      paid: "Paid",
      expired: "Order expired",
      failed: "Payment failed",
      refunded: "Refunded",
    },
  };

  it("renders all payment data and three accessible copy controls", () => {
    const html = renderToStaticMarkup(
      <VietQrCheckout
        initialStatus={checkoutStatus("pending", null, "en")}
        labels={labels}
      />,
    );

    expect(html).toContain("https://vietqr.app/qr/order-1.png");
    expect(html).toContain("VCB");
    expect(html).toContain("0123456789");
    expect(html).toContain("LA SO VIET");
    expect(html).toContain("79,000");
    expect(html).toContain("LSV-order-1");
    expect(html).toContain("Awaiting payment");
    expect(html.match(/<button/g)).toHaveLength(3);
    expect(html).toContain('aria-label="Copy account number"');
    expect(html).toContain('aria-label="Copy amount"');
    expect(html).toContain('aria-label="Copy transfer description"');
  });

  it("copies exact raw values through the injected clipboard", async () => {
    const clipboard = { writeText: vi.fn().mockResolvedValue(undefined) };
    const onCopied = vi.fn();
    const status = checkoutStatus();

    await copyCheckoutField("accountNumber", status, clipboard, onCopied);
    await copyCheckoutField("amount", status, clipboard, onCopied);
    await copyCheckoutField(
      "transferDescription",
      status,
      clipboard,
      onCopied,
    );

    expect(clipboard.writeText.mock.calls).toEqual([
      ["0123456789"],
      ["79000"],
      ["LSV-order-1"],
    ]);
    expect(onCopied.mock.calls).toEqual([
      ["accountNumber"],
      ["amount"],
      ["transferDescription"],
    ]);
  });

  it("keeps checkout state unchanged after copy success or failure", async () => {
    const status = checkoutStatus();
    const original = structuredClone(status);
    const onCopied = vi.fn();

    await expect(
      copyCheckoutField(
        "accountNumber",
        status,
        { writeText: vi.fn().mockResolvedValue(undefined) },
        onCopied,
      ),
    ).resolves.toBe(true);
    await expect(
      copyCheckoutField(
        "amount",
        status,
        { writeText: vi.fn().mockRejectedValue(new Error("clipboard detail")) },
        onCopied,
      ),
    ).resolves.toBe(false);

    expect(status).toEqual(original);
    expect(onCopied).toHaveBeenCalledOnce();
  });
  it("returns false from copyCheckoutField when paymentInstructions is null", async () => {
    const statusWithNull: CheckoutStatus = {
      order: {
        ...checkoutStatus("paid").order,
      },
      paymentInstructions: null,
      reportId: "report-1",
    };
    const clipboard = { writeText: vi.fn() };
    const onCopied = vi.fn();
    const result = await copyCheckoutField("accountNumber", statusWithNull, clipboard, onCopied);
    expect(result).toBe(false);
    expect(clipboard.writeText).not.toHaveBeenCalled();
    expect(onCopied).not.toHaveBeenCalled();
  });

  it("renders null safely when paymentInstructions is null", () => {
    const statusWithNull: CheckoutStatus = {
      order: {
        ...checkoutStatus("paid").order,
      },
      paymentInstructions: null,
      reportId: "report-1",
    };
    const html = renderToStaticMarkup(
      <VietQrCheckout initialStatus={statusWithNull} labels={labels} />,
    );
    expect(html).toBe("");
  });

});

describe("VietQR checkout recovery views", () => {
  const fullLabels = {
    instructionsTitle: "Bank transfer details",
    bankCode: "Bank",
    accountNumber: "Account number",
    accountHolder: "Account holder",
    amount: "Amount",
    transferDescription: "Transfer description",
    remainingTime: "Remaining time",
    qrAlt: "VietQR payment code",
    copyAccountNumber: "Copy account number",
    copyAmount: "Copy amount",
    copyTransferDescription: "Copy transfer description",
    copied: "Copied",
    status: {
      pending: "Awaiting payment",
      paid: "Paid",
      expired: "Order expired",
      failed: "Payment failed",
      refunded: "Refunded",
    },
    noSecondTransferWarning: "If you have already transferred, do not transfer again.",
    paidProcessingTitle: "Payment received successfully",
    paidProcessingDescription: "Your payment has been recorded and report is being prepared.",
    expiredTitle: "Order expired",
    expiredDescription: "This order has expired. Old order remains recorded in history.",
    newChartAction: "Create a new chart and request",
    orderHistoryAction: "View order history",
    failedTitle: "Payment was not completed",
    failedDescription: "Payment failed. Do not attempt another transfer for this order.",
    supportAction: "Contact support",
    refundedTitle: "Order refunded",
    refundedDescription: "This order has been refunded. Review details in order history.",
  };

  it("renders pending checkout with QR code, no-second-transfer warning, and self-claim form", () => {
    const selfClaimMarker = <div data-testid="self-claim-mock">Self-claim form</div>;
    const html = renderToStaticMarkup(
      <VietQrCheckout
        initialStatus={checkoutStatus("pending", null, "vi")}
        labels={fullLabels}
        selfClaim={selfClaimMarker}
      />,
    );

    expect(html).toContain("https://vietqr.app/qr/order-1.png");
    expect(html).toContain("If you have already transferred, do not transfer again.");
    expect(html).toContain('data-testid="self-claim-mock"');
    expect(html.indexOf("vietqr-instructions")).toBeLessThan(html.indexOf("self-claim-mock"));
  });

  it("renders paid checkout without report ID as dedicated payment-received screen without QR or self-claim", () => {
    const selfClaimMarker = <div data-testid="self-claim-mock">Self-claim form</div>;
    const statusPaidNoReport: CheckoutStatus = {
      order: {
        id: "order-1",
        status: "paid",
        amount: 79_000,
        currency: "VND",
        locale: "vi",
        productTitle: "Luận giải Tử Vi toàn diện",
        paymentCode: "LSVK7M2P9QXJ",
        chartId: "chart-1",
        createdAt: "2026-09-05T00:00:00.000Z",
        creditApplied: 0,
        creditExpiresAt: null,
        supportUrl: "/lien-he?order=LSV-order-1",
      },
      paymentInstructions: null,
      reportId: null,
    };
    const html = renderToStaticMarkup(
      <VietQrCheckout
        initialStatus={statusPaidNoReport}
        labels={fullLabels}
        selfClaim={selfClaimMarker}
      />,
    );

    expect(html).toContain('data-checkout-status="paid"');
    expect(html).toContain("Payment received successfully");
    expect(html).toContain("Your payment has been recorded and report is being prepared.");
    expect(html).toContain("/tai-khoan/don-hang");
    expect(html).toContain("report-progress-spinner");

    // No QR code, no self-claim form
    expect(html).not.toContain("https://vietqr.app");
    expect(html).not.toContain("self-claim-mock");
  });

  it("renders expired checkout without QR, with self-claim, explains traceable order, and links to new chart and order history", () => {
    const selfClaimMarker = <div data-testid="self-claim-mock">Self-claim form</div>;
    const statusExpired: CheckoutStatus = {
      order: {
        id: "order-1",
        status: "expired",
        amount: 79_000,
        currency: "VND",
        locale: "vi",
        productTitle: "Luận giải Tử Vi toàn diện",
        paymentCode: "LSVK7M2P9QXJ",
        chartId: "chart-1",
        createdAt: "2026-09-05T00:00:00.000Z",
        creditApplied: 0,
        creditExpiresAt: null,
        supportUrl: "/lien-he?order=LSV-order-1",
      },
      paymentInstructions: null,
      reportId: null,
    };
    const html = renderToStaticMarkup(
      <VietQrCheckout
        initialStatus={statusExpired}
        labels={fullLabels}
        selfClaim={selfClaimMarker}
      />,
    );

    expect(html).toContain('data-checkout-status="expired"');
    expect(html).toContain("Order expired");
    expect(html).toContain("This order has expired. Old order remains recorded in history.");
    expect(html).toContain("/tao-la-so/tu-vi");
    expect(html).toContain("/tai-khoan/don-hang");

    // No QR, but self-claim is exposed for expired recovery
    expect(html).not.toContain("https://vietqr.app");
    expect(html).toContain("self-claim-mock");
  });

  it("renders English expired checkout paths when locale is en", () => {
    const statusExpiredEn: CheckoutStatus = {
      order: {
        id: "order-1",
        status: "expired",
        amount: 79_000,
        currency: "VND",
        locale: "en",
        productTitle: "Comprehensive Zi Wei reading",
        paymentCode: "LSVK7M2P9QXJ",
        chartId: "chart-1",
        createdAt: "2026-09-05T00:00:00.000Z",
        creditApplied: 0,
        creditExpiresAt: null,
        supportUrl: "/en/lien-he?order=LSV-order-1",
      },
      paymentInstructions: null,
      reportId: null,
    };
    const html = renderToStaticMarkup(
      <VietQrCheckout initialStatus={statusExpiredEn} labels={fullLabels} />,
    );
    expect(html).toContain("/en/tao-la-so/tu-vi");
    expect(html).toContain("/en/tai-khoan/don-hang");
  });

  it("renders failed checkout without QR/self-claim or transfer-again guidance, and exposes order-history and support email", () => {
    const selfClaimMarker = <div data-testid="self-claim-mock">Self-claim form</div>;
    const statusFailed: CheckoutStatus = {
      order: {
        id: "order-1",
        status: "failed",
        amount: 79_000,
        currency: "VND",
        locale: "vi",
        productTitle: "Luận giải Tử Vi toàn diện",
        paymentCode: "LSVK7M2P9QXJ",
        chartId: "chart-1",
        createdAt: "2026-09-05T00:00:00.000Z",
        creditApplied: 0,
        creditExpiresAt: null,
        supportUrl: "/lien-he?order=LSV-order-1",
      },
      paymentInstructions: null,
      reportId: null,
    };
    const html = renderToStaticMarkup(
      <VietQrCheckout
        initialStatus={statusFailed}
        labels={fullLabels}
        selfClaim={selfClaimMarker}
      />,
    );

    expect(html).toContain('data-checkout-status="failed"');
    expect(html).toContain("Payment was not completed");
    expect(html).toContain("Payment failed. Do not attempt another transfer for this order.");
    expect(html).toContain("/tai-khoan/don-hang");
    expect(html).toContain("/lien-he?order=LSV-order-1");

    // No QR or self-claim
    expect(html).not.toContain("https://vietqr.app");
    expect(html).not.toContain("self-claim-mock");
  });

  it("renders refunded checkout without QR/self-claim or purchase-as-new action, exposing only order history", () => {
    const selfClaimMarker = <div data-testid="self-claim-mock">Self-claim form</div>;
    const statusRefunded: CheckoutStatus = {
      order: {
        id: "order-1",
        status: "refunded",
        amount: 79_000,
        currency: "VND",
        locale: "vi",
        productTitle: "Luận giải Tử Vi toàn diện",
        paymentCode: "LSVK7M2P9QXJ",
        chartId: "chart-1",
        createdAt: "2026-09-05T00:00:00.000Z",
        creditApplied: 0,
        creditExpiresAt: null,
        supportUrl: "/lien-he?order=LSV-order-1",
      },
      paymentInstructions: null,
      reportId: null,
    };
    const html = renderToStaticMarkup(
      <VietQrCheckout
        initialStatus={statusRefunded}
        labels={fullLabels}
        selfClaim={selfClaimMarker}
      />,
    );

    expect(html).toContain('data-checkout-status="refunded"');
    expect(html).toContain("Order refunded");
    expect(html).toContain("This order has been refunded. Review details in order history.");
    expect(html).toContain("/tai-khoan/don-hang");

    // Must NOT contain purchase-as-new button
    expect(html).not.toContain("/tao-la-so");
    expect(html).not.toContain("Create a new chart");
    expect(html).not.toContain("Lập lá số");
    expect(html).not.toContain("https://vietqr.app");
    expect(html).not.toContain("self-claim-mock");
  });

  it("renders recovery screens correctly whether paymentInstructions is null or stale non-null", () => {
    const staleInstructions = {
      bankCode: "VCB",
      accountNumber: "0123456789",
      accountHolder: "LA SO VIET",
      amount: 79_000,
      currency: "VND" as const,
      transferDescription: "LSV-order-1",
      qrUrl: "https://vietqr.app/qr/order-1.png",
      expiresAt: "2026-09-05T12:15:00.000Z",
    };

    const expiredWithStale: CheckoutStatus = {
      order: {
        id: "order-1",
        status: "expired",
        amount: 79_000,
        currency: "VND",
        locale: "vi",
        productTitle: "Luận giải Tử Vi toàn diện",
        paymentCode: "LSVK7M2P9QXJ",
        chartId: "chart-1",
        createdAt: "2026-09-05T00:00:00.000Z",
        creditApplied: 0,
        creditExpiresAt: null,
        supportUrl: "/lien-he?order=LSV-order-1",
      },
      paymentInstructions: staleInstructions,
      reportId: null,
    };
    const html = renderToStaticMarkup(
      <VietQrCheckout initialStatus={expiredWithStale} labels={fullLabels} />,
    );
    expect(html).toContain("Order expired");
    expect(html).not.toContain("https://vietqr.app");
  });

  it("never renders client-side report unlock, raw SKU, raw fulfillment status, or internal provider detail", () => {
    for (const status of ["pending", "paid", "expired", "failed", "refunded"] as const) {
      const state: CheckoutStatus = {
        order: {
          id: "order-1",
          status,
          amount: 79_000,
          currency: "VND",
          locale: "vi",
          productTitle: "Luận giải Tử Vi toàn diện",
          paymentCode: "LSVK7M2P9QXJ",
          chartId: "chart-1",
          createdAt: "2026-09-05T00:00:00.000Z",
          creditApplied: 0,
          creditExpiresAt: null,
          supportUrl: "/lien-he?order=LSV-order-1",
        },
        paymentInstructions: status === "pending" ? {
          bankCode: "VCB",
          accountNumber: "0123456789",
          accountHolder: "LA SO VIET",
          amount: 79_000,
          currency: "VND",
          transferDescription: "LSV-order-1",
          qrUrl: "https://vietqr.app/qr/order-1.png",
          expiresAt: "2026-09-05T12:15:00.000Z",
        } : null,
        reportId: null,
      };
      const html = renderToStaticMarkup(<VietQrCheckout initialStatus={state} labels={fullLabels} />);
      expect(html).not.toContain("ZIWEI-IDENTITY-P0");
      expect(html).not.toContain("unlock");
      expect(html).not.toContain("mở khoá");
      expect(html).not.toContain("sepay");
      expect(html).not.toContain("terminal_failure");
    }
  });
});

describe("VietQR checkout dynamic order summary, upgrade credit, and actual expiry", () => {
  const fullLabels = {
    instructionsTitle: "Thông tin chuyển khoản",
    bankCode: "Ngân hàng",
    accountNumber: "Số tài khoản",
    accountHolder: "Chủ tài khoản",
    amount: "Số tiền",
    transferDescription: "Nội dung chuyển khoản",
    remainingTime: "Thời gian còn lại",
    qrAlt: "Mã VietQR thanh toán",
    copyAccountNumber: "Sao chép số tài khoản",
    copyAmount: "Sao chép số tiền",
    copyTransferDescription: "Sao chép nội dung chuyển khoản",
    copied: "Đã sao chép",
    status: {
      pending: "Đang chờ thanh toán",
      paid: "Đã thanh toán",
      expired: "Đơn đã hết hạn",
      failed: "Thanh toán chưa thành công",
      refunded: "Đã hoàn tiền",
    },
    summaryPurchasing: "Bạn đang mua",
    summaryAutoFulfill: "Báo cáo mở tự động khi chúng tôi xác nhận thanh toán",
    summaryOrderCode: "Mã đơn",
    upgradeCreditApplied: "Khấu trừ đã áp dụng",
    upgradeCreditDeadline: "Hạn mức ưu đãi",
    expiresAtLabel: "Còn hiệu lực đến",
    pollingErrorTitle: "Tạm thời gián đoạn kiểm tra tự động",
    pollingErrorDescription: "Chúng tôi tạm thời không kiểm tra được trạng thái tự động.",
    retryPollingAction: "Kiểm tra lại",
    returnToTopicSelectorAction: "Quay lại chọn luận giải",
  };

  it("renders dynamic order summary with product title, formatted amount, and payment code", () => {
    const status: CheckoutStatus = {
      order: {
        id: "order-summary-1",
        status: "pending",
        amount: 79000,
        currency: "VND",
        locale: "vi",
        productTitle: "Luận giải Tử Vi toàn diện",
        paymentCode: "LSVK7M2P9QXJ",
        chartId: "chart-1",
        createdAt: "2026-09-05T00:00:00.000Z",
        creditApplied: 0,
        creditExpiresAt: null,
        supportUrl: "/lien-he?order=LSV-order-1",
      },
      paymentInstructions: {
        bankCode: "VCB",
        accountNumber: "0123456789",
        accountHolder: "LA SO VIET",
        amount: 79000,
        currency: "VND",
        transferDescription: "LSVK7M2P9QXJ",
        qrUrl: "https://vietqr.app/qr/order-1.png",
        expiresAt: "2026-09-05T12:15:00.000Z",
      },
      reportId: null,
    };

    const html = renderToStaticMarkup(
      <VietQrCheckout initialStatus={status} labels={fullLabels} />,
    );

    expect(html).toContain("Bạn đang mua");
    expect(html).toContain("Luận giải Tử Vi toàn diện");
    expect(html).toContain("79.000 ₫");
    expect(html).toContain("LSVK7M2P9QXJ");
    expect(html).toContain("Báo cáo mở tự động khi chúng tôi xác nhận thanh toán");
    expect(html).not.toContain("Khấu trừ đã áp dụng");
  });

  it("renders upgrade credit amount and actual deadline only when upgrade fields exist", () => {
    const upgradeDeadline = "2026-09-17T10:00:00.000Z";
    const status: CheckoutStatus = {
      order: {
        id: "order-upgrade-1",
        status: "pending",
        amount: 60000,
        currency: "VND",
        locale: "vi",
        productTitle: "Luận giải Tử Vi toàn diện",
        paymentCode: "LSVUPGRADE12",
        chartId: "chart-1",
        createdAt: "2026-09-10T10:00:00.000Z",
        creditApplied: 19000,
        creditExpiresAt: upgradeDeadline,
        supportUrl: "/lien-he?order=LSV-order-1",
      },
      paymentInstructions: {
        bankCode: "VCB",
        accountNumber: "0123456789",
        accountHolder: "LA SO VIET",
        amount: 60000,
        currency: "VND",
        transferDescription: "LSVUPGRADE12",
        qrUrl: "https://vietqr.app/qr/order-1.png",
        expiresAt: "2026-09-05T12:15:00.000Z",
      },
      reportId: null,
    };

    const html = renderToStaticMarkup(
      <VietQrCheckout initialStatus={status} labels={fullLabels} />,
    );

    expect(html).toContain("Giá gốc");
    expect(html).toContain("79.000 ₫");
    expect(html).toContain("Khấu trừ đã áp dụng");
    expect(html).toContain("-19.000 ₫");
    expect(html).toContain("Số tiền thanh toán");
    expect(html).toContain("60.000 ₫");
    expect(html).toContain("Hạn mức ưu đãi");
    expect(html).toContain("17:00, 17/09/2026");
  });

  it("renders actual expiry date/time rather than hardcoding 24 hours", () => {
    const expiresAt = "2026-09-05T12:15:00.000Z";
    const status: CheckoutStatus = {
      order: {
        id: "order-1",
        status: "pending",
        amount: 79000,
        currency: "VND",
        locale: "vi",
        productTitle: "Luận giải Tử Vi toàn diện",
        paymentCode: "LSVK7M2P9QXJ",
        chartId: "chart-1",
        createdAt: "2026-09-05T00:00:00.000Z",
        creditApplied: 0,
        creditExpiresAt: null,
        supportUrl: "/lien-he?order=LSV-order-1",
      },
      paymentInstructions: {
        bankCode: "VCB",
        accountNumber: "0123456789",
        accountHolder: "LA SO VIET",
        amount: 79000,
        currency: "VND",
        transferDescription: "LSVK7M2P9QXJ",
        qrUrl: "https://vietqr.app/qr/order-1.png",
        expiresAt,
      },
      reportId: null,
    };

    const html = renderToStaticMarkup(
      <VietQrCheckout initialStatus={status} labels={fullLabels} />,
    );

    expect(html).toContain("Còn hiệu lực đến");
    expect(html).toContain("19:15, 05/09/2026");
    expect(html).not.toContain("24 giờ kể từ lúc tạo đơn");
  });

  it("renders link back to topic selector using chartId for expired orders", () => {
    const status: CheckoutStatus = {
      order: {
        id: "order-expired-1",
        status: "expired",
        amount: 79000,
        currency: "VND",
        locale: "vi",
        productTitle: "Luận giải Tử Vi toàn diện",
        chartId: "chart-natal-xyz",
        paymentCode: "LSVEXPIRED01",
        createdAt: "2026-09-05T00:00:00.000Z",
        creditApplied: 0,
        creditExpiresAt: null,
        supportUrl: "/lien-he?order=LSV-order-1",
      },
      paymentInstructions: null,
      reportId: null,
    };

    const html = renderToStaticMarkup(
      <VietQrCheckout initialStatus={status} labels={fullLabels} />,
    );

    expect(html).toContain("/la-so/chart-natal-xyz/chon-luan-giai");
    expect(html).toContain("Quay lại chọn luận giải");
  });
});

describe("VietQR checkout polling error notice and recovery", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("calls onError on transient fetch failure and onSuccess on resolution", async () => {
    const onError = vi.fn();
    const onSuccess = vi.fn();
    const fetchStatus = vi
      .fn()
      .mockRejectedValueOnce(new Error("Network timeout"))
      .mockResolvedValueOnce(checkoutStatus("paid", null));
    const deliverStatus = vi.fn();

    const cleanup = startVietQrCheckoutPolling({
      initialStatus: checkoutStatus(),
      fetchStatus,
      deliverStatus,
      navigate: vi.fn(),
      visibility: visibilityHarness(),
      onError,
      onSuccess,
    });

    await vi.advanceTimersByTimeAsync(2500);
    expect(onError).toHaveBeenCalledOnce();
    expect(onSuccess).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(2500);
    expect(onSuccess).toHaveBeenCalledOnce();
    cleanup();
  });
});
