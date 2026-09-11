"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

import { Icon } from "../../components/icon";
import {
  parseCheckoutStatus,
  type CheckoutStatus,
} from "./checkout-status";

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
  onError?(error: unknown): void;
  onSuccess?(): void;
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
    setInterval: (callback, delayMs) =>
      globalThis.setInterval(callback, delayMs),
    clearInterval: (handle) => globalThis.clearInterval(handle),
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
      options.onSuccess?.();
      settleStatus();
    } catch (error) {
      options.onError?.(error);
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

export function formatCheckoutExpiresAt(
  expiresAt: string,
  locale: "vi" | "en",
): string {
  try {
    const d = new Date(expiresAt);
    if (Number.isNaN(d.getTime())) return expiresAt;
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Ho_Chi_Minh",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).formatToParts(d);

    const find = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
    const day = find("day");
    const month = find("month");
    const year = find("year");
    const hour = find("hour");
    const minute = find("minute");

    if (locale === "vi") {
      return `${hour}:${minute}, ${day}/${month}/${year}`;
    }
    return `${hour}:${minute}, ${year}-${month}-${day}`;
  } catch {
    return expiresAt;
  }
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
  if (instructions === null) {
    return false;
  }
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
  noSecondTransferWarning?: string;
  paidProcessingTitle?: string;
  paidProcessingDescription?: string;
  expiredTitle?: string;
  expiredDescription?: string;
  newChartAction?: string;
  orderHistoryAction?: string;
  failedTitle?: string;
  failedDescription?: string;
  supportAction?: string;
  refundedTitle?: string;
  refundedDescription?: string;
  summaryPurchasing?: string;
  summaryAutoFulfill?: string;
  summaryOrderCode?: string;
  summaryListPrice?: string;
  summaryPayableAmount?: string;
  upgradeCreditApplied?: string;
  upgradeCreditDeadline?: string;
  stepsTitle?: string;
  step1?: string;
  step2?: string;
  step3?: string;
  step4?: string;
  expiresAtLabel?: string;
  pollingErrorTitle?: string;
  pollingErrorDescription?: string;
  retryPollingAction?: string;
  returnToTopicSelectorAction?: string;
  footerSupportPrefix?: string;
  footerSupportAction?: string;
};

export type VietQrCheckoutProps = {
  initialStatus: CheckoutStatus;
  labels: VietQrCheckoutLabels;
  selfClaim?: React.ReactNode;
};

export function VietQrCheckout({
  initialStatus,
  labels,
  selfClaim,
}: VietQrCheckoutProps) {
  const [status, setStatus] = useState(initialStatus);
  const [hasPollingError, setHasPollingError] = useState(false);
  const [copiedField, setCopiedField] = useState<CheckoutCopyField | null>(null);
  const feedbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const instructions = status.paymentInstructions;
  const isVi = status.order.locale === "vi";
  const priceLocale = isVi ? "vi-VN" : "en-US";
  const currencySymbol =
    status.order.currency === "VND"
      ? (isVi ? "₫" : "VND")
      : status.order.currency;

  const [remainingTime, setRemainingTime] = useState(() =>
    instructions ? formatCheckoutRemainingTime(instructions.expiresAt) : ""
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
      deliverStatus: (newStatus) => {
        setStatus(newStatus);
        setHasPollingError(false);
      },
      navigate: (path) => window.location.assign(path),
      visibility,
      onError: () => setHasPollingError(true),
      onSuccess: () => setHasPollingError(false),
    });
  }, [initialStatus]);

  async function handleRetryPolling() {
    try {
      const response = await fetch(
        `/api/commerce/orders/${encodeURIComponent(initialStatus.order.id)}/status`,
        { cache: "no-store" },
      );
      if (!response.ok) throw new Error("CHECKOUT_STATUS_FAILED");
      const data = await response.json();
      const parsed = parseCheckoutStatus(data);
      setStatus(parsed);
      setHasPollingError(false);
      const path = reportPath(parsed);
      if (path) {
        window.location.assign(path);
      }
    } catch {
      setHasPollingError(true);
    }
  }

  const expiresAt = instructions?.expiresAt;
  useEffect(() => {
    if (!expiresAt) return;
    const update = () => {
      setRemainingTime(formatCheckoutRemainingTime(expiresAt));
    };
    update();
    const timer = window.setInterval(update, 1_000);
    return () => window.clearInterval(timer);
  }, [expiresAt]);

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

  const orderSummaryPurchasing =
    labels.summaryPurchasing ?? (isVi ? "Bạn đang mua" : "You are purchasing");
  const orderSummaryAutoFulfill =
    labels.summaryAutoFulfill ??
    (isVi
      ? "Báo cáo mở tự động khi chúng tôi xác nhận thanh toán — bạn không cần làm gì thêm sau khi chuyển khoản."
      : "Report opens automatically when payment is confirmed — no further action is needed after transfer.");
  const orderSummaryCode = labels.summaryOrderCode ?? (isVi ? "Mã đơn" : "Order code");
  const orderSummaryCreditApplied =
    labels.upgradeCreditApplied ?? (isVi ? "Khấu trừ đã áp dụng" : "Credit applied");
  const orderSummaryCreditDeadline =
    labels.upgradeCreditDeadline ?? (isVi ? "Hạn mức ưu đãi" : "Credit deadline");

  const expiresAtLabel = labels.expiresAtLabel ?? (isVi ? "Còn hiệu lực đến" : "Valid until");

  const pollingErrorTitle =
    labels.pollingErrorTitle ??
    (isVi ? "Tạm thời gián đoạn kiểm tra tự động" : "Automatic check temporarily interrupted");
  const pollingErrorDesc =
    labels.pollingErrorDescription ??
    (isVi
      ? "Chúng tôi tạm thời không kiểm tra được trạng thái tự động."
      : "We temporarily cannot check order status automatically.");
  const retryActionLabel = labels.retryPollingAction ?? (isVi ? "Kiểm tra lại" : "Check again");

  const stepsTitle = labels.stepsTitle ?? (isVi ? "Các bước thực hiện" : "Steps to complete");
  const step1 =
    labels.step1 ??
    (isVi
      ? "Quét mã VietQR, hoặc sao chép thông tin bên dưới."
      : "Scan VietQR code, or copy the information below.");
  const step2 =
    labels.step2 ??
    (isVi ? "Chuyển đúng số tiền hiển thị." : "Transfer the exact amount displayed.");
  const step3 =
    labels.step3 ??
    (isVi
      ? "Giữ nguyên nội dung chuyển khoản — đây là cách chúng tôi nhận ra đúng đơn của bạn."
      : "Keep transfer description unchanged — this is how we identify your exact order.");
  const step4 =
    labels.step4 ??
    (isVi
      ? "Ở lại trang này. Chúng tôi tự động kiểm tra, không cần bấm gì thêm."
      : "Stay on this page. We check automatically; no additional action needed.");

  const footerSupportPrefix =
    labels.footerSupportPrefix ?? (isVi ? "Cần hỗ trợ?" : "Need support?");
  const footerSupportAction =
    labels.footerSupportAction ??
    (isVi ? "Liên hệ — đã điền sẵn mã đơn" : "Contact support — order code prefilled");
  const footerSupportHref = status.order.supportUrl;

  const orderSummaryListPrice = labels.summaryListPrice ?? (isVi ? "Giá gốc" : "List price");
  const orderSummaryPayableAmount = labels.summaryPayableAmount ?? (isVi ? "Số tiền thanh toán" : "Payable amount");

  const isUpgrade = status.order.creditApplied > 0;
  const listPrice = status.order.amount + status.order.creditApplied;

  const orderSummaryBlock = status.order.productTitle ? (
    <section className="checkout-order-summary" aria-label="Order summary">
      {isUpgrade ? (
        <>
          <p className="checkout-summary-main">
            <span>
              {orderSummaryListPrice}: <strong>{listPrice.toLocaleString(priceLocale)} {currencySymbol}</strong>
            </span>
            {" · "}
            <span>
              {orderSummaryCreditApplied}: <strong>-{status.order.creditApplied.toLocaleString(priceLocale)} {currencySymbol}</strong>
            </span>
            {" · "}
            <span>
              {orderSummaryPayableAmount}: <strong>{status.order.amount.toLocaleString(priceLocale)} {currencySymbol}</strong>
            </span>
            {" · "}
            <span>
              {orderSummaryCode}: <code>{status.order.paymentCode}</code>
            </span>
          </p>
          {status.order.creditExpiresAt && (
            <p className="checkout-summary-credit">
              <span>
                {orderSummaryCreditDeadline}:{" "}
                <time dateTime={status.order.creditExpiresAt}>
                  {formatCheckoutExpiresAt(status.order.creditExpiresAt, status.order.locale)}
                </time>
              </span>
            </p>
          )}
        </>
      ) : (
        <p className="checkout-summary-main">
          {orderSummaryPurchasing}: <strong>{status.order.productTitle}</strong>
          {" — "}
          <span>
            {status.order.amount.toLocaleString(priceLocale)} {currencySymbol}
          </span>
          {" · "}
          <span>
            {orderSummaryCode}: <code>{status.order.paymentCode}</code>
          </span>
        </p>
      )}
      <p className="checkout-summary-note">{orderSummaryAutoFulfill}</p>
    </section>
  ) : null;

  const pollingErrorBlock = hasPollingError ? (
    <div
      className="vietqr-polling-error"
      data-testid="checkout-polling-error"
      role="alert"
    >
      <p className="vietqr-polling-error-title">{pollingErrorTitle}</p>
      <p className="vietqr-polling-error-description">{pollingErrorDesc}</p>
      <button
        type="button"
        className="button button-secondary"
        onClick={() => void handleRetryPolling()}
      >
        {retryActionLabel}
      </button>
    </div>
  ) : null;

  const footerSupportBlock = (
    <footer className="checkout-footer-support">
      <p>
        {footerSupportPrefix}{" "}
        <a href={footerSupportHref}>
          {footerSupportAction}
        </a>
      </p>
    </footer>
  );

  const stepsBlock = (
    <div className="checkout-steps" aria-label={stepsTitle}>
      <p className="checkout-steps-title">{stepsTitle}</p>
      <ol className="checkout-steps-list">
        <li>{step1}</li>
        <li>{step2}</li>
        <li>{step3}</li>
        <li>{step4}</li>
      </ol>
    </div>
  );

  if (status.order.status === "paid" && status.reportId !== null) {
    return null;
  }

  if (status.order.status === "paid" && status.reportId === null) {
    const paidTitle = labels.paidProcessingTitle ?? (isVi ? "Đã nhận thanh toán thành công" : "Payment received successfully");
    const paidDesc = labels.paidProcessingDescription ?? (isVi ? "Hệ thống đã ghi nhận thanh toán của bạn và đang chuẩn bị báo cáo luận giải. Vui lòng chờ trong giây lát hoặc kiểm tra lịch sử đơn hàng." : "Your payment has been recorded and your interpretation report is being prepared. Please wait a moment or check your order history.");
    const orderHistoryActionLabel = labels.orderHistoryAction ?? (isVi ? "Xem lịch sử đơn hàng" : "View order history");
    const ordersPath = isVi ? "/tai-khoan/don-hang" : "/en/tai-khoan/don-hang";

    return (
      <>
        {orderSummaryBlock}
        {pollingErrorBlock}
        <section
          className="vietqr-checkout-recovery vietqr-checkout-paid-processing"
          data-checkout-status="paid"
          role="status"
          aria-live="polite"
        >
          <div className="vietqr-recovery-content">
            <p className="vietqr-status">{labels.status.paid}</p>
            <h2>{paidTitle}</h2>
            <p className="vietqr-recovery-description">{paidDesc}</p>
            <div className="report-progress-indicator" aria-hidden="true">
              <span className="report-progress-spinner" />
            </div>
            <div className="vietqr-recovery-actions">
              <Link href={ordersPath} className="button button-secondary">
                {orderHistoryActionLabel}
              </Link>
            </div>
          </div>
        </section>
        {footerSupportBlock}
      </>
    );
  }

  if (status.order.status === "expired") {
    const expiredTitle = labels.expiredTitle ?? (isVi ? "Đơn hàng đã hết hạn thanh toán" : "Order expired");
    const expiredDesc = labels.expiredDescription ?? (isVi ? "Đơn hàng này đã quá thời gian thanh toán. Thông tin đơn hàng cũ vẫn được lưu trong lịch sử giao dịch để bạn tiện tra cứu." : "This order has passed the payment window. Your previous order remains recorded in your order history for reference.");
    const newChartActionLabel = labels.newChartAction ?? (isVi ? "Lập lá số và tạo yêu cầu mới" : "Create a new chart and request");
    const returnToTopicSelectorLabel = labels.returnToTopicSelectorAction ?? (isVi ? "Quay lại chọn luận giải" : "Return to reading selection");
    const orderHistoryActionLabel = labels.orderHistoryAction ?? (isVi ? "Xem lịch sử đơn hàng" : "View order history");
    const newChartPath = isVi ? "/tao-la-so/tu-vi" : "/en/tao-la-so/tu-vi";
    const ordersPath = isVi ? "/tai-khoan/don-hang" : "/en/tai-khoan/don-hang";
    const topicSelectorPath = status.order.chartId
      ? isVi
        ? `/la-so/${encodeURIComponent(status.order.chartId)}/chon-luan-giai`
        : `/en/la-so/${encodeURIComponent(status.order.chartId)}/chon-luan-giai`
      : null;

    return (
      <>
        {orderSummaryBlock}
        <section
          className="vietqr-checkout-recovery vietqr-checkout-expired"
          data-checkout-status="expired"
          role="alert"
        >
          <div className="vietqr-recovery-content">
            <p className="vietqr-status">{labels.status.expired}</p>
            <h2>{expiredTitle}</h2>
            <p className="vietqr-recovery-description">{expiredDesc}</p>
            <div className="vietqr-recovery-actions">
              <Link href={newChartPath} className="button button-primary">
                {newChartActionLabel}
              </Link>
              {topicSelectorPath && (
                <Link href={topicSelectorPath} className="button button-secondary">
                  {returnToTopicSelectorLabel}
                </Link>
              )}
              <Link href={ordersPath} className="button button-secondary">
                {orderHistoryActionLabel}
              </Link>
            </div>
          </div>
        </section>
        {selfClaim}
        {footerSupportBlock}
      </>
    );
  }

  if (status.order.status === "failed") {
    const failedTitle = labels.failedTitle ?? (isVi ? "Thanh toán chưa thành công" : "Payment was not completed");
    const failedDesc = labels.failedDescription ?? (isVi ? "Giao dịch thanh toán cho đơn hàng này chưa thành công. Vui lòng không chuyển khoản lại cho đơn hàng này. Quý khách có thể kiểm tra lịch sử đơn hàng hoặc liên hệ hỗ trợ." : "Payment for this order was not completed. Please do not attempt another transfer for this order. You can check your order history or contact support.");
    const orderHistoryActionLabel = labels.orderHistoryAction ?? (isVi ? "Xem lịch sử đơn hàng" : "View order history");
    const supportActionLabel = labels.supportAction ?? (isVi ? "Liên hệ hỗ trợ" : "Contact support");
    const ordersPath = isVi ? "/tai-khoan/don-hang" : "/en/tai-khoan/don-hang";

    return (
      <>
        {orderSummaryBlock}
        <section
          className="vietqr-checkout-recovery vietqr-checkout-failed"
          data-checkout-status="failed"
          role="alert"
        >
          <div className="vietqr-recovery-content">
            <p className="vietqr-status">{labels.status.failed}</p>
            <h2>{failedTitle}</h2>
            <p className="vietqr-recovery-description">{failedDesc}</p>
            <div className="vietqr-recovery-actions">
              <Link href={ordersPath} className="button button-primary">
                {orderHistoryActionLabel}
              </Link>
              <a href={status.order.supportUrl} className="button button-secondary">
                {supportActionLabel}
              </a>
            </div>
          </div>
        </section>
        {footerSupportBlock}
      </>
    );
  }

  if (status.order.status === "refunded") {
    const refundedTitle = labels.refundedTitle ?? (isVi ? "Đơn hàng đã được hoàn tiền" : "Order refunded");
    const refundedDesc = labels.refundedDescription ?? (isVi ? "Đơn hàng này đã được xử lý hoàn tiền. Quý khách có thể kiểm tra chi tiết trong lịch sử đơn hàng." : "This order has been refunded. You can review the details in your order history.");
    const orderHistoryActionLabel = labels.orderHistoryAction ?? (isVi ? "Xem lịch sử đơn hàng" : "View order history");
    const ordersPath = isVi ? "/tai-khoan/don-hang" : "/en/tai-khoan/don-hang";

    return (
      <>
        {orderSummaryBlock}
        <section
          className="vietqr-checkout-recovery vietqr-checkout-refunded"
          data-checkout-status="refunded"
          role="status"
        >
          <div className="vietqr-recovery-content">
            <p className="vietqr-status">{labels.status.refunded}</p>
            <h2>{refundedTitle}</h2>
            <p className="vietqr-recovery-description">{refundedDesc}</p>
            <div className="vietqr-recovery-actions">
              <Link href={ordersPath} className="button button-secondary">
                {orderHistoryActionLabel}
              </Link>
            </div>
          </div>
        </section>
        {footerSupportBlock}
      </>
    );
  }

  if (instructions === null) {
    return null;
  }

  const copyLabels: Record<CheckoutCopyField, string> = {
    accountNumber: labels.copyAccountNumber,
    amount: labels.copyAmount,
    transferDescription: labels.copyTransferDescription,
  };

  const warningText = labels.noSecondTransferWarning ?? (
    isVi
      ? "Nếu bạn đã chuyển khoản, tuyệt đối không chuyển khoản lại. Vui lòng sử dụng biểu mẫu kiểm tra giao dịch bên dưới để hệ thống đối chiếu."
      : "If you have already transferred, do not transfer again. Please use the verification form below to match your payment."
  );

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
    <>
      {orderSummaryBlock}
      {pollingErrorBlock}
      {stepsBlock}
      <section
        aria-labelledby="vietqr-instructions-title"
        className="vietqr-checkout"
        data-checkout-status="pending"
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
            {labels.status.pending}
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
                <span className="vietqr-time-deadline">
                  {" ("}{expiresAtLabel}{" "}
                  <time dateTime={instructions.expiresAt}>
                    {formatCheckoutExpiresAt(instructions.expiresAt, status.order.locale)}
                  </time>
                  {")"}
                </span>
              </dd>
            </div>
          </dl>
          <p aria-live="polite" className="vietqr-copy-feedback">
            {copiedField === null ? "" : labels.copied}
          </p>

          <div className="vietqr-no-second-transfer-warning" role="note">
            <p>{warningText}</p>
          </div>
        </div>
      </section>

      {selfClaim}
      {footerSupportBlock}
    </>
  );
}
