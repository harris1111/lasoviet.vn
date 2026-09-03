"use server";

import { redirect } from "next/navigation";

import { privateApiClient } from "../../api/private-api-client";
import { resolveCurrentActor } from "../../auth/resolve-current-actor";

export async function createCheckoutOrder(chartId: string, locale: string) {
  const actor = await resolveCurrentActor();
  const response = await privateApiClient(actor, actor.requestId).request<{
    ok: boolean;
    value?: { order: { id: string } };
  }>("/commerce/orders", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ chartId, sku: "ZIWEI-IDENTITY-P0" }),
  });
  if (!response.ok || response.value === undefined) throw new Error("CHECKOUT_ORDER_FAILED");
  const prefix = locale === "en" ? "/en" : "";
  redirect(`${prefix}/thanh-toan/${response.value.order.id}`);
}
