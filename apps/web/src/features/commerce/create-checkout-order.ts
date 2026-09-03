"use server";

import { redirect } from "next/navigation";

import { privateApiClient } from "../../api/private-api-client";
import {
  VerifiedAccountResolutionError,
  resolveVerifiedAccountActor,
} from "../../auth/resolve-current-actor";

export async function createCheckoutOrder(chartId: string, locale: string) {
  const prefix = locale === "en" ? "/en" : "";
  let actor;
  try {
    actor = await resolveVerifiedAccountActor();
  } catch (error) {
    if (error instanceof VerifiedAccountResolutionError) {
      return redirect(
        `${prefix}/dang-nhap?callbackURL=${encodeURIComponent(
          `${prefix}/la-so/${chartId}/chon-luan-giai`,
        )}`,
      );
    }
    throw error;
  }
  const response = await privateApiClient(actor, actor.requestId).request<{
    ok: boolean;
    value?: { order: { id: string } };
  }>("/commerce/orders", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ chartId, sku: "ZIWEI-IDENTITY-P0" }),
  });
  if (!response.ok || response.value === undefined) throw new Error("CHECKOUT_ORDER_FAILED");
  redirect(`${prefix}/thanh-toan/${response.value.order.id}`);
}
