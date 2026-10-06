import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { reportLoader } from "../../../../features/reports/load-report";
import { ReportProgress } from "../../../../features/reports/report-progress";
import { PersonalDailyReadingPanel } from "../../../../features/ziwei/personal-daily-reading-panel";
import { ReportReader } from "../../../../features/reports/report-reader";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

function localizedReportPath(locale: "vi" | "en", reportId: string): string {
  return locale === "en" ? `/en/bao-cao/${reportId}` : `/bao-cao/${reportId}`;
}

function localizedSignInPath(locale: "vi" | "en", callbackURL: string): string {
  const prefix = locale === "en" ? "/en" : "";
  return `${prefix}/dang-nhap?callbackURL=${encodeURIComponent(callbackURL)}`;
}

export default async function ReportPage({
  params,
}: {
  params: Promise<{ locale: string; reportId: string }>;
}) {
  const { locale, reportId } = await params;
  if (locale !== "vi" && locale !== "en") {
    notFound();
  }

  const routeLocale = locale as "vi" | "en";
  const result = await reportLoader.loadReport(reportId);

  if (!result.ok) {
    if (result.error.code === "REPORT_AUTH_REQUIRED") {
      const currentPath = localizedReportPath(routeLocale, reportId);
      redirect(localizedSignInPath(routeLocale, currentPath));
    }
    notFound();
  }

  const reportView = result.value;

  // Persisted report locale is authoritative
  if (reportView.locale !== routeLocale) {
    redirect(localizedReportPath(reportView.locale, reportView.reportId));
  }

  if (reportView.state === "ready") {
    return <>
      <ReportReader locale={reportView.locale} report={reportView} />
      {reportView.chartId && reportView.chartVersionId && <PersonalDailyReadingPanel
        key={`${reportView.chartId}:${reportView.chartVersionId}`}
        chartId={reportView.chartId} chartVersionId={reportView.chartVersionId}
        locale={reportView.locale} includedOnly />}
    </>;
  }

  return <ReportProgress locale={reportView.locale} view={reportView} notificationEnabled={process.env.REPORT_READY_SUBSCRIPTION_MODE === "capture"} />;
}
