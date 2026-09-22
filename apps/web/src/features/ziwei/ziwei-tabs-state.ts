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

// Bijective 1-to-1 exact closed mapping
export const EVIDENCE_SUFFIX_TO_CANONICAL_ID: Record<CanonicalEvidenceOpenId, string> = {
  "life-palace": "ziwei.identity.life-palace",
  "body-palace": "ziwei.identity.body-palace",
  transformations: "ziwei.identity.transformations",
};

export const CANONICAL_ID_TO_EVIDENCE_SUFFIX: Record<string, CanonicalEvidenceOpenId> = {
  "ziwei.identity.life-palace": "life-palace",
  "ziwei.identity.body-palace": "body-palace",
  "ziwei.identity.transformations": "transformations",
  "life-palace": "life-palace",
  "body-palace": "body-palace",
  transformations: "transformations",
};

export type ParsedResultTabState = {
  tab: ZiweiResultTab;
  open?: string;
};

export function parseResultTabState(searchParams?: Record<string, string | string[] | undefined>): ParsedResultTabState {
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

export function hasNonCanonicalQueryParams(
  rawSearchParams: Record<string, string | string[] | undefined> | undefined,
  canonicalState: ParsedResultTabState,
): boolean {
  if (!rawSearchParams) return false;
  const keys = Object.keys(rawSearchParams);
  if (keys.length === 0) return false;

  const expectedParams = new URLSearchParams();
  if (canonicalState.tab !== "chart") {
    expectedParams.set("tab", canonicalState.tab);
  }
  if (canonicalState.open) {
    expectedParams.set("open", canonicalState.open);
  }

  // Check if keys or values differ
  const allowedKeys = new Set(Array.from(expectedParams.keys()));
  for (const k of keys) {
    if (!allowedKeys.has(k)) {
      return true; // extraneous or invalid param present
    }
    const rawVal = Array.isArray(rawSearchParams[k])
      ? rawSearchParams[k]![0]
      : rawSearchParams[k];
    if (rawVal !== expectedParams.get(k)) {
      return true; // value changed or normalized
    }
  }

  for (const [k, v] of expectedParams.entries()) {
    const rawVal = Array.isArray(rawSearchParams[k])
      ? rawSearchParams[k]![0]
      : rawSearchParams[k];
    if (rawVal !== v) {
      return true;
    }
  }

  return false;
}
