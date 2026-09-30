import type { ZiweiTopicDeepDiveContentV1 } from "@lasoviet/contracts";

const escapeHtml = (value: string) => value.replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]!);

export function renderTopicReportHtml(content: ZiweiTopicDeepDiveContentV1): string {
  const sections = [content.overview, ...content.palaceAnchors, ...content.thematicDimensions, content.decadalTiming];
  return `<!doctype html><html lang="vi"><head><meta charset="utf-8"><title>${escapeHtml(content.title)}</title></head><body><main><h1>${escapeHtml(content.title)}</h1>${sections.map(section => `<section><h2>${escapeHtml(section.title)}</h2>${section.narrative.split(/\n\s*\n/).map(paragraph => `<p>${escapeHtml(paragraph)}</p>`).join("")}</section>`).join("")}<section><h2>Hành động thực tế</h2><ol>${content.actions.map(action => `<li><h3>${escapeHtml(action.recommendation)}</h3><p>${escapeHtml(action.rationale)}</p><p>Nên tránh: ${escapeHtml(action.avoid)}</p></li>`).join("")}</ol></section></main></body></html>`;
}
