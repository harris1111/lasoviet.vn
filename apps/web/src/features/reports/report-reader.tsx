import type { IdentityReportV1 } from "@lasoviet/contracts";

export function ReportReader({
  locale,
  report,
}: {
  locale: "en" | "vi";
  report?: IdentityReportV1;
}) {
  if (report === undefined) {
    return (
      <main className="content-page">
        <section className="content-hero container">
          <p className="eyebrow">{locale === "vi" ? "Báo cáo riêng tư" : "Private report"}</p>
          <h1>{locale === "vi" ? "Báo cáo chưa khả dụng" : "Report unavailable"}</h1>
          <p>
            {locale === "vi"
              ? "Không có báo cáo đã lưu cho đường dẫn này."
              : "There is no saved report for this address."}
          </p>
        </section>
      </main>
    );
  }

  return (
    <main className="content-page">
      <article className="content-article container">
        <p className="eyebrow">{report.sku}</p>
        {report.sections.map((section) => (
          <section key={section.id}>
            <h1>{section.title}</h1>
            <p>{section.narrative}</p>
          </section>
        ))}
        <footer><p>{report.professionalAdviceDisclaimer}</p></footer>
      </article>
    </main>
  );
}
