import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { privateApiClient } from "../../../../api/private-api-client";
import {
  VerifiedAccountResolutionError,
  resolveVerifiedAccountActor,
} from "../../../../auth/resolve-current-actor";
import { submitPaymentSelfClaim } from "../../../../features/commerce/payment-self-claim";
import { safeParseCheckoutStatus } from "../../../../features/commerce/checkout-status";
import { PaymentSelfClaimForm } from "../../../../features/commerce/payment-self-claim-form";
import { VietQrCheckout } from "../../../../features/commerce/vietqr-checkout";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

function checkoutPath(locale: "vi" | "en", orderId: string): string {
  return locale === "en" ? `/en/thanh-toan/${encodeURIComponent(orderId)}` : `/thanh-toan/${encodeURIComponent(orderId)}`;
}

export default async function CheckoutPage({
  params,
}: {
  params: Promise<{ locale: string; orderId: string }>;
}) {
  const { locale, orderId } = await params;
  const routeLocale = locale === "en" ? "en" : locale === "vi" ? "vi" : null;
  if (routeLocale === null) notFound();
  let actor;
  try {
    actor = await resolveVerifiedAccountActor();
  } catch (error) {
    if (error instanceof VerifiedAccountResolutionError) {
      const prefix = routeLocale === "en" ? "/en" : "";
      return redirect(
        `${prefix}/dang-nhap?callbackURL=${encodeURIComponent(
          `${prefix}/thanh-toan/${orderId}`,
        )}`,
      );
    }
    throw error;
  }
  const response = await privateApiClient(actor, actor.requestId).request<{
    ok: boolean;
    value?: unknown;
  }>(`/commerce/orders/${encodeURIComponent(orderId)}`);
  if (!response.ok || response.value === undefined) notFound();
  const parsed = safeParseCheckoutStatus(response.value);
  if (!parsed.ok) notFound();
  const { order } = parsed.value;
  if (order.locale !== "vi" && order.locale !== "en") notFound();
  if (order.status === "paid" && parsed.value.reportId !== null) {
    const prefix = order.locale === "en" ? "/en" : "";
    return redirect(`${prefix}/bao-cao/${encodeURIComponent(parsed.value.reportId)}`);
  }
  if (order.locale !== routeLocale) return redirect(checkoutPath(order.locale, order.id));
  const t = await getTranslations({ locale: order.locale, namespace: "reports" });

  return (
    <main className="topic-page vietqr-checkout-page">
      <section className="container">
        <p className="eyebrow">{t("checkout.eyebrow")}</p>
        <h1>{order.creditApplied > 0 ? t("checkout.upgrade_title") : `${t("checkout.eyebrow")} · ${order.productTitle}`}</h1>
        <VietQrCheckout
          initialStatus={parsed.value}
          labels={{
            instructionsTitle: t("checkout.instructions_title"),
            bankCode: t("checkout.bank_code"),
            accountNumber: t("checkout.account_number"),
            accountHolder: t("checkout.account_holder"),
            amount: t("checkout.amount"),
            transferDescription: t("checkout.transfer_description"),
            remainingTime: t("checkout.remaining_time"),
            qrAlt: t("checkout.qr_alt"),
            copyAccountNumber: t("checkout.copy_account_number"),
            copyAmount: t("checkout.copy_amount"),
            copyTransferDescription: t("checkout.copy_transfer_description"),
            copied: t("checkout.copied"),
            status: {
              pending: t("checkout.status.pending"),
              paid: t("checkout.status.paid"),
              expired: t("checkout.status.expired"),
              failed: t("checkout.status.failed"),
              refunded: t("checkout.status.refunded"),
            },
            noSecondTransferWarning: t("checkout.no_second_transfer_warning"),
            paidProcessingTitle: t("checkout.paid_processing_title"),
            paidProcessingDescription: t("checkout.paid_processing_description"),
            expiredTitle: t("checkout.expired_title"),
            expiredDescription: order.paymentCode
              ? t("checkout.expired_description", { payment_code: order.paymentCode })
              : t("checkout.expired_description_without_code"),
            newChartAction: t("checkout.new_chart_action"),
            orderHistoryAction: t("checkout.order_history_action"),
            failedTitle: t("checkout.failed_title"),
            failedDescription: t("checkout.failed_description"),
            supportAction: t("checkout.support_action"),
            refundedTitle: t("checkout.refunded_title"),
            refundedDescription: t("checkout.refunded_description"),
            summaryPurchasing: t("checkout.summary_purchasing"),
            summaryAutoFulfill: t("checkout.summary_auto_fulfill"),
            summaryOrderCode: t("checkout.summary_order_code"),
            upgradeCreditApplied: t("checkout.upgrade_credit_applied"),
            upgradeCreditDeadline: t("checkout.upgrade_credit_deadline"),
            summaryListPrice: t("checkout.summary_list_price"),
            summaryPayableAmount: t("checkout.summary_payable_amount"),
            stepsTitle: t("checkout.steps_title"),
            step1: t("checkout.step_1"),
            step2: t("checkout.step_2"),
            step3: t("checkout.step_3"),
            step4: t("checkout.step_4"),
            expiresAtLabel: t("checkout.expires_at_label"),
            pollingErrorTitle: t("checkout.polling_error_title"),
            pollingErrorDescription: t("checkout.polling_error_notice"),
            retryPollingAction: t("checkout.retry_polling_action"),
            returnToTopicSelectorAction: t("checkout.return_to_topic_selector_action"),
            footerSupportPrefix: t("checkout.footer_support"),
            footerSupportAction: t("checkout.footer_contact_action"),
          }}
          selfClaim={
            (order.status === "pending" || order.status === "expired") ? (
              <PaymentSelfClaimForm
                orderId={order.id}
                defaultAmount={order.amount}
                locale={order.locale}
                action={submitPaymentSelfClaim}
                labels={{
                  heading: t("checkout.selfClaim.heading"),
                  description: t("checkout.selfClaim.description"),
                  amountLabel: t("checkout.selfClaim.amountLabel"),
                  timeLabel: t("checkout.selfClaim.timeLabel"),
                  submit: t("checkout.selfClaim.submit"),
                  submitting: t("checkout.selfClaim.submitting"),
                  errors: {
                    invalid_input: t("checkout.selfClaim.errors.invalid_input"),
                    payment_not_found: t("checkout.selfClaim.errors.payment_not_found"),
                    rate_limited: t("checkout.selfClaim.errors.rate_limited"),
                    service_unavailable: t("checkout.selfClaim.errors.service_unavailable"),
                  },
                }}
              />
            ) : null
          }
        />
      </section>
    </main>
  );
}
