"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import type { ReportPeriodReadyViewV1 } from "@lasoviet/contracts";
import { PartFeedback } from "./part-feedback";
import { ReportNarrative } from "./report-narrative";

export function PeriodReportReader({ report }: { report: ReportPeriodReadyViewV1 }) {
  const t = useTranslations("reports");
  const content = report.content;
  return <main className="report-reader-root topic-report-reader" id="main">
    <header className="report-hero">
      <p>{t("periodReader.calendar")}</p><h1>{content.title}</h1>
      <nav className="topic-reader-tools" aria-label={t("topicReader.navigation")}>
        <Link href="/tai-khoan/bao-cao">{t("topicReader.library")}</Link>
        <button type="button" onClick={() => window.print()}>{t("topicReader.print")}</button>
      </nav>
    </header>
    <article className="report-content">
      <section className="report-section-block"><h2 className="report-section-title">{t("periodReader.overview")}</h2><ReportNarrative text={content.overview.narrative} /></section>
      <nav className="report-section-block" aria-label={t("periodReader.periods")}><ol>{content.periods.map((period, index) => <li key={index}><a href={`#period-${index}`}>{period.title}</a></li>)}</ol></nav>
      {content.periods.map((period, index) => <section className="report-section-block" id={`period-${index}`} key={index}>
        <h2 className="report-section-title">{period.title}</h2><ReportNarrative text={period.narrative} />
        <h3>{t("topicReader.actions")}</h3><ul>{period.recommendations.map((text, i) => <li key={i}>{text}</li>)}</ul>
        <h3>{t("periodReader.cautions")}</h3><ul>{period.cautions.map((text, i) => <li key={i}>{text}</li>)}</ul>
      </section>)}
      {report.chartId && <PartFeedback chartId={report.chartId} reportId={report.reportId} partId={report.sku} sku={report.sku} locale="vi" paid />}
    </article>
  </main>;
}
