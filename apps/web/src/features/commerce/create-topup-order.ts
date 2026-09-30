import { redirect } from "next/navigation";
import { WalletTopUpContinuationRequestV1Schema, WalletTopUpPackIdSchema, type WalletTopUpPackId, type WalletTopUpContinuationRequestV1 } from "@lasoviet/contracts";

import { sendServerAnalyticsEvent } from "../../analytics/server-analytics";
import {
  privateApiClient,
  PrivateApiClientError,
} from "../../api/private-api-client";
import {
  VerifiedAccountResolutionError,
  resolveVerifiedAccountActor,
} from "../../auth/resolve-current-actor";
import { safeParseCheckoutStatus } from "./checkout-status";

/**
 * Creates a wallet top-up order for the given Lá pack. This is the customer's
 * only path to add real Lá (purchased + bonus) to the wallet: paying the
 * order credits the pack through the SePay webhook (FD-105 package 1.1).
 */
export async function createTopUpOrder(
  packId: string,
  locale: string,
  returnPath?: string,
  continuation?: WalletTopUpContinuationRequestV1,
) {
  if (locale !== "vi" && locale !== "en") {
    throw new Error("TOP_UP_LOCALE_INVALID");
  }
  const parsedPack = WalletTopUpPackIdSchema.safeParse(packId);
  if (!parsedPack.success) {
    throw new Error("TOP_UP_PACK_INVALID");
  }
  const pack: WalletTopUpPackId = parsedPack.data;

  const prefix = locale === "en" ? "/en" : "";
  let actor;
  try {
    actor = await resolveVerifiedAccountActor();
  } catch (error) {
    if (error instanceof VerifiedAccountResolutionError) {
      const parsedReturn = new URL(returnPath ?? `${prefix}/nap-la`, "https://lasoviet.net");
      const returnTarget = parsedReturn.origin === "https://lasoviet.net" ? `${parsedReturn.pathname}${parsedReturn.search}` : `${prefix}/nap-la`;
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
    }>("/commerce/wallet/top-up-orders", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ packId: pack, locale, ...(continuation ? { continuation } : {}) }),
    });
  } catch (error) {
    if (error instanceof PrivateApiClientError) {
      throw new Error("TOP_UP_ORDER_FAILED");
    }
    throw error;
  }

  if (!response.ok || response.value === undefined) {
    throw new Error("TOP_UP_ORDER_FAILED");
  }

  const parsed = safeParseCheckoutStatus(response.value);
  if (!parsed.ok) {
    throw new Error("TOP_UP_ORDER_FAILED");
  }

  await sendServerAnalyticsEvent({
    name: "checkout_created",
    idempotencyKey: `checkout-created:${parsed.value.order.id}`,
    occurredAt: parsed.value.order.createdAt,
    userId: actor.userId,
    requestId: actor.requestId,
    properties: {
      sku: pack,
      amount: parsed.value.order.amount,
      currency: parsed.value.order.currency,
    },
  });

  redirect(`${prefix}/thanh-toan/${encodeURIComponent(parsed.value.order.id)}`);
}

export async function createTopUpOrderFormAction(
  formData: FormData,
): Promise<void> {
  "use server";
  const packId = String(formData.get("packId") ?? "");
  const locale = String(formData.get("locale") ?? "vi");
  const returnPath = formData.get("returnPath");
  const serialized = formData.get("continuation");
  const continuation = typeof serialized === "string" && serialized ? WalletTopUpContinuationRequestV1Schema.parse(JSON.parse(serialized)) : undefined;
  await createTopUpOrder(
    packId,
    locale,
    typeof returnPath === "string" && returnPath.length > 0 ? returnPath : undefined,
    continuation,
  );
}
