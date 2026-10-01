"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import type { ReportTopicReadyViewV1 } from "@lasoviet/contracts";
import { PartFeedback } from "./part-feedback";
import { ReportNarrative } from "./report-narrative";

export function TopicReportReader({ report }: { report: ReportTopicReadyViewV1 }) {
  const t = useTranslations("reports");
  const content = report.content;
  const sections = [content.overview, ...content.palaceAnchors, ...content.thematicDimensions, content.decadalTiming];
  return <main className="report-reader-root topic-report-reader" id="main">
    <header className="report-hero">
      <p>{t("topicReader.eyebrow")}</p>
      <h1>{content.title}</h1>
      <nav className="topic-reader-tools" aria-label={t("topicReader.navigation")}>
        <Link href="/tai-khoan/bao-cao">{t("topicReader.library")}</Link>
        <button type="button" onClick={() => window.print()}>{t("topicReader.print")}</button>
      </nav>
    </header>
    <article className="report-content">
      {sections.map((section, index) => <section className="report-section-block" key={index}>
        <h2 className="report-section-title">{section.title}</h2>
        <ReportNarrative text={section.narrative} />
      </section>)}
      <section className="report-section-block">
        <h2 className="report-section-title">{t("topicReader.actions")}</h2>
        <ol className="report-action-cards">{content.actions.map((action, index) => <li className="report-action-card" key={index}>
          <h3 className="report-action-title">{action.recommendation}</h3>
          <p>{action.rationale}</p>
          <p><strong>{t("topicReader.avoid")}</strong> {action.avoid}</p>
        </li>)}</ol>
      </section>
      {report.chartId && <PartFeedback chartId={report.chartId} reportId={report.reportId} partId={report.sku} sku={report.sku} locale="vi" paid />}
    </article>
  </main>;
}
