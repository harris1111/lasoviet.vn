"use client";

import { useEffect, useRef, useState } from "react";

import { Icon } from "../../components/icon.js";
import {
  parseCheckoutStatus,
  type CheckoutStatus,
} from "./checkout-status.js";

const POLL_INTERVAL_MS = 2_500;

type TimerHandle = ReturnType<typeof setInterval>;

type TimerDependencies = {
  setInterval(callback: () => void, delayMs: number): TimerHandle;
  clearInterval(handle: TimerHandle): void;
};

type VisibilityDependencies = {
  isVisible(): boolean;
  subscribe(listener: () => void): () => void;
};

export type VietQrCheckoutPollingOptions = {
  initialStatus: CheckoutStatus;
  fetchStatus(): Promise<unknown>;
  deliverStatus(status: CheckoutStatus): void;
  navigate(path: string): void;
  visibility: VisibilityDependencies;
  timers?: TimerDependencies;
};

function needsPolling(status: CheckoutStatus): boolean {
  return (
    status.order.status === "pending"
    || (status.order.status === "paid" && status.reportId === null)
  );
}

function reportPath(status: CheckoutStatus): string | null {
  if (status.order.status !== "paid" || status.reportId === null) return null;
  const prefix = status.order.locale === "en" ? "/en" : "";
  return `${prefix}/bao-cao/${encodeURIComponent(status.reportId)}`;
}

export function startVietQrCheckoutPolling(
  options: VietQrCheckoutPollingOptions,
): () => void {
  const timers = options.timers ?? {
    setInterval: globalThis.setInterval,
    clearInterval: globalThis.clearInterval,
  };
  let currentStatus = options.initialStatus;
  let timer: TimerHandle | null = null;
  let disposed = false;
  let fetching = false;
  let resumeAfterFetch = false;
  let navigated = false;

  function clearPollTimer() {
    if (timer === null) return;
    timers.clearInterval(timer);
    timer = null;
  }

  function settleStatus() {
    const path = reportPath(currentStatus);
    if (path !== null) {
      clearPollTimer();
      if (!navigated) {
        navigated = true;
        options.navigate(path);
      }
      return;
    }
    if (!needsPolling(currentStatus)) clearPollTimer();
  }

  async function refresh(resumeWhenDone = false) {
    if (disposed || !needsPolling(currentStatus)) return;
    resumeAfterFetch ||= resumeWhenDone;
    if (fetching) return;

    fetching = true;
    try {
      const payload = await options.fetchStatus();
      if (disposed) return;
      currentStatus = parseCheckoutStatus(payload);
      options.deliverStatus(currentStatus);
      settleStatus();
    } catch {
      // Keep the last valid instructions and let the bounded interval retry.
    } finally {
      fetching = false;
      if (resumeAfterFetch) {
        resumeAfterFetch = false;
        schedulePolling();
      }
    }
  }

  function schedulePolling() {
    clearPollTimer();
    if (
      disposed
      || !options.visibility.isVisible()
      || !needsPolling(currentStatus)
    ) {
      return;
    }
    timer = timers.setInterval(() => {
      void refresh();
    }, POLL_INTERVAL_MS);
  }

  function handleVisibilityChange() {
    clearPollTimer();
    if (options.visibility.isVisible()) void refresh(true);
  }

  const unsubscribeVisibility = options.visibility.subscribe(
    handleVisibilityChange,
  );
  settleStatus();
  schedulePolling();

  return () => {
    disposed = true;
    clearPollTimer();
    unsubscribeVisibility();
  };
}

export function formatCheckoutRemainingTime(
  expiresAt: string,
  nowMs = Date.now(),
): string {
  const remainingSeconds = Math.max(
    0,
    Math.ceil((Date.parse(expiresAt) - nowMs) / 1_000),
  );
  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export type CheckoutCopyField =
  | "accountNumber"
  | "amount"
  | "transferDescription";

type ClipboardWriter = {
  writeText(value: string): Promise<void>;
};

export async function copyCheckoutField(
  field: CheckoutCopyField,
  status: CheckoutStatus,
  clipboard: ClipboardWriter,
  onCopied: (field: CheckoutCopyField) => void,
): Promise<boolean> {
  const instructions = status.paymentInstructions;
  const values: Record<CheckoutCopyField, string> = {
    accountNumber: instructions.accountNumber,
    amount: String(instructions.amount),
    transferDescription: instructions.transferDescription,
  };

  try {
    await clipboard.writeText(values[field]);
    onCopied(field);
    return true;
  } catch {
    return false;
  }
}

export type VietQrCheckoutLabels = {
  instructionsTitle: string;
  bankCode: string;
  accountNumber: string;
  accountHolder: string;
  amount: string;
  transferDescription: string;
  remainingTime: string;
  qrAlt: string;
  copyAccountNumber: string;
  copyAmount: string;
  copyTransferDescription: string;
  copied: string;
  status: Record<CheckoutStatus["order"]["status"], string>;
};

export type VietQrCheckoutProps = {
  initialStatus: CheckoutStatus;
  labels: VietQrCheckoutLabels;
};

export function VietQrCheckout({
  initialStatus,
  labels,
}: VietQrCheckoutProps) {
  const [status, setStatus] = useState(initialStatus);
  const [copiedField, setCopiedField] = useState<CheckoutCopyField | null>(null);
  const feedbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [remainingTime, setRemainingTime] = useState(() =>
    formatCheckoutRemainingTime(initialStatus.paymentInstructions.expiresAt)
  );

  useEffect(() => {
    const visibility: VisibilityDependencies = {
      isVisible: () => document.visibilityState === "visible",
      subscribe(listener) {
        document.addEventListener("visibilitychange", listener);
        return () => document.removeEventListener("visibilitychange", listener);
      },
    };
    return startVietQrCheckoutPolling({
      initialStatus,
      async fetchStatus() {
        const response = await fetch(
          `/api/commerce/orders/${encodeURIComponent(initialStatus.order.id)}/status`,
          { cache: "no-store" },
        );
        if (!response.ok) throw new Error("CHECKOUT_STATUS_FAILED");
        return response.json();
      },
      deliverStatus: setStatus,
      navigate: (path) => window.location.assign(path),
      visibility,
    });
  }, [initialStatus]);

  useEffect(() => {
    const update = () => {
      setRemainingTime(
        formatCheckoutRemainingTime(status.paymentInstructions.expiresAt),
      );
    };
    update();
    const timer = window.setInterval(update, 1_000);
    return () => window.clearInterval(timer);
  }, [status.paymentInstructions.expiresAt]);

  useEffect(() => () => {
    if (feedbackTimer.current !== null) clearTimeout(feedbackTimer.current);
  }, []);

  function copyField(field: CheckoutCopyField) {
    if (!navigator.clipboard) return;
    void copyCheckoutField(field, status, navigator.clipboard, (copied) => {
      setCopiedField(copied);
      if (feedbackTimer.current !== null) clearTimeout(feedbackTimer.current);
      feedbackTimer.current = setTimeout(() => setCopiedField(null), 1_800);
    });
  }

  const instructions = status.paymentInstructions;
  const priceLocale = status.order.locale === "en" ? "en-US" : "vi-VN";
  const copyLabels: Record<CheckoutCopyField, string> = {
    accountNumber: labels.copyAccountNumber,
    amount: labels.copyAmount,
    transferDescription: labels.copyTransferDescription,
  };

  function copyButton(field: CheckoutCopyField) {
    return (
      <button
        aria-label={copyLabels[field]}
        className="vietqr-copy-button"
        onClick={() => copyField(field)}
        type="button"
      >
        <Icon name={copiedField === field ? "check" : "hash"} />
        <span>{copyLabels[field]}</span>
      </button>
    );
  }

  return (
    <section
      aria-labelledby="vietqr-instructions-title"
      className="vietqr-checkout"
      data-checkout-status={status.order.status}
    >
      <figure className="vietqr-figure">
        <div className="vietqr-image-frame">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            alt={labels.qrAlt}
            className="vietqr-image"
            height={320}
            src={instructions.qrUrl}
            width={320}
          />
        </div>
        <figcaption>{labels.qrAlt}</figcaption>
      </figure>

      <div className="vietqr-instructions">
        <p className="vietqr-status" role="status">
          {labels.status[status.order.status]}
        </p>
        <h2 id="vietqr-instructions-title">{labels.instructionsTitle}</h2>
        <dl className="vietqr-details">
          <div>
            <dt>{labels.bankCode}</dt>
            <dd>{instructions.bankCode}</dd>
          </div>
          <div>
            <dt>{labels.accountNumber}</dt>
            <dd>
              <span>{instructions.accountNumber}</span>
              {copyButton("accountNumber")}
            </dd>
          </div>
          <div>
            <dt>{labels.accountHolder}</dt>
            <dd>{instructions.accountHolder}</dd>
          </div>
          <div>
            <dt>{labels.amount}</dt>
            <dd>
              <span>
                {instructions.amount.toLocaleString(priceLocale)}{" "}
                {instructions.currency}
              </span>
              {copyButton("amount")}
            </dd>
          </div>
          <div>
            <dt>{labels.transferDescription}</dt>
            <dd>
              <span>{instructions.transferDescription}</span>
              {copyButton("transferDescription")}
            </dd>
          </div>
          <div>
            <dt>{labels.remainingTime}</dt>
            <dd className="vietqr-time">
              <Icon name="clock" />
              <time dateTime={instructions.expiresAt}>{remainingTime}</time>
            </dd>
          </div>
        </dl>
        <p aria-live="polite" className="vietqr-copy-feedback">
          {copiedField === null ? "" : labels.copied}
        </p>
      </div>
    </section>
  );
}
