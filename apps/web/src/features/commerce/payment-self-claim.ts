"use server";

import { redirect } from "next/navigation";
import {
  PaymentSelfClaimRequestV1Schema,
  PaymentSelfClaimSuccessV1Schema,
  type PaymentSelfClaimRequestV1,
} from "@lasoviet/contracts";

import {
  privateApiClient,
  PrivateApiClientError,
} from "../../api/private-api-client";
import {
  VerifiedAccountResolutionError,
  resolveVerifiedAccountActor,
} from "../../auth/resolve-current-actor";

export type PaymentSelfClaimStatus =
  | "idle"
  | "invalid_input"
  | "payment_not_found"
  | "rate_limited"
  | "service_unavailable";

export type PaymentSelfClaimState = {
  status: PaymentSelfClaimStatus;
  code?: PaymentSelfClaimStatus;
  message?: string;
};

export const INITIAL_PAYMENT_SELF_CLAIM_STATE: PaymentSelfClaimState = {
  status: "idle",
};

function parseAmount(raw: unknown): number | null {
  if (typeof raw === "number") {
    return Number.isInteger(raw) && raw > 0 ? raw : null;
  }
  if (typeof raw !== "string") return null;
  const cleaned = raw.replace(/[\s,\.]/g, "");
  if (!/^\d+$/.test(cleaned)) return null;
  const num = Number(cleaned);
  return Number.isSafeInteger(num) && num > 0 ? num : null;
}

function parseTransferredAtLocal(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  return trimmed;
}

function isNextRedirect(error: unknown): boolean {
  if (typeof error === "object" && error !== null) {
    if ("digest" in error && typeof (error as { digest: unknown }).digest === "string") {
      return (error as { digest: string }).digest.startsWith("NEXT_REDIRECT");
    }
    if ("message" in error && (error as { message: unknown }).message === "NEXT_REDIRECT") {
      return true;
    }
  }
  return false;
}

export async function submitPaymentSelfClaim(
  arg1: PaymentSelfClaimState | FormData,
  arg2?: FormData,
): Promise<PaymentSelfClaimState> {
  const formData = arg1 instanceof FormData ? arg1 : (arg2 ?? new FormData());

  const rawLocale = formData.get("locale");
  const locale: "vi" | "en" = rawLocale === "en" ? "en" : "vi";
  const prefix = locale === "en" ? "/en" : "";

  const orderId =
    typeof formData.get("orderId") === "string"
      ? (formData.get("orderId") as string).trim()
      : "";
  const callbackUrl = orderId
    ? `${prefix}/thanh-toan/${encodeURIComponent(orderId)}`
    : `${prefix}/thanh-toan`;

  const rawAmount = formData.get("amount");
  const rawTime = formData.get("transferredAtLocal");

  const amount = parseAmount(rawAmount);
  const transferredAtLocal = parseTransferredAtLocal(rawTime);

  if (amount === null || transferredAtLocal === null) {
    return {
      status: "invalid_input",
      code: "invalid_input",
    };
  }

  const validation = PaymentSelfClaimRequestV1Schema.safeParse({
    amount,
    transferredAtLocal,
  });

  if (!validation.success) {
    return {
      status: "invalid_input",
      code: "invalid_input",
    };
  }

  let actor;
  try {
    actor = await resolveVerifiedAccountActor();
  } catch (error) {
    if (error instanceof VerifiedAccountResolutionError) {
      return redirect(
        `${prefix}/dang-nhap?callbackURL=${encodeURIComponent(callbackUrl)}`,
      );
    }
    throw error;
  }

  let response;
  try {
    const payload: PaymentSelfClaimRequestV1 = {
      amount: validation.data.amount,
      transferredAtLocal: validation.data.transferredAtLocal,
    };
    response = await privateApiClient(actor, actor.requestId).request<{
      ok: boolean;
      value?: unknown;
    }>("/commerce/payments/self-claim", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch (error) {
    if (isNextRedirect(error)) throw error;

    if (error instanceof PrivateApiClientError) {
      switch (error.code) {
        case "PAYMENT_CLAIM_NOT_FOUND":
          return { status: "payment_not_found", code: "payment_not_found" };
        case "PAYMENT_CLAIM_RATE_LIMITED":
          return { status: "rate_limited", code: "rate_limited" };
        case "PAYMENT_CLAIM_INVALID":
          return { status: "invalid_input", code: "invalid_input" };
        case "PAYMENT_CLAIM_ACCOUNT_REQUIRED":
        case "PAYMENT_CLAIM_EMAIL_VERIFICATION_REQUIRED":
          return redirect(
            `${prefix}/dang-nhap?callbackURL=${encodeURIComponent(callbackUrl)}`,
          );
        default:
          return {
            status: "service_unavailable",
            code: "service_unavailable",
          };
      }
    }
    return { status: "service_unavailable", code: "service_unavailable" };
  }

  if (!response?.ok || response.value === undefined) {
    return { status: "service_unavailable", code: "service_unavailable" };
  }

  const parsedSuccess = PaymentSelfClaimSuccessV1Schema.safeParse(
    response.value,
  );
  if (!parsedSuccess.success) {
    return { status: "service_unavailable", code: "service_unavailable" };
  }

  redirect(
    `${prefix}/bao-cao/${encodeURIComponent(parsedSuccess.data.reportId)}`,
  );
}
