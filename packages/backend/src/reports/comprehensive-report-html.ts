import type {
  ComprehensiveReportPublicContentV1,
  ZiweiComprehensiveReportContentV1,
  ZiweiComprehensiveReportContentV2,
  ZiweiComprehensiveReportContentV3,
} from "@lasoviet/contracts";

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export const COMPREHENSIVE_REPORT_HTML_TITLE = "Báo Cáo Luận Giải Toàn Diện Tử Vi";

export type ComprehensiveReportInput =
  | ZiweiComprehensiveReportContentV1
  | ComprehensiveReportPublicContentV1
  | ZiweiComprehensiveReportContentV2
  | ZiweiComprehensiveReportContentV3;

export function renderComprehensiveZiweiHtml(report: ComprehensiveReportInput): string {
  const overviewHtml = `<section class="report-overview"><h2>${escapeHtml(report.overview.title)}</h2><p>${escapeHtml(report.overview.narrative)}</p></section>`;

  const coreAxisHtml = `<section class="report-core-axis"><h2>${escapeHtml(report.coreAxis.title)}</h2><p>${escapeHtml(report.coreAxis.narrative)}</p></section>`;

  const configsArticles = report.keyConfigurations
    .map(
      (config) =>
        `<article class="key-configuration"><h3>${escapeHtml(config.title)}</h3><p>${escapeHtml(config.narrative)}</p></article>`,
    )
    .join("");
  const keyConfigsHtml = `<section class="report-key-configurations"><h2>Cấu Trúc Và Cách Cục Trọng Yếu</h2>${configsArticles}</section>`;

  const palacesArticles = report.palaceReadings
    .map(
      (palace) =>
        `<article class="palace-reading" id="palace-${escapeHtml(palace.palaceId.replace("ziwei.palace.", ""))}"><h3>${escapeHtml(palace.title)}</h3><p>${escapeHtml(palace.narrative)}</p></article>`,
    )
    .join("");
  const palaceReadingsHtml = `<section class="report-palace-readings"><h2>Luận Giải Chi Tiết Mười Hai Cung</h2>${palacesArticles}</section>`;

  const themesArticles = report.thematicSynthesis
    .map(
      (theme) =>
        `<article class="thematic-synthesis" id="theme-${escapeHtml(theme.id)}"><h3>${escapeHtml(theme.title)}</h3><p>${escapeHtml(theme.narrative)}</p></article>`,
    )
    .join("");
  const thematicSynthesisHtml = `<section class="report-thematic-synthesis"><h2>Tổng Hợp Các Lĩnh Vực Đời Sống</h2>${themesArticles}</section>`;

  const strengthsTensionsHtml = `<section class="report-strengths-tensions"><h2>${escapeHtml(report.strengthsAndTensions.title)}</h2><p>${escapeHtml(report.strengthsAndTensions.narrative)}</p></section>`;

  const currentDecadalHtml =
    "currentDecadal" in report && report.currentDecadal
      ? `<section class="report-current-decadal"><h2>${escapeHtml(report.currentDecadal.title)}</h2><p>${escapeHtml(report.currentDecadal.narrative)}</p></section>`
      : "";

  const annualSnapshotHtml =
    "annualSnapshot" in report && report.annualSnapshot
      ? `<section class="report-annual-snapshot"><h2>${escapeHtml(report.annualSnapshot.title)}</h2><p>${escapeHtml(report.annualSnapshot.narrative)}</p></section>`
      : "";

  const birthTimeSensitivityHtml =
    "birthTimeSensitivity" in report && report.birthTimeSensitivity
      ? `<section class="report-birth-time-sensitivity"><h2>${escapeHtml(report.birthTimeSensitivity.title)}</h2><article class="birth-time-sensitivity-stable"><h3>${escapeHtml(report.birthTimeSensitivity.stableFactors.title)}</h3><p>${escapeHtml(report.birthTimeSensitivity.stableFactors.narrative)}</p></article><article class="birth-time-sensitivity-sensitive"><h3>${escapeHtml(report.birthTimeSensitivity.sensitiveFactors.title)}</h3><p>${escapeHtml(report.birthTimeSensitivity.sensitiveFactors.narrative)}</p></article></section>`
      : "";

  let practicalDirectionContent = "";
  if (Array.isArray(report.practicalDirection)) {
    if (typeof report.practicalDirection[0] === "string") {
      practicalDirectionContent = `<ul>${report.practicalDirection.map((item: any) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`;
    } else {
      practicalDirectionContent = report.practicalDirection
        .map(
          (item: any) =>
            `<article class="practical-action"><h4>Khuyến nghị</h4><p>${escapeHtml(item.recommendation)}</p><h4>Lý do</h4><p>${escapeHtml(item.rationale)}</p><h4>Nên tránh</h4><p>${escapeHtml(item.avoid)}</p></article>`,
        )
        .join("");
    }
  }
  const practicalDirectionHtml = practicalDirectionContent
    ? `<section class="report-practical-direction"><h2>Định Hướng Và Hành Động Thực Tế</h2>${practicalDirectionContent}</section>`
    : "";

  return (
    `<!DOCTYPE html><html lang="vi"><head><meta charset="UTF-8"><title>${escapeHtml(COMPREHENSIVE_REPORT_HTML_TITLE)}</title></head><body>` +
    `<main class="comprehensive-report">` +
    `<h1>${escapeHtml(COMPREHENSIVE_REPORT_HTML_TITLE)}</h1>` +
    `${overviewHtml}` +
    `${coreAxisHtml}` +
    `${keyConfigsHtml}` +
    `${palaceReadingsHtml}` +
    `${thematicSynthesisHtml}` +
    `${strengthsTensionsHtml}` +
    `${currentDecadalHtml}` +
    `${annualSnapshotHtml}` +
    `${birthTimeSensitivityHtml}` +
    `${practicalDirectionHtml}` +
    `</main></body></html>`
  );
}
