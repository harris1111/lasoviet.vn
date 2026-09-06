import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { privateApiClient } from "../../../../api/private-api-client";
import {
  VerifiedAccountResolutionError,
  resolveVerifiedAccountActor,
} from "../../../../auth/resolve-current-actor";
import { safeParseCheckoutStatus } from "../../../../features/commerce/checkout-status";
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
  if (order.locale !== routeLocale) return redirect(checkoutPath(order.locale, order.id));
  const t = await getTranslations({ locale: order.locale, namespace: "reports" });

  return (
    <main className="topic-page vietqr-checkout-page">
      <section className="container">
        <p className="eyebrow">{t("checkout.eyebrow")}</p>
        <h1>{t("checkout.title")}</h1>
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
          }}
        />
      </section>
    </main>
  );
}
