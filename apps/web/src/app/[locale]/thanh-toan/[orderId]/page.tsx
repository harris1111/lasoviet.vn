import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { privateApiClient } from "../../../../api/private-api-client";
import { resolveCurrentActor } from "../../../../auth/resolve-current-actor";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function CheckoutPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const { orderId } = await params;
  const actor = await resolveCurrentActor();
  const response = await privateApiClient(actor, actor.requestId).request<{
    ok: boolean;
    value?: {
      order: { id: string; status: string; amount: number; currency: string };
      payment: { action: string; fields: Record<string, string> };
    };
  }>(`/commerce/orders/${encodeURIComponent(orderId)}`);
  if (!response.ok || response.value === undefined) notFound();
  const { order, payment } = response.value;

  return (
    <main className="topic-page">
      <section className="container paid-topic-selector">
        <p className="eyebrow">Thanh toán</p>
        <h1>Luận giải bản mệnh</h1>
        <article className="paid-topic-offer">
          <p>{order.amount.toLocaleString("vi-VN")} {order.currency}</p>
          <form action={payment.action} method="post">
            {Object.entries(payment.fields).map(([name, value]) => (
              <input key={name} type="hidden" name={name} value={String(value)} />
            ))}
            <button className="button" type="submit" disabled={order.status !== "pending"}>
              Đi tới SePay
            </button>
          </form>
        </article>
      </section>
    </main>
  );
}
