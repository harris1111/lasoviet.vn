import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { resolveFreeResultSource } from "./free-result-source-resolver";

describe("authorized structural result source", () => {
  it("allowlists concern metadata and never upstream prose or authored state", () => {
    const result = resolveFreeResultSource({ chartId: "c", chartVersionId: "v", preview: { chartId: "c", chartVersionId: "v", topConcern: "career", description: "PRIVATE_PROSE", state: "read", prompt: "PRIVATE_PROMPT" } });
    expect(result).toEqual({ sourceKind: "structural", topConcern: "career" });
    expect(JSON.stringify(result)).not.toContain("PRIVATE");
  });
  it.each([null, {}, { chartId: "other", chartVersionId: "v", topConcern: "career" }, { chartId: "c", chartVersionId: "stale", topConcern: "career" }, { chartId: "c", chartVersionId: "v", topConcern: "private text" }])("degrades missing/rejected/stale source to structural fallback", (preview) => {
    expect(resolveFreeResultSource({ chartId: "c", chartVersionId: "v", preview })).toEqual({ sourceKind: "structural" });
  });
});
