"use server";

import { createZiweiChartCalculation } from "./calculate-ziwei-chart";

export async function calculateZiweiChart(revisionId: string) {
  const [{ privateApiClient }, { resolveCurrentActor }] = await Promise.all([
    import("../../api/private-api-client"),
    import("../../auth/resolve-current-actor"),
  ]);
  return createZiweiChartCalculation({
    resolveCurrentActor,
    privateApiClient,
  })(revisionId);
}

// Bound to the page locale (`.bind(null, locale)`) so a chart-ready gift request uses the reader's language.
export async function calculateZiweiChartInLocale(locale: "vi" | "en", revisionId: string) {
  const [{ privateApiClient }, { resolveCurrentActor }] = await Promise.all([
    import("../../api/private-api-client"),
    import("../../auth/resolve-current-actor"),
  ]);
  return createZiweiChartCalculation({ resolveCurrentActor, privateApiClient })(revisionId, locale === "en" ? "en" : "vi");
}

export async function loadZiweiEvidence(chartId: string, evidenceId: string) {
  const { loadZiweiChart } = await import("./load-ziwei-chart");
  return loadZiweiChart.loadEvidence(chartId, evidenceId);
}
