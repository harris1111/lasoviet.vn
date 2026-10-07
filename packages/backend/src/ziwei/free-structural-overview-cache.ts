import { createHash } from "node:crypto";
import { FreeStructuralOverviewCacheV1Schema as CacheSchema, type FreeStructuralOverviewCacheV1, type NormalizedZiweiChartV1 } from "@lasoviet/contracts";
import { compileFreeStructuralOverview, FREE_OVERVIEW_RENDERER_VERSION } from "./free-structural-overview.js";
function canonical(value: unknown): string {
    if (Array.isArray(value))
        return `[${value.map(canonical).join(",")}]`;
    if (value !== null && typeof value === "object")
        return `{${Object.entries(value).filter(([, v]) => v !== undefined).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${JSON.stringify(k)}:${canonical(v)}`).join(",")}}`;
    return JSON.stringify(value) ?? "null";
}
const hash = (value: unknown) => createHash("sha256").update(canonical(value)).digest("hex");
function sourceHash(chart: NormalizedZiweiChartV1): string {
    return hash({ palaces: chart.palaces, soulPalaceId: chart.soulPalaceId, bodyPalaceId: chart.bodyPalaceId, transformations: chart.transformations, warnings: chart.warnings, provisional: chart.provisional });
}
export function createFreeOverviewCache(chart: NormalizedZiweiChartV1): Record<string, unknown> {
    const documents = { vi: compileFreeStructuralOverview(chart, "vi"), en: compileFreeStructuralOverview(chart, "en") };
    return CacheSchema.parse({ version: 1, rendererVersion: FREE_OVERVIEW_RENDERER_VERSION, sourceHash: sourceHash(chart), contentHash: hash(documents), documents });
}
// Call only after chart authorization. Legacy/invalid caches use the pure compiler, never a write or provider.
export function readFreeOverviewDocuments(chart: NormalizedZiweiChartV1, cache: unknown) {
    const parsed = CacheSchema.safeParse(cache);
    if (parsed.success && parsed.data.rendererVersion === FREE_OVERVIEW_RENDERER_VERSION && parsed.data.sourceHash === sourceHash(chart) && parsed.data.contentHash === hash(parsed.data.documents))
        return parsed.data.documents;
    return createFreeOverviewCache(chart).documents as FreeStructuralOverviewCacheV1["documents"];
}
