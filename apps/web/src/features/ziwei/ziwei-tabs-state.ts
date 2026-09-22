export const CANONICAL_RESULT_TABS = [
  "chart",
  "overview",
  "palaces",
  "topics",
  "evidence",
] as const;

export type ZiweiResultTab = (typeof CANONICAL_RESULT_TABS)[number];

export const CANONICAL_TAB_PALACE_IDS = [
  "life",
  "siblings",
  "spouse",
  "children",
  "wealth",
  "health",
  "travel",
  "friends",
  "career",
  "property",
  "fortune",
  "parents",
] as const;

export type CanonicalTabPalaceId = (typeof CANONICAL_TAB_PALACE_IDS)[number];

export const CANONICAL_TOPIC_IDS = [
  "life",
  "siblings",
  "spouse",
  "children",
  "wealth",
  "health",
  "travel",
  "friends",
  "career",
  "property",
  "fortune",
  "parents",
] as const;

export type CanonicalTopicId = (typeof CANONICAL_TOPIC_IDS)[number];

export const CANONICAL_EVIDENCE_OPEN_IDS = [
  "life-palace",
  "body-palace",
  "transformations",
] as const;

export type CanonicalEvidenceOpenId = (typeof CANONICAL_EVIDENCE_OPEN_IDS)[number];

export type ParsedResultTabState = {
  tab: ZiweiResultTab;
  open?: string;
};

export function parseResultTabState(searchParams?: {
  tab?: string | string[];
  open?: string | string[];
}): ParsedResultTabState {
  const rawTab = Array.isArray(searchParams?.tab)
    ? searchParams?.tab[0]
    : searchParams?.tab;
  const rawOpen = Array.isArray(searchParams?.open)
    ? searchParams?.open[0]
    : searchParams?.open;

  const tab: ZiweiResultTab =
    typeof rawTab === "string" && (CANONICAL_RESULT_TABS as readonly string[]).includes(rawTab)
      ? (rawTab as ZiweiResultTab)
      : "chart";

  let open: string | undefined = undefined;

  if (typeof rawOpen === "string") {
    const trimmed = rawOpen.trim();
    if (tab === "palaces" && (CANONICAL_TAB_PALACE_IDS as readonly string[]).includes(trimmed)) {
      open = trimmed;
    } else if (tab === "topics" && (CANONICAL_TOPIC_IDS as readonly string[]).includes(trimmed)) {
      open = trimmed;
    } else if (tab === "evidence" && (CANONICAL_EVIDENCE_OPEN_IDS as readonly string[]).includes(trimmed)) {
      open = trimmed;
    }
  }

  return { tab, open };
}

export function buildCanonicalTabUrl(
  basePath: string,
  state: ParsedResultTabState,
): string {
  const params = new URLSearchParams();
  if (state.tab !== "chart") {
    params.set("tab", state.tab);
  }
  if (state.open) {
    params.set("open", state.open);
  }
  const query = params.toString();
  return query ? `${basePath}?${query}` : basePath;
}
