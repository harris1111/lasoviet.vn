import {
  findLaProduct,
  UnsubscribeTokenClaimsSchema,
  WalletTopUpCatalogV1,
} from "@lasoviet/contracts";

import { generateUnsubscribeToken } from "./notification-preference.js";

export type PendingTopUpRecoveryEmailInput = {
  userId: string;
  email: string;
  orderId: string;
  deliveryId: string;
  locale: "vi" | "en";
  productSku: string;
  amountLa: number;
  topUpSku: string;
  topUpVnd: number;
  tokenSecret: string;
  now: Date;
};

export type PendingTopUpRecoveryEmail = {
  actionUrl: string;
  unsubscribeUrl: string;
  subject: string;
  text: string;
  html: string;
};

const CANONICAL_ORIGIN = "https://lasoviet.net";
const SAFE_ORDER_ID = /^[A-Za-z0-9_-]{1,128}$/;
const DELIVERY_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function escapeHtml(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");
}

/** Renders a private preview only; current delivery eligibility is checked separately. */
export function renderPendingTopUpRecoveryEmail(
  input: PendingTopUpRecoveryEmailInput,
): PendingTopUpRecoveryEmail {
  const product = findLaProduct(input.productSku);
  const pack = WalletTopUpCatalogV1.find(item => item.id === input.topUpSku);
  // Private callers validate the frozen purchase; previews also retain the closed historical base.
  const validPrice = input.productSku === "ZIWEI-IDENTITY-P0"
    ? [960, 1200].includes(input.amountLa) : input.amountLa === product?.priceLa;
  const claims = UnsubscribeTokenClaimsSchema.safeParse({
    userId: input.userId,
    email: input.email.trim().toLowerCase(),
    timestamp: input.now.getTime(),
  });
  if ((input.locale !== "vi" && input.locale !== "en") ||
      !SAFE_ORDER_ID.test(input.orderId) || !DELIVERY_ID.test(input.deliveryId) ||
      !claims.success || !product || product.availability !== "active" ||
      !product.locales.includes(input.locale) || !validPrice ||
      !pack || input.topUpVnd !== pack.vndAmount) {
    throw new Error("RECOVERY_EMAIL_INPUT_INVALID");
  }

  const actionUrl = `${CANONICAL_ORIGIN}${input.locale === "en" ? "/en" : ""}/thanh-toan/${input.orderId}?utm_source=reminder#recovery=${input.deliveryId}`;
  const unsubscribeUrl = `${CANONICAL_ORIGIN}/thong-bao/huy-dang-ky#token=${generateUnsubscribeToken(
    { userId: claims.data.userId, email: claims.data.email }, input.tokenSecret, input.now,
  )}`;
  const title = product.name[input.locale];
  const amount = new Intl.NumberFormat(input.locale === "vi" ? "vi-VN" : "en-US")
    .format(input.topUpVnd);
  const vi = input.locale === "vi";
  const subject = vi ? "Đơn nạp Lá của bạn đang chờ" : "Your La top-up is pending";
  const intro = vi
    ? `Đơn nạp ${amount} VNĐ cho ${title} vẫn đang chờ. Bạn có thể tiếp tục đơn nạp đã tạo.`
    : `Your ${amount} VND top-up for ${title} is still pending. You can resume your existing order.`;
  const actionLabel = vi ? "Tiếp tục đơn nạp" : "Resume this top-up";
  const optional = vi
    ? "Nếu không cần nữa, bạn có thể bỏ qua email này."
    : "If you no longer need it, you can ignore this email.";
  const footer = vi
    ? "Bạn nhận email này vì đã đồng ý nhận gợi ý từ Lá Số Việt."
    : "You received this email because you opted in to offers from La So Viet.";
  const unsubscribeLabel = vi ? "Hủy nhận email gợi ý" : "Unsubscribe from offer emails";

  return {
    actionUrl,
    unsubscribeUrl,
    subject,
    text: `${intro}\n\n${actionLabel}: ${actionUrl}\n\n${optional}\n\n${footer}\n${unsubscribeLabel}: ${unsubscribeUrl}`,
    html: `<p>${escapeHtml(intro)}</p><p><a href="${escapeHtml(actionUrl)}">${actionLabel}</a></p><p>${optional}</p><p>${footer}<br><a href="${escapeHtml(unsubscribeUrl)}">${unsubscribeLabel}</a></p>`,
  };
}
