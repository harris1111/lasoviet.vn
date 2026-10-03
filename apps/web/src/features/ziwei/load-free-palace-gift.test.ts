import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { createFreePalaceGiftLoader } from "./load-free-palace-gift";

const input = { chartId: "chart-1", chartVersionId: "chart-version-1", locale: "vi" as const };
const point = (text: string) => ({ text, evidenceKeys: ["fact:one"] });
const ready = (over: Record<string, unknown> = {}) => ({
  version: 1, status: "ready", requestId: "123e4567-e89b-42d3-a456-426614174000", chartVersionId: "chart-version-1", palaceId: "ziwei.palace.life",
  locale: "vi", sourceKind: "validated_artifact", contentHash: "a".repeat(64),
  reading: { palaceId: "ziwei.palace.life", title: "t", conclusion: "c", keyPoints: [point("a"), point("b"), point("c")], narrative: "n", do: [point("d")], avoid: [point("e")], evidenceKeys: ["fact:one"] },
  facts: [{ key: "fact:one", label: "L", value: "V" }], ...over,
});

function loader(response: unknown | (() => never)) {
  const request = vi.fn(async () => { if (typeof response === "function") return (response as () => never)(); return response; });
  const privateApiClient = vi.fn().mockReturnValue({ request });
  const subject = createFreePalaceGiftLoader({
    resolveCurrentActor: vi.fn().mockResolvedValue({ kind: "account", userId: "u", sessionId: "s", requestId: "r" }), privateApiClient,
  });
  return { subject, request };
}

describe("free palace gift web loader", () => {
  it("returns a strictly validated ready gift for the same chart version and locale", async () => {
    const { subject, request } = loader({ ok: true, value: ready() });
    expect(await subject.load(input)).toMatchObject({ status: "ready", palaceId: "ziwei.palace.life" });
    expect(request).toHaveBeenCalledWith("/ziwei/charts/chart-1/free-palace?locale=vi");
  });

  it("passes through the non-ready statuses so the page can show an honest fallback", async () => {
    for (const status of ["requested", "generating", "unavailable", "budget_exhausted", "terminal_failure", "cost_unknown"]) {
      expect(await loader({ ok: true, value: { version: 1, status } }).subject.load(input)).toEqual({ version: 1, status });
    }
  });

  it("row 48: rejects an unsupported version, unknown status or smuggled operational field", async () => {
    for (const value of [
      { version: 2, status: "ready" }, { version: 1, status: "teapot" }, { version: 1, status: "unavailable", model: "gpt" },
      ready({ serializedPrompt: "secret" }), ready({ sourceKind: "model_free_text" }), ready({ facts: [] }),
      ready({ reading: { ...ready().reading, evidenceKeys: ["fact:missing"] } }),
    ]) {
      expect(await loader({ ok: true, value }).subject.load(input)).toBeNull();
    }
  });

  it("never exposes a gift for another chart version or locale", async () => {
    expect(await loader({ ok: true, value: ready({ chartVersionId: "someone-elses" }) }).subject.load(input)).toBeNull();
    expect(await loader({ ok: true, value: ready({ locale: "en" }) }).subject.load(input)).toBeNull();
  });

  it("degrades to null on error envelopes, malformed bodies and backend failure, without throwing", async () => {
    expect(await loader({ ok: false, error: { code: "CHART_NOT_FOUND", messageKey: "k", retryable: false } }).subject.load(input)).toBeNull();
    expect(await loader("<html>").subject.load(input)).toBeNull();
    expect(await loader(null).subject.load(input)).toBeNull();
    expect(await loader(() => { throw new Error("PRIVATE_API_UNREACHABLE"); }).subject.load(input)).toBeNull();
  });
});
