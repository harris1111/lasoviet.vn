"use server";

import { redirect } from "next/navigation";

import { privateApiClient } from "../../api/private-api-client.js";
import {
  VerifiedAccountResolutionError,
  resolveVerifiedAccountActor,
} from "../../auth/resolve-current-actor.js";
import { parseCheckoutStatus } from "./checkout-status.js";

export async function createCheckoutOrder(chartId: string, locale: string) {
  if (locale !== "vi" && locale !== "en") throw new Error("CHECKOUT_LOCALE_INVALID");
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
    value?: unknown;
  }>("/commerce/orders", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ chartId, sku: "ZIWEI-IDENTITY-P0", locale }),
  });
  if (!response.ok || response.value === undefined) throw new Error("CHECKOUT_ORDER_FAILED");
  let checkoutStatus;
  try {
    checkoutStatus = parseCheckoutStatus(response.value);
  } catch {
    throw new Error("CHECKOUT_ORDER_FAILED");
  }
  redirect(`${prefix}/thanh-toan/${encodeURIComponent(checkoutStatus.order.id)}`);
}
