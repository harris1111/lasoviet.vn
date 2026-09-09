"use client";

import Link from "next/link";
import { useActionState } from "react";

import {
  createCheckoutOrderAction,
  INITIAL_CHECKOUT_PURCHASE_STATE,
  type CheckoutPurchaseState,
} from "./create-checkout-order";

export type CheckoutPurchaseLabels = {
  continuePayment?: string;
  viewSample?: string;
  pausedTitle?: string;
  pausedDescription?: string;
  retry?: string;
};

export type CheckoutPurchaseFormProps = {
  chartId: string;
  locale: "vi" | "en";
  sampleHref: string;
  labels?: CheckoutPurchaseLabels;
  action?: (
    state: CheckoutPurchaseState,
    formData?: FormData,
  ) => Promise<CheckoutPurchaseState>;
  initialState?: CheckoutPurchaseState;
};

export function CheckoutPurchaseForm({
  chartId,
  locale,
  sampleHref,
  labels,
  action,
  initialState,
}: CheckoutPurchaseFormProps) {
  const defaultLabels: Required<CheckoutPurchaseLabels> = {
    continuePayment:
      locale === "en" ? "Continue to payment" : "Tiếp tục thanh toán",
    viewSample: locale === "en" ? "View sample report" : "Xem bản luận giải mẫu",
    pausedTitle:
      locale === "en"
        ? "New payments temporarily paused"
        : "Tạm dừng tiếp nhận thanh toán mới",
    pausedDescription:
      locale === "en"
        ? "The system is temporarily pausing new payments. Please do not transfer funds at this time."
        : "Hệ thống đang tạm ngừng tiếp nhận thanh toán mới. Quý khách vui lòng không chuyển khoản trong thời gian này.",
    retry: locale === "en" ? "Try again" : "Thử lại",
  };

  const resolvedLabels: Required<CheckoutPurchaseLabels> = {
    continuePayment: labels?.continuePayment ?? defaultLabels.continuePayment,
    viewSample: labels?.viewSample ?? defaultLabels.viewSample,
    pausedTitle: labels?.pausedTitle ?? defaultLabels.pausedTitle,
    pausedDescription:
      labels?.pausedDescription ?? defaultLabels.pausedDescription,
    retry: labels?.retry ?? defaultLabels.retry,
  };

  const boundAction = action ?? createCheckoutOrderAction.bind(null, chartId, locale);
  const [state, formAction, isPending] = useActionState(
    boundAction,
    initialState ?? INITIAL_CHECKOUT_PURCHASE_STATE,
  );

  if (state.status === "paused") {
    return (
      <div
        className="checkout-purchase-paused"
        data-testid="checkout-paused-state"
        role="status"
        aria-live="polite"
      >
        <p className="checkout-purchase-paused-title">
          {resolvedLabels.pausedTitle}
        </p>
        <p className="checkout-purchase-paused-description">
          {resolvedLabels.pausedDescription}
        </p>
        <div className="topic-actions-row">
          <form action={formAction}>
            <button
              className="button button-primary"
              disabled={isPending}
              type="submit"
            >
              {isPending ? "..." : resolvedLabels.retry}
            </button>
          </form>
          <Link className="sample-report-link" href={sampleHref}>
            {resolvedLabels.viewSample} →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="topic-actions-row">
      <form action={formAction}>
        <button
          className="button button-primary"
          disabled={isPending}
          type="submit"
        >
          {isPending ? "..." : resolvedLabels.continuePayment}
        </button>
      </form>
      <Link className="sample-report-link" href={sampleHref}>
        {resolvedLabels.viewSample} →
      </Link>
    </div>
  );
}
