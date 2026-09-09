"use client";

import { useActionState } from "react";

import {
  INITIAL_PAYMENT_SELF_CLAIM_STATE,
  submitPaymentSelfClaim,
  type PaymentSelfClaimState,
} from "./payment-self-claim";

export type PaymentSelfClaimFormLabels = {
  heading?: string;
  description?: string;
  amountLabel?: string;
  timeLabel?: string;
  submit?: string;
  submitting?: string;
  errors?: {
    invalid_input?: string;
    payment_not_found?: string;
    rate_limited?: string;
    service_unavailable?: string;
  };
};

export type PaymentSelfClaimFormProps = {
  orderId: string;
  defaultAmount: number;
  locale: "vi" | "en";
  action?: (
    state: PaymentSelfClaimState,
    formData: FormData,
  ) => Promise<PaymentSelfClaimState>;
  labels?: PaymentSelfClaimFormLabels;
  initialState?: PaymentSelfClaimState;
};

export function PaymentSelfClaimForm({
  orderId,
  defaultAmount,
  locale,
  action,
  labels,
  initialState,
}: PaymentSelfClaimFormProps) {
  const defaultLabels: Required<Omit<PaymentSelfClaimFormLabels, "errors">> & {
    errors: Required<NonNullable<PaymentSelfClaimFormLabels["errors"]>>;
  } = {
    heading:
      locale === "en"
        ? "Transferred but not yet confirmed?"
        : "Đã chuyển khoản nhưng chưa được ghi nhận?",
    description:
      locale === "en"
        ? "Enter the exact amount and transfer time to locate your payment and continue preparing your report."
        : "Nhập chính xác số tiền và thời gian đã chuyển để hệ thống đối chiếu giao dịch và tiếp tục chuẩn bị báo cáo.",
    amountLabel:
      locale === "en" ? "Amount transferred (VND)" : "Số tiền đã chuyển (VND)",
    timeLabel:
      locale === "en"
        ? "Transfer time (Vietnam time)"
        : "Thời gian chuyển khoản (giờ Việt Nam)",
    submit:
      locale === "en" ? "Check and claim report" : "Kiểm tra và nhận báo cáo",
    submitting: locale === "en" ? "Checking..." : "Đang kiểm tra...",
    errors: {
      invalid_input:
        locale === "en"
          ? "Please check the entered amount and transfer time."
          : "Vui lòng kiểm tra lại số tiền và thời gian chuyển khoản.",
      payment_not_found:
        locale === "en"
          ? "No matching payment found with the entered details. Please check your transfer time or try again in a few minutes."
          : "Chưa tìm thấy giao dịch phù hợp với thông tin đã nhập. Vui lòng kiểm tra lại thời gian chuyển khoản hoặc chờ thêm ít phút.",
      rate_limited:
        locale === "en"
          ? "Daily claim limit reached. Please try again later or contact support."
          : "Bạn đã vượt quá số lần kiểm tra trong ngày. Vui lòng thử lại sau hoặc liên hệ hỗ trợ.",
      service_unavailable:
        locale === "en"
          ? "Reconciliation service is temporarily unavailable. Please try again in a few minutes."
          : "Hệ thống đối chiếu tạm thời gián đoạn. Vui lòng thử lại sau ít phút.",
    },
  };

  const resolvedLabels = {
    heading: labels?.heading ?? defaultLabels.heading,
    description: labels?.description ?? defaultLabels.description,
    amountLabel: labels?.amountLabel ?? defaultLabels.amountLabel,
    timeLabel: labels?.timeLabel ?? defaultLabels.timeLabel,
    submit: labels?.submit ?? defaultLabels.submit,
    submitting: labels?.submitting ?? defaultLabels.submitting,
    errors: {
      invalid_input:
        labels?.errors?.invalid_input ?? defaultLabels.errors.invalid_input,
      payment_not_found:
        labels?.errors?.payment_not_found ??
        defaultLabels.errors.payment_not_found,
      rate_limited:
        labels?.errors?.rate_limited ?? defaultLabels.errors.rate_limited,
      service_unavailable:
        labels?.errors?.service_unavailable ??
        defaultLabels.errors.service_unavailable,
    },
  };

  const [state, formAction, isPending] = useActionState(
    action ?? submitPaymentSelfClaim,
    initialState ?? INITIAL_PAYMENT_SELF_CLAIM_STATE,
  );

  const errorMessage =
    state.status !== "idle" ? resolvedLabels.errors[state.status] : null;

  return (
    <section
      className="payment-self-claim-section"
      aria-labelledby="self-claim-heading"
      data-testid="payment-self-claim-section"
    >
      <div className="payment-self-claim-card">
        <h3 id="self-claim-heading" className="self-claim-heading">
          {resolvedLabels.heading}
        </h3>
        <p className="self-claim-description">{resolvedLabels.description}</p>

        <form action={formAction} className="self-claim-form">
          <input type="hidden" name="orderId" value={orderId} />
          <input type="hidden" name="locale" value={locale} />

          <div className="self-claim-field">
            <label htmlFor="self-claim-amount" className="self-claim-label">
              {resolvedLabels.amountLabel}
            </label>
            <input
              id="self-claim-amount"
              name="amount"
              type="number"
              inputMode="numeric"
              defaultValue={defaultAmount}
              min={1}
              required
              disabled={isPending}
              className="self-claim-input"
            />
          </div>

          <div className="self-claim-field">
            <label htmlFor="self-claim-time" className="self-claim-label">
              {resolvedLabels.timeLabel}
            </label>
            <input
              id="self-claim-time"
              name="transferredAtLocal"
              type="datetime-local"
              step={60}
              required
              disabled={isPending}
              className="self-claim-input"
            />
          </div>

          <div className="self-claim-actions">
            <button
              type="submit"
              disabled={isPending}
              className="button button-secondary self-claim-submit"
            >
              {isPending ? resolvedLabels.submitting : resolvedLabels.submit}
            </button>
          </div>

          <div
            className="self-claim-feedback"
            role="status"
            aria-live="polite"
            data-testid="self-claim-feedback"
          >
            {errorMessage ? (
              <p className="self-claim-error">{errorMessage}</p>
            ) : null}
          </div>
        </form>
      </div>
    </section>
  );
}
