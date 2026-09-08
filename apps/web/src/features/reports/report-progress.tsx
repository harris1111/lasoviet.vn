"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import type {
  ReportFailedViewV1,
  ReportPendingViewV1,
} from "@lasoviet/contracts";

export type ReportProgressProps = {
  locale: "vi" | "en";
  view: ReportPendingViewV1 | ReportFailedViewV1;
};

export function ReportProgress({ locale: _locale, view }: ReportProgressProps) {
  const router = useRouter();
  const t = useTranslations("reports");

  useEffect(() => {
    if (view.state !== "pending") {
      return;
    }

    const timer = setTimeout(() => {
      router.refresh();
    }, view.refreshAfterMs);

    return () => {
      clearTimeout(timer);
    };
  }, [view, router]);

  if (view.state === "failed") {
    return (
      <main className="topic-page">
        <section className="container paid-topic-selector">
          <div role="alert" className="report-progress-card report-progress-failed">
            <p className="eyebrow">{t("progress.failed_title")}</p>
            <h1>{t("progress.failed_title")}</h1>
            <p className="report-progress-message">{t("progress.failed_description")}</p>
            <div className="report-progress-actions">
              <a
                className="button button-secondary"
                href="mailto:support@lasoviet.vn"
              >
                {t("progress.support_action")}
              </a>
            </div>
          </div>
        </section>
      </main>
    );
  }

  const statusKey = `progress.status_${view.fulfillmentStatus}` as const;
  const statusLabel = t(statusKey);

  return (
    <main className="topic-page">
      <section className="container paid-topic-selector">
        <div role="status" aria-live="polite" className="report-progress-card report-progress-pending">
          <p className="eyebrow">{t("progress.pending_title")}</p>
          <h1>{t("progress.pending_title")}</h1>
          <p className="report-progress-status">{statusLabel}</p>
          <p className="report-progress-message">{t("progress.pending_description")}</p>
          <div className="report-progress-indicator" aria-hidden="true">
            <span className="report-progress-spinner" />
          </div>
        </div>
      </section>
    </main>
  );
}
