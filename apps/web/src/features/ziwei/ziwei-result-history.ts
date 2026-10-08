import { buildCanonicalTabUrl, parseResultTabState, type ParsedResultTabState } from "./ziwei-tabs-state";

// Sheets that have no URL of their own. They get a history entry carrying this marker so the
// browser Back button closes them (FE-3 / N7: local state first, URL kept in sync client-side).
export type ResultSheet = "chart" | "period" | "palace";
export type ResultView = ParsedResultTabState & { sheet?: ResultSheet };

type HistoryWriter = Pick<History, "pushState" | "replaceState">;

const SHEET_KEY = "fd109Sheet";

export function sheetFromState(state: unknown): ResultSheet | undefined {
  const value = typeof state === "object" && state !== null ? (state as Record<string, unknown>)[SHEET_KEY] : undefined;
  return value === "chart" || value === "period" || value === "palace" ? value : undefined;
}

/** Rebuild the view from what the browser holds (used for popstate: Back, Forward, shared link). */
export function readResultView(search: string, historyState: unknown): ResultView {
  const params: Record<string, string | string[] | undefined> = {};
  for (const key of new Set(new URLSearchParams(search).keys())) {
    const all = new URLSearchParams(search).getAll(key);
    params[key] = all.length === 1 ? all[0] : all;
  }
  const { tab, open } = parseResultTabState(params, "free-result");
  const sheet = sheetFromState(historyState);
  return sheet ? { tab, open, sheet } : { tab, open };
}

/** Write the view into the address bar without asking the server (Next integrates native history calls). */
export function writeResultView(
  history: HistoryWriter, basePath: string, view: ResultView, mode: "push" | "replace" = "push",
): void {
  const url = buildCanonicalTabUrl(basePath, { tab: view.tab, open: view.open });
  const state = view.sheet ? { [SHEET_KEY]: view.sheet } : null;
  if (mode === "push") history.pushState(state, "", url);
  else history.replaceState(state, "", url);
}

/** True when the history state carries our sheet marker key (valid or not). */
export function hasSheetMarker(state: unknown): boolean {
  return typeof state === "object" && state !== null && SHEET_KEY in state;
}

/**
 * How to close an open sheet. Only go Back when THIS instance pushed the marked entry and the browser is
 * still sitting on it; otherwise strip the marker in place. A pending Back is never repeated.
 */
export function planSheetClose(input: {
  entryOwned: boolean; closing: boolean; historyState: unknown; sheet: ResultSheet;
}): "back" | "replace" | "noop" {
  if (input.closing) return "noop";
  if (input.entryOwned && sheetFromState(input.historyState) === input.sheet) return "back";
  return "replace";
}

export function sameView(a: ResultView, b: ResultView): boolean {
  return a.tab === b.tab && a.open === b.open && a.sheet === b.sheet;
}
