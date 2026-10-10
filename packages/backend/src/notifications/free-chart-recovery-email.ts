import { FreeChartRecoverySourceV1Schema, UnsubscribeTokenClaimsSchema, type FreeChartRecoverySourceV1 } from "@lasoviet/contracts";
import { generateUnsubscribeToken } from "./notification-preference.js";

function escapeHtml(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;").replaceAll("'", "&#39;");
}

/** Private capture template only. A source DTO alone never establishes displayed authority. */
export function renderFreeChartRecoveryEmail(input: {
  source: FreeChartRecoverySourceV1; email: string; tokenSecret: string; now: Date;
}) {
  const source = FreeChartRecoverySourceV1Schema.parse(input.source);
  const claims = UnsubscribeTokenClaimsSchema.parse({ userId: source.userId, email: input.email.trim().toLowerCase(), timestamp: input.now.getTime() });
  const origin = "https://lasoviet.net", prefix = source.locale === "en" ? "/en" : "";
  const teaserUrl = `${origin}${prefix}/la-so/${source.chartId}#${source.anchor}`;
  const query = new URLSearchParams({ offer: source.offerKey, palace: source.palaceId, utm_source: "followup" });
  const actionUrl = `${origin}${prefix}/la-so/${source.chartId}/chon-luan-giai?${query}`;
  const unsubscribeUrl = `${origin}/thong-bao/huy-dang-ky#token=${generateUnsubscribeToken(
    { userId: claims.userId, email: claims.email }, input.tokenSecret, input.now,
  )}`;
  const vi = source.locale === "vi";
  const subject = vi ? "Xem lại lá số của bạn" : "Return to your chart";
  const intro = vi ? "Đây là đoạn gợi ý bạn đã xem trên lá số của mình:" : "Here is the teaser you viewed on your own chart:";
  const view = vi ? "Xem lại đoạn gợi ý" : "View this teaser again";
  const action = vi ? "Chọn luận giải cho lá số này" : "Choose a reading for this chart";
  const footer = vi ? "Bạn nhận email này vì đã đồng ý nhận gợi ý từ Lá Số Việt." : "You received this email because you opted in to offers from La So Viet.";
  const unsubscribe = vi ? "Hủy nhận email gợi ý" : "Unsubscribe from offer emails";
  return { subject, teaserUrl, actionUrl, unsubscribeUrl,
    text: `${intro}\n\n${source.teaserText}\n\n${view}: ${teaserUrl}\n${action}: ${actionUrl}\n\n${footer}\n${unsubscribe}: ${unsubscribeUrl}`,
    html: `<p>${escapeHtml(intro)}</p><blockquote>${escapeHtml(source.teaserText)}</blockquote><p><a href="${escapeHtml(teaserUrl)}">${view}</a></p><p><a href="${escapeHtml(actionUrl)}">${action}</a></p><p>${footer}<br><a href="${escapeHtml(unsubscribeUrl)}">${unsubscribe}</a></p>`,
  };
}
