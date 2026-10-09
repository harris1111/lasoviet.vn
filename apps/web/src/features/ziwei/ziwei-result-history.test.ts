import { describe, expect, it } from "vitest";

import { hasSheetMarker, nextPageSegmentKey, planSheetClose, readResultView, sameView, stampNextRouterState, writeResultView } from "./ziwei-result-history";

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

  describe("planSheetClose", () => {
    const marked = { fd109Sheet: "chart" };
    it("goes Back only when this instance pushed the marked entry and still sits on it", () => {
      expect(planSheetClose({ entryOwned: true, closing: false, historyState: marked, sheet: "chart" })).toBe("back");
    });
    it("strips the marker in place for a stale or restored marker", () => {
      expect(planSheetClose({ entryOwned: false, closing: false, historyState: marked, sheet: "chart" })).toBe("replace");
      expect(planSheetClose({ entryOwned: true, closing: false, historyState: null, sheet: "chart" })).toBe("replace");
      expect(planSheetClose({ entryOwned: true, closing: false, historyState: { fd109Sheet: "period" }, sheet: "chart" })).toBe("replace");
    });
    it("ignores a second close while Back is pending", () => {
      expect(planSheetClose({ entryOwned: true, closing: true, historyState: marked, sheet: "chart" })).toBe("noop");
    });
  });

  it("detects the marker key even when its value is invalid", () => {
    expect(hasSheetMarker({ fd109Sheet: "bogus" })).toBe(true);
    expect(hasSheetMarker(null)).toBe(false);
    expect(hasSheetMarker({})).toBe(false);
  });
});

// Next's app router stores {tree, renderedSearch} in every history entry and restores it on Back/Forward.
// The page segment of that tree is keyed by the query, so an entry written for another URL (raw pushState
// copies the previous entry's tree) makes the restore a route mismatch; two in a row end in a full reload.
const tree = (pageKey: string) => ["", { children: [["locale", "vi", "d", []], { children: ["la-so", { children: [["chartId", "c1", "d", []], { children: [pageKey, {}, null, null, 4096] }, null, null, 4096] }, null, null, 4096] }, null, null, 4112] }, null, null, 4112];
const nextState = (pageKey: string, renderedSearch: string) => ({ __NA: true, __PRIVATE_NEXTJS_INTERNALS_TREE: { tree: tree(pageKey), renderedSearch } });

function historyWithState(state: unknown) {
  const calls: Array<{ kind: "push" | "replace"; state: unknown; url: string }> = [];
  return {
    calls,
    state,
    pushState: (next: unknown, _title: string, url?: string | URL | null) => { calls.push({ kind: "push", state: next, url: String(url) }); },
    replaceState: (next: unknown, _title: string, url?: string | URL | null) => { calls.push({ kind: "replace", state: next, url: String(url) }); },
  };
}

describe("history entries match Next's router state (no reload on Back)", () => {
  it("keys the page segment like the server does", () => {
    expect(nextPageSegmentKey("")).toBe("__PAGE__");
    expect(nextPageSegmentKey("?tab=topics&open=career_wealth")).toBe('__PAGE__?{"tab":"topics","open":"career_wealth"}');
    expect(nextPageSegmentKey("?tab=topics&tab=chart")).toBeNull();
  });

  it("rewrites only the page segment and renderedSearch, leaving the rest of the router state alone", () => {
    const stamped = stampNextRouterState(nextState("__PAGE__", ""), "/la-so/c1?tab=topics&open=career_wealth") as ReturnType<typeof nextState>;
    expect(stamped.__NA).toBe(true);
    expect(stamped.__PRIVATE_NEXTJS_INTERNALS_TREE.renderedSearch).toBe("?tab=topics&open=career_wealth");
    expect(stamped.__PRIVATE_NEXTJS_INTERNALS_TREE.tree).toEqual(tree('__PAGE__?{"tab":"topics","open":"career_wealth"}'));
  });

  it("does not stamp when the state is not a router state it understands", () => {
    expect(stampNextRouterState(null, "/la-so/c1?tab=topics")).toBeNull();
    expect(stampNextRouterState({ __NA: true }, "/la-so/c1?tab=topics")).toBeNull();
    expect(stampNextRouterState(nextState("not-a-page", ""), "/la-so/c1?tab=topics")).toBeNull();
    expect(stampNextRouterState({ __NA: true, __PRIVATE_NEXTJS_INTERNALS_TREE: { tree: tree("__PAGE__") } }, "/la-so/c1?tab=topics")).toBeNull();
  });

  it("writes a matching entry first, then tells Next's router about the URL with the marker only", () => {
    const history = historyWithState(nextState("__PAGE__", ""));
    writeResultView(history, "/la-so/c1", { tab: "topics", open: "career_wealth" });
    expect(history.calls).toHaveLength(2);
    expect(history.calls[0]).toMatchObject({ kind: "push", url: "/la-so/c1?tab=topics&open=career_wealth" });
    expect(history.calls[0]!.state).toMatchObject({
      __NA: true,
      __PRIVATE_NEXTJS_INTERNALS_TREE: { renderedSearch: "?tab=topics&open=career_wealth", tree: tree('__PAGE__?{"tab":"topics","open":"career_wealth"}') },
    });
    expect(history.calls[1]).toEqual({ kind: "replace", state: null, url: "/la-so/c1?tab=topics&open=career_wealth" });
  });

  it("keeps the sheet marker through both writes and honours replace", () => {
    const history = historyWithState(nextState("__PAGE__?{\"tab\":\"topics\"}", "?tab=topics"));
    writeResultView(history, "/la-so/c1", { tab: "topics", sheet: "chart" }, "replace");
    expect(history.calls.map((call) => call.kind)).toEqual(["replace", "replace"]);
    expect(history.calls[0]!.state).toMatchObject({ fd109Sheet: "chart", __NA: true });
    expect(history.calls[1]!.state).toEqual({ fd109Sheet: "chart" });
  });
});
