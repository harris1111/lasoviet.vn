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
});
