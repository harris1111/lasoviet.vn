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

export async function loadZiweiEvidence(chartId: string, evidenceId: string) {
  const { loadZiweiChart } = await import("./load-ziwei-chart");
  return loadZiweiChart.loadEvidence(chartId, evidenceId);
}
