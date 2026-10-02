import "server-only";
import { TopConcernV1Schema, type TopConcernV1 } from "@lasoviet/contracts";

export type FreeResultStructuralSource = { sourceKind: "structural"; topConcern?: TopConcernV1 };
// The caller must first authorize the current chart/owner/TTL. This resolver
// intentionally has no generated branch until a validated gift reader exists.
export function resolveFreeResultSource(input: { chartId: string; chartVersionId: string; preview: unknown }): FreeResultStructuralSource {
  if (!input.preview || typeof input.preview !== "object" || Array.isArray(input.preview)) return { sourceKind: "structural" };
  const preview = input.preview as Record<string, unknown>;
  if (preview.chartId !== input.chartId || preview.chartVersionId !== input.chartVersionId) return { sourceKind: "structural" };
  const concern = TopConcernV1Schema.safeParse(preview.topConcern);
  return concern.success ? { sourceKind: "structural", topConcern: concern.data } : { sourceKind: "structural" };
}
