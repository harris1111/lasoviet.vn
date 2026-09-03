import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { privateApiClient } from "../../../../api/private-api-client";
import {
  VerifiedAccountResolutionError,
  resolveVerifiedAccountActor,
} from "../../../../auth/resolve-current-actor";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

function checkoutPath(locale: "vi" | "en", orderId: string): string {
  return locale === "en" ? `/en/thanh-toan/${orderId}` : `/thanh-toan/${orderId}`;
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
    value?: {
      order: {
        id: string;
        status: string;
        amount: number;
        currency: string;
        locale: string;
      };
      payment: { action: string; fields: Record<string, string> };
    };
  }>(`/commerce/orders/${encodeURIComponent(orderId)}`);
  if (!response.ok || response.value === undefined) notFound();
  const { order, payment } = response.value;
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
          <p>{order.amount.toLocaleString(priceLocale)} {order.currency}</p>
          <p>{t(`checkout.status.${order.status}`)}</p>
          <form action={payment.action} method="post">
            {Object.entries(payment.fields).map(([name, value]) => (
              <input key={name} type="hidden" name={name} value={String(value)} />
            ))}
            <button className="button" type="submit" disabled={order.status !== "pending"}>
              {t("checkout.action")}
            </button>
          </form>
        </article>
      </section>
    </main>
  );
}
