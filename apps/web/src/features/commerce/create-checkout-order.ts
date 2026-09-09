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
import {
  DEFAULT_PUBLIC_OFFER_KEY,
  resolveActiveSkuFromPublicOfferKey,
} from "./checkout-offer";
import { parseCheckoutStatus } from "./checkout-status";

export type CheckoutPurchaseState = {
  status: "idle" | "paused";
};

export const INITIAL_CHECKOUT_PURCHASE_STATE: CheckoutPurchaseState = {
  status: "idle",
};

export async function createCheckoutOrder(
  chartId: string,
  locale: string,
  offerKey: string = DEFAULT_PUBLIC_OFFER_KEY,
) {
  if (locale !== "vi" && locale !== "en") {
    throw new Error("CHECKOUT_LOCALE_INVALID");
  }

  const sku = resolveActiveSkuFromPublicOfferKey(offerKey);
  if (sku === null) {
    throw new Error("CHECKOUT_OFFER_INVALID");
  }

  const prefix = locale === "en" ? "/en" : "";
  let actor;
  try {
    actor = await resolveVerifiedAccountActor();
  } catch (error) {
    if (error instanceof VerifiedAccountResolutionError) {
      const returnTarget = `${prefix}/la-so/${encodeURIComponent(
        chartId,
      )}/chon-luan-giai?offer=${encodeURIComponent(
        offerKey,
      )}#${encodeURIComponent(offerKey)}`;
      return redirect(
        `${prefix}/dang-nhap?callbackURL=${encodeURIComponent(returnTarget)}`,
      );
    }
    throw error;
  }

  let response: {
    ok: boolean;
    value?: unknown;
    code?: string;
    error?: { code?: string };
  };
  try {
    response = await privateApiClient(actor, actor.requestId).request<{
      ok: boolean;
      value?: unknown;
      code?: string;
      error?: { code?: string };
    }>("/commerce/orders", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ chartId, sku, locale }),
    });
  } catch (error) {
    if (
      error instanceof PrivateApiClientError &&
      error.code === "ENTITLEMENT_EXISTS"
    ) {
      return redirect(`${prefix}/tai-khoan/bao-cao`);
    }
    throw error;
  }

  if (
    !response.ok &&
    (response.code === "ENTITLEMENT_EXISTS" ||
      response.error?.code === "ENTITLEMENT_EXISTS")
  ) {
    return redirect(`${prefix}/tai-khoan/bao-cao`);
  }

  if (!response.ok || response.value === undefined) {
    throw new Error("CHECKOUT_ORDER_FAILED");
  }

  let checkoutStatus;
  try {
    checkoutStatus = parseCheckoutStatus(response.value);
  } catch {
    throw new Error("CHECKOUT_ORDER_FAILED");
  }

  if (checkoutStatus.order.status === "paid" && checkoutStatus.reportId) {
    return redirect(
      `${prefix}/bao-cao/${encodeURIComponent(checkoutStatus.reportId)}`,
    );
  }

  redirect(`${prefix}/thanh-toan/${encodeURIComponent(checkoutStatus.order.id)}`);
}

export async function createCheckoutOrderAction(
  arg1: string | CheckoutPurchaseState,
  arg2?: string | FormData,
  arg3?: string | CheckoutPurchaseState,
  arg4?: FormData | CheckoutPurchaseState,
  _arg5?: FormData,
): Promise<CheckoutPurchaseState> {
  let chartId = "";
  let locale = "vi";
  let offerKey: string = DEFAULT_PUBLIC_OFFER_KEY;

  if (typeof arg1 === "string" && typeof arg2 === "string") {
    chartId = arg1;
    locale = arg2;
    if (typeof arg3 === "string") {
      offerKey = arg3;
    }
    if (arg4 instanceof FormData && arg4.has("offerKey")) {
      offerKey = String(arg4.get("offerKey"));
    } else if (_arg5 instanceof FormData && _arg5.has("offerKey")) {
      offerKey = String(_arg5.get("offerKey"));
    }
  } else if (typeof arg1 === "object" && arg2 instanceof FormData) {
    chartId = String(arg2.get("chartId") ?? "");
    locale = String(arg2.get("locale") ?? "vi");
    if (arg2.has("offerKey")) {
      offerKey = String(arg2.get("offerKey"));
    }
  } else {
    throw new Error("CHECKOUT_ARGUMENTS_INVALID");
  }

  try {
    await createCheckoutOrder(chartId, locale, offerKey);
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
