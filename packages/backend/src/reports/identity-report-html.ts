import type { IdentityReportV1 } from "@lasoviet/contracts";

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const HEADINGS = {
  vi: {
    reportTitle: "Báo Cáo Nhận Thức Bản Thân Tử Vi",
    reflectionQuestions: "Câu Hỏi Tự Chiêm Nghiệm",
    summaryActions: "Gợi Ý Hành Động Trọng Tâm",
    disclaimer: "Tuyên Bố Miễn Trừ Trách Nhiệm",
    limitations: "Giới hạn nhận định:",
    suggestedActions: "Hành động gợi ý:",
  },
  en: {
    reportTitle: "Ziwei Identity & Self-Reflection Report",
    reflectionQuestions: "Questions For Reflection",
    summaryActions: "Key Suggested Actions",
    disclaimer: "Professional Advice Disclaimer",
    limitations: "Limitations:",
    suggestedActions: "Suggested actions:",
  },
} as const;

export function renderIdentityReportHtml(report: IdentityReportV1): string {
  const labels = HEADINGS[report.locale];

  const sectionsHtml = report.sections
    .map((section) => {
      const claimsHtml = section.claims
        .map((claim) => {
          const limitationsHtml = claim.limitations
            .map((limitation) => `<li>${escapeHtml(limitation)}</li>`)
            .join("");
          const actionsHtml = claim.suggestedActions
            .map((action) => `<li>${escapeHtml(action.text)}</li>`)
            .join("");

          const limitationsSection = claim.limitations.length > 0
            ? `<div class="claim-limitations"><p class="claim-label">${escapeHtml(labels.limitations)}</p><ul>${limitationsHtml}</ul></div>`
            : "";
          const actionsSection = claim.suggestedActions.length > 0
            ? `<div class="claim-actions"><p class="claim-label">${escapeHtml(labels.suggestedActions)}</p><ul>${actionsHtml}</ul></div>`
            : "";

          return `<article class="claim"><p class="claim-text">${escapeHtml(claim.text)}</p>${limitationsSection}${actionsSection}</article>`;
        })
        .join("");

      return `<section class="report-section" id="section-${escapeHtml(section.id)}"><h2>${escapeHtml(section.title)}</h2><p class="section-narrative">${escapeHtml(section.narrative)}</p>${claimsHtml}</section>`;
    })
    .join("");

  const questionsHtml = report.reflectionQuestions
    .map((question) => `<li>${escapeHtml(question)}</li>`)
    .join("");

  const actionsHtml = report.summaryActions
    .map((action) => `<li>${escapeHtml(action)}</li>`)
    .join("");

  const disclaimerHtml = `<aside class="report-disclaimer"><h2>${escapeHtml(labels.disclaimer)}</h2><p>${escapeHtml(report.professionalAdviceDisclaimer)}</p></aside>`;

  return `<!DOCTYPE html><html lang="${report.locale}"><head><meta charset="UTF-8"><title>${escapeHtml(labels.reportTitle)}</title></head><body><main class="identity-report"><h1>${escapeHtml(labels.reportTitle)}</h1>${sectionsHtml}<section class="reflection-questions"><h2>${escapeHtml(labels.reflectionQuestions)}</h2><ul>${questionsHtml}</ul></section><section class="summary-actions"><h2>${escapeHtml(labels.summaryActions)}</h2><ul>${actionsHtml}</ul></section>${disclaimerHtml}</main></body></html>`;
}
