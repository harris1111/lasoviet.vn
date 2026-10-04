"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { ziweiPresentation } from "../ziwei/ziwei-presentation";
import { computePalaceScores } from "./report-palace-score";
import type {
  ReportFailedViewV1,
  ReportFailedWalletSpendViewV2,
  ReportPendingViewV1,
} from "@lasoviet/contracts";

export type ReportProgressProps = {
  locale: "vi" | "en";
  view: ReportPendingViewV1 | ReportFailedViewV1 | ReportFailedWalletSpendViewV2;
};

export function formatReportTimestamp(
  dateStr: string,
  locale: "vi" | "en",
): string {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Ho_Chi_Minh",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).formatToParts(d);

    const find = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
    const day = find("day");
    const month = find("month");
    const year = find("year");
    const hour = find("hour");
    const minute = find("minute");

    if (locale === "vi") {
      return `${hour}:${minute} ${day}/${month}/${year}`;
    }
    return `${year}-${month}-${day} ${hour}:${minute}`;
  } catch {
    return dateStr;
  }
}

export function buildSupportMailto(
  view: ReportFailedViewV1,
  locale: "vi" | "en",
): string {
  const paymentTime = formatReportTimestamp(view.paymentReceivedAt, locale);
  const statusTime = formatReportTimestamp(view.reportStatusUpdatedAt, locale);
  const body = locale === "vi"
    ? `Mã hoá đơn: ${view.invoiceNumber}\nMã tham chiếu hỗ trợ: ${view.supportReference}\nThời điểm nhận thanh toán: ${paymentTime}\nThời điểm cập nhật trạng thái: ${statusTime}\n\n[Mô tả thêm yêu cầu của bạn tại đây]`
    : `Invoice: ${view.invoiceNumber}\nSupport reference: ${view.supportReference}\nPayment received at: ${paymentTime}\nStatus updated at: ${statusTime}\n\n[Describe your request here]`;

  return `mailto:${view.supportEmail}?subject=${encodeURIComponent(view.supportSubject)}&body=${encodeURIComponent(body)}`;
}

export function ReportProgress({ locale, view }: ReportProgressProps) {
  const router = useRouter();
  const t = useTranslations("reports");
  const isVi = locale === "vi";

  useEffect(() => {
    if (view.state !== "pending") {
      return;
    }

    const refreshAfterMs = view.refreshAfterMs;
    let timer: ReturnType<typeof setTimeout> | undefined;
    function schedule() {
      clearTimeout(timer);
      if (document.visibilityState === "hidden") return;
      timer = setTimeout(() => {
        router.refresh();
        schedule();
      }, refreshAfterMs);
    }
    function onVisibilityChange() {
      clearTimeout(timer);
      if (document.visibilityState !== "hidden") {
        router.refresh();
        schedule();
      }
    }
    schedule();
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [view, router]);

  if (view.version === 2) {
    return <main className="topic-page report-recovery-page" data-light-ready>
      <section className="container paid-topic-selector">
        <div role="alert" className="report-progress-card report-progress-failed">
          <p className="eyebrow">{t("progress.failed_eyebrow")}</p>
          <h1>{t("progress.failed_title")}</h1>
          <p>{t("progress.wallet_failure_description")}</p>
          <p>{t("progress.support_reference_label")}: <strong>{view.supportReference}</strong></p>
          <div className="report-progress-actions">
            <Link className="button button-primary" href={`${isVi ? "" : "/en"}/lien-he`}>{t("progress.support_action")}</Link>
            <Link className="button button-secondary" href={`${isVi ? "" : "/en"}/tai-khoan/bao-cao`}>{t("progress.library_action")}</Link>
          </div>
        </div>
      </section>
    </main>;
  }

  if (view.state === "failed") {
    const paymentTime = formatReportTimestamp(view.paymentReceivedAt, locale);
    const statusTime = formatReportTimestamp(view.reportStatusUpdatedAt, locale);
    const supportMailto = buildSupportMailto(view, locale);
    const ordersPath = isVi ? "/tai-khoan/don-hang" : "/en/tai-khoan/don-hang";

    return (
      <main className="topic-page report-recovery-page" data-light-ready>
        <section className="container paid-topic-selector">
          <div role="alert" className="report-progress-card report-progress-failed">
            <p className="eyebrow">{t("progress.failed_eyebrow")}</p>
            <h1>{t("progress.failed_title")}</h1>

            <div className="report-progress-notice payment-confirmed-notice">
              <p className="notice-highlight">{t("progress.payment_received_confirmation")}</p>
              <p className="report-progress-message">{t("progress.failed_description")}</p>
            </div>

            <dl className="report-failed-facts">
              <div className="report-fact-item">
                <dt>{t("progress.invoice_number_label")}</dt>
                <dd><span>{view.invoiceNumber}</span></dd>
              </div>
              <div className="report-fact-item">
                <dt>{t("progress.payment_received_at_label")}</dt>
                <dd><time dateTime={view.paymentReceivedAt}>{paymentTime}</time></dd>
              </div>
              <div className="report-fact-item">
                <dt>{t("progress.status_updated_at_label")}</dt>
                <dd><time dateTime={view.reportStatusUpdatedAt}>{statusTime}</time></dd>
              </div>
              <div className="report-fact-item">
                <dt>{t("progress.support_reference_label")}</dt>
                <dd><span>{view.supportReference}</span></dd>
              </div>
            </dl>

            <div className="report-failed-next-step">
              <h2 className="next-step-title">{t("progress.next_step_title")}</h2>
              <p className="next-step-description">{t("progress.next_step_description")}</p>
            </div>

            <div className="report-progress-actions">
              <a
                className="button button-primary"
                href={supportMailto}
              >
                {t("progress.support_action")}
              </a>
              <Link
                className="button button-secondary"
                href={ordersPath}
              >
                {t("progress.view_orders_action")}
              </Link>
            </div>
          </div>
        </section>
      </main>
    );
  }

  const statusKey = `progress.status_${view.fulfillmentStatus}` as const;
  const statusLabel = t(statusKey);
  const libraryPath = isVi ? "/tai-khoan/bao-cao" : "/en/tai-khoan/bao-cao";

  return (
    <main className="topic-page report-progress-page" data-light-ready>
      <section className="container paid-topic-selector">
        <div role="status" aria-live="polite" className="report-progress-card report-progress-pending">
          <p className="eyebrow">{t("progress.pending_eyebrow")}</p>
          <h1>{t("progress.pending_title")}</h1>

          <div className="report-progress-notice payment-confirmed-notice">
            <p className="notice-highlight">{t(view.purchaseSource === "wallet_spend" ? "progress.wallet_unlock_confirmation" : "progress.payment_received_confirmation")}</p>
            <p className="report-progress-status">{statusLabel}</p>
            <p className="report-progress-message">{t("progress.pending_description")}</p>
          </div>

          <div className="report-progress-indicator" aria-hidden="true">
            <span className="report-progress-spinner" />
          </div>

          <div className="report-progress-actions">
            <Link
              className="button button-secondary"
              href={libraryPath}
            >
              {t("progress.library_action")}
            </Link>
          </div>
        </div>
        {view.chartSnapshot && <WaitingChartFacts locale={locale} snapshot={view.chartSnapshot} />}
      </section>
    </main>
  );
}

function WaitingChartFacts({locale, snapshot}: {locale: "vi" | "en"; snapshot: NonNullable<ReportPendingViewV1["chartSnapshot"]>}) {
  const t = useTranslations("reports");
  const labels = ziweiPresentation(locale, {strict: false});
  const scores = computePalaceScores(snapshot);
  return <section aria-labelledby="waiting-facts-title" className="report-progress-card report-waiting-facts" data-testid="waiting-chart-facts">
    <h2 id="waiting-facts-title">{t("progress.facts_title")}</h2>
    <p>{t("progress.facts_description")}</p>
    <div className="report-waiting-palaces">{snapshot.palaces.map(palace => <article key={palace.palaceId}>
      <h3>{labels.palace(palace.palaceId)}</h3>
      <p>{t("progress.structural_score", {score: scores.get(palace.palaceId)?.score ?? 50})}</p>
      <ul>{palace.stars.filter(star => star.kind === "main").map(star => <li key={star.starId}>{labels.star(star.starId)}{star.brightnessId ? ` · ${labels.brightness(star.brightnessId)}` : ""}{star.transformationId ? ` · ${labels.transformation(star.transformationId)}` : ""}</li>)}</ul>
    </article>)}</div>
  </section>;
}
