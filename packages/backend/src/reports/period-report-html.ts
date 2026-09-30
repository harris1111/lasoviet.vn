import type { ZiweiPeriodReadingContentV1 } from "@lasoviet/contracts";

const escapeHtml = (value: string) => value.replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]!);
export function renderPeriodReportHtml(content: ZiweiPeriodReadingContentV1): string {
  return `<!doctype html><html lang="vi"><head><meta charset="utf-8"><title>${escapeHtml(content.title)}</title></head><body><main><h1>${escapeHtml(content.title)}</h1><p>${escapeHtml(content.overview.narrative)}</p>${content.periods.map(period => `<section><h2>${escapeHtml(period.title)}</h2><p>${escapeHtml(period.narrative)}</p><h3>Gợi ý thực tế</h3><ul>${period.recommendations.map(text => `<li>${escapeHtml(text)}</li>`).join("")}</ul><h3>Điều nên lưu ý</h3><ul>${period.cautions.map(text => `<li>${escapeHtml(text)}</li>`).join("")}</ul></section>`).join("")}</main></body></html>`;
}
