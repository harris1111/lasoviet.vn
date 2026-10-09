import { buildCanonicalTabUrl, parseResultTabState, type ParsedResultTabState } from "./ziwei-tabs-state";

// Sheets that have no URL of their own. They get a history entry carrying this marker so the
// browser Back button closes them (FE-3 / N7: local state first, URL kept in sync client-side).
export type ResultSheet = "chart" | "period" | "palace";
export type ResultView = ParsedResultTabState & { sheet?: ResultSheet };

type HistoryWriter = Pick<History, "pushState" | "replaceState"> & { readonly state?: unknown };

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

const NEXT_INTERNALS_KEY = "__PRIVATE_NEXTJS_INTERNALS_TREE";

/** The page segment key Next's server puts in the router tree for a query ("__PAGE__" when there is none). */
export function nextPageSegmentKey(search: string): string | null {
  const query: Record<string, string> = {};
  for (const [key, value] of new URLSearchParams(search)) {
    if (key in query) return null;
    query[key] = value;
  }
  return Object.keys(query).length ? `__PAGE__?${JSON.stringify(query)}` : "__PAGE__";
}

/** Copy of a router tree with its single page segment renamed; null when the tree is not shaped as expected. */
function withPageSegment(tree: unknown, key: string): unknown | null {
  let found = 0;
  const walk = (node: unknown): unknown => {
    if (Array.isArray(node)) {
      const copy = node.map(walk);
      if (typeof node[0] === "string" && node[0].startsWith("__PAGE__")) { copy[0] = key; found += 1; }
      return copy;
    }
    if (typeof node === "object" && node !== null) {
      return Object.fromEntries(Object.entries(node).map(([name, child]) => [name, walk(child)]));
    }
    return node;
  };
  const result = walk(tree);
  return found === 1 ? result : null;
}

/**
 * Next's router state for a history entry at `url`, built from the current entry's. Next keeps
 * {tree, renderedSearch} per entry and restores it on Back/Forward; the page segment of the tree is keyed by
 * the query. Raw pushState copies the previous entry's state, so the restore for `?tab=…` would not match what
 * the server renders: Next retries, and two retries in a row (or Back during one) end in a full reload.
 * Returns null when the state is not what we expect, so callers fall back to the plain history write.
 */
export function stampNextRouterState(current: unknown, url: string): Record<string, unknown> | null {
  if (typeof current !== "object" || current === null) return null;
  const { __NA: routerOwned, [NEXT_INTERNALS_KEY]: internals } = current as Record<string, unknown>;
  if (!routerOwned || typeof internals !== "object" || internals === null) return null;
  const { tree, renderedSearch } = internals as { tree?: unknown; renderedSearch?: unknown };
  if (tree === undefined || typeof renderedSearch !== "string") return null;
  const query = url.indexOf("?");
  const search = query === -1 ? "" : url.slice(query);
  const pageKey = nextPageSegmentKey(search);
  const stampedTree = pageKey === null ? null : withPageSegment(tree, pageKey);
  if (stampedTree === null) return null;
  return { __NA: routerOwned, [NEXT_INTERNALS_KEY]: { ...internals, tree: stampedTree, renderedSearch: search } };
}

/**
 * Write the view into the address bar without asking the server. Two writes keep Next's router and the entry in
 * agreement: first an entry that already carries router state matching the URL (Next's history patch leaves
 * states it owns alone), then a replace through the patch so the router learns the URL and runs a restore that
 * agrees with it. Without matching router state there is only the plain write.
 */
export function writeResultView(
  history: HistoryWriter, basePath: string, view: ResultView, mode: "push" | "replace" = "push",
): void {
  const url = buildCanonicalTabUrl(basePath, { tab: view.tab, open: view.open });
  const marker = view.sheet ? { [SHEET_KEY]: view.sheet } : null;
  const write = mode === "push" ? history.pushState.bind(history) : history.replaceState.bind(history);
  const routerState = stampNextRouterState(history.state, url);
  if (!routerState) { write(marker, "", url); return; }
  write({ ...marker, ...routerState }, "", url);
  history.replaceState(marker, "", url);
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
