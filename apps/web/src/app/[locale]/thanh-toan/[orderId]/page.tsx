import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { privateApiClient } from "../../../../api/private-api-client.js";
import {
  VerifiedAccountResolutionError,
  resolveVerifiedAccountActor,
} from "../../../../auth/resolve-current-actor.js";
import { safeParseCheckoutStatus } from "../../../../features/commerce/checkout-status.js";

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
  const { order, paymentInstructions } = parsed.value;
  if (order.locale !== "vi" && order.locale !== "en") notFound();
  if (order.locale !== routeLocale) return redirect(checkoutPath(order.locale, order.id));
  const t = await getTranslations({ locale: order.locale, namespace: "reports" });
  const priceLocale = order.locale === "en" ? "en-US" : "vi-VN";

  return (
    <main className="topic-page">
      <section className="container paid-topic-selector">
        <p className="eyebrow">{t("checkout.eyebrow")}</p>
        <h1>{t("checkout.title")}</h1>
        <article className="paid-topic-offer">
          <p>{paymentInstructions.amount.toLocaleString(priceLocale)} {paymentInstructions.currency}</p>
          <p>{t(`checkout.status.${order.status}`)}</p>
          <div className="payment-placeholder">
            <p>{paymentInstructions.bankCode} - {paymentInstructions.accountNumber}</p>
            <p>{paymentInstructions.accountHolder}</p>
            <p>{paymentInstructions.transferDescription}</p>
          </div>
        </article>
      </section>
    </main>
  );
}
