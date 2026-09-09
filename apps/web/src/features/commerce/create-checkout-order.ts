"use server";

import { redirect } from "next/navigation";

import {
  privateApiClient,
  PrivateApiClientError,
} from "../../api/private-api-client";
import {
  VerifiedAccountResolutionError,
  resolveVerifiedAccountActor,
} from "../../auth/resolve-current-actor";
import { parseCheckoutStatus } from "./checkout-status";

export type CheckoutPurchaseState = {
  status: "idle" | "paused";
};

export const INITIAL_CHECKOUT_PURCHASE_STATE: CheckoutPurchaseState = {
  status: "idle",
};

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

export async function createCheckoutOrderAction(
  arg1: string | CheckoutPurchaseState,
  arg2?: string | FormData,
  _arg3?: CheckoutPurchaseState,
  _arg4?: FormData,
): Promise<CheckoutPurchaseState> {
  let chartId: string;
  let locale: string;

  if (typeof arg1 === "string" && typeof arg2 === "string") {
    chartId = arg1;
    locale = arg2;
  } else if (typeof arg1 === "object" && arg2 instanceof FormData) {
    chartId = String(arg2.get("chartId") ?? "");
    locale = String(arg2.get("locale") ?? "vi");
  } else {
    throw new Error("CHECKOUT_ARGUMENTS_INVALID");
  }

  try {
    await createCheckoutOrder(chartId, locale);
    return { status: "idle" };
  } catch (error) {
    if (
      error instanceof PrivateApiClientError &&
      error.code === "CHECKOUT_PAYMENTS_PAUSED"
    ) {
      return { status: "paused" };
    }
    throw error;
  }
}
