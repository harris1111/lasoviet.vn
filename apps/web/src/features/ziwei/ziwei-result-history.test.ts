import { describe, expect, it } from "vitest";

import { readResultView, sameView, writeResultView } from "./ziwei-result-history";

function fakeHistory() {
  const calls: Array<{ kind: "push" | "replace"; state: unknown; url: string }> = [];
  return {
    calls,
    pushState: (state: unknown, _title: string, url?: string | URL | null) => { calls.push({ kind: "push", state, url: String(url) }); },
    replaceState: (state: unknown, _title: string, url?: string | URL | null) => { calls.push({ kind: "replace", state, url: String(url) }); },
  };
}

describe("free result local navigation (FE-3 / N7)", () => {
  it("keeps the ?tab=&open= convention when pushing a tab or a preview", () => {
    const history = fakeHistory();
    writeResultView(history, "/la-so/c1", { tab: "palaces", open: "wealth" });
    writeResultView(history, "/en/la-so/c1", { tab: "chart" });
    expect(history.calls.map((call) => call.url)).toEqual(["/la-so/c1?tab=palaces&open=wealth", "/en/la-so/c1"]);
    expect(history.calls.every((call) => call.kind === "push" && call.state === null)).toBe(true);
  });

  it("marks sheets without a URL so Back can close them, and does not change the address", () => {
    const history = fakeHistory();
    writeResultView(history, "/la-so/c1", { tab: "topics", sheet: "chart" });
    expect(history.calls[0]).toEqual({ kind: "push", state: { fd109Sheet: "chart" }, url: "/la-so/c1?tab=topics" });
  });

  it("replaces instead of pushing when asked (closing a sheet opened by a shared link)", () => {
    const history = fakeHistory();
    writeResultView(history, "/la-so/c1", { tab: "palaces" }, "replace");
    expect(history.calls[0]).toMatchObject({ kind: "replace", url: "/la-so/c1?tab=palaces" });
  });

  it("restores the view from the address on Back, Forward and shared links", () => {
    expect(readResultView("", null)).toEqual({ tab: "chart", open: undefined });
    expect(readResultView("?tab=palaces&open=wealth", null)).toEqual({ tab: "palaces", open: "wealth" });
    expect(readResultView("?tab=annual", null)).toEqual({ tab: "nam-nay", open: undefined });
    expect(readResultView("?tab=topics&open=career_wealth", { fd109Sheet: "chart" })).toEqual({ tab: "topics", open: "career_wealth", sheet: "chart" });
  });

  it("rejects hostile or repeated values exactly like the server parser", () => {
    expect(readResultView("?tab=evil&open=x", null)).toEqual({ tab: "chart", open: undefined });
    expect(readResultView("?tab=palaces&tab=topics&open=wealth", null)).toEqual({ tab: "chart", open: undefined });
    expect(readResultView("?tab=palaces&open=nope", { fd109Sheet: "other" })).toEqual({ tab: "palaces", open: undefined });
  });

  it("compares views including the sheet", () => {
    expect(sameView({ tab: "chart" }, { tab: "chart" })).toBe(true);
    expect(sameView({ tab: "chart" }, { tab: "chart", sheet: "chart" })).toBe(false);
  });
});
