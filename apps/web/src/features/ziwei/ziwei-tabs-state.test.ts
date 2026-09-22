import { describe, expect, it } from "vitest";
import {
  parseResultTabState,
  buildCanonicalTabUrl,
  hasNonCanonicalQueryParams,
  CANONICAL_RESULT_TABS,
  CANONICAL_TAB_PALACE_IDS,
  CANONICAL_TOPIC_IDS,
  CANONICAL_EVIDENCE_OPEN_IDS,
  EVIDENCE_SUFFIX_TO_CANONICAL_ID,
  CANONICAL_ID_TO_EVIDENCE_SUFFIX,
} from "./ziwei-tabs-state";

describe("Ziwei result tabs state parsing & canonical URL building", () => {
  it("defaults invalid or missing tab to 'chart'", () => {
    expect(parseResultTabState()).toEqual({ tab: "chart", open: undefined });
    expect(parseResultTabState({})).toEqual({ tab: "chart", open: undefined });
    expect(parseResultTabState({ tab: "invalid_tab" })).toEqual({ tab: "chart", open: undefined });
    expect(parseResultTabState({ tab: ["invalid"] })).toEqual({ tab: "chart", open: undefined });
  });

  it("parses valid tabs correctly", () => {
    for (const tab of CANONICAL_RESULT_TABS) {
      expect(parseResultTabState({ tab })).toEqual({ tab, open: undefined });
    }
  });

  it("drops open ID if not valid for the current tab", () => {
    // open on chart tab is dropped
    expect(parseResultTabState({ tab: "chart", open: "career" })).toEqual({ tab: "chart", open: undefined });
    // open on overview tab is dropped
    expect(parseResultTabState({ tab: "overview", open: "career" })).toEqual({ tab: "overview", open: undefined });
    // invalid open for palaces is dropped
    expect(parseResultTabState({ tab: "palaces", open: "not-a-palace" })).toEqual({ tab: "palaces", open: undefined });
    // invalid open for topics is dropped
    expect(parseResultTabState({ tab: "topics", open: "not-a-topic" })).toEqual({ tab: "topics", open: undefined });
    // evidence open incompatible with topics
    expect(parseResultTabState({ tab: "topics", open: "life-palace" })).toEqual({ tab: "topics", open: undefined });
  });

  it("accepts valid closed open IDs for palaces, topics, and evidence", () => {
    for (const palaceId of CANONICAL_TAB_PALACE_IDS) {
      expect(parseResultTabState({ tab: "palaces", open: palaceId })).toEqual({
        tab: "palaces",
        open: palaceId,
      });
    }

    for (const topicId of CANONICAL_TOPIC_IDS) {
      expect(parseResultTabState({ tab: "topics", open: topicId })).toEqual({
        tab: "topics",
        open: topicId,
      });
    }

    for (const evidenceId of CANONICAL_EVIDENCE_OPEN_IDS) {
      expect(parseResultTabState({ tab: "evidence", open: evidenceId })).toEqual({
        tab: "evidence",
        open: evidenceId,
      });
    }
  });

  it("builds canonical tab URLs without unnecessary chart query param", () => {
    expect(buildCanonicalTabUrl("/la-so/123", { tab: "chart" })).toBe("/la-so/123");
    expect(buildCanonicalTabUrl("/la-so/123", { tab: "overview" })).toBe("/la-so/123?tab=overview");
    expect(buildCanonicalTabUrl("/la-so/123", { tab: "topics", open: "career" })).toBe(
      "/la-so/123?tab=topics&open=career",
    );
  });

  it("verifies exact bijective mapping between evidence suffix and canonical ID", () => {
    expect(EVIDENCE_SUFFIX_TO_CANONICAL_ID["life-palace"]).toBe("ziwei.identity.life-palace");
    expect(EVIDENCE_SUFFIX_TO_CANONICAL_ID["body-palace"]).toBe("ziwei.identity.body-palace");
    expect(EVIDENCE_SUFFIX_TO_CANONICAL_ID["transformations"]).toBe("ziwei.identity.transformations");

    expect(CANONICAL_ID_TO_EVIDENCE_SUFFIX["ziwei.identity.life-palace"]).toBe("life-palace");
    expect(CANONICAL_ID_TO_EVIDENCE_SUFFIX["ziwei.identity.body-palace"]).toBe("body-palace");
    expect(CANONICAL_ID_TO_EVIDENCE_SUFFIX["ziwei.identity.transformations"]).toBe("transformations");
  });

  it("detects non-canonical query params accurately", () => {
    // Exact canonical: no divergence
    expect(hasNonCanonicalQueryParams(undefined, { tab: "chart" })).toBe(false);
    expect(hasNonCanonicalQueryParams({}, { tab: "chart" })).toBe(false);
    expect(hasNonCanonicalQueryParams({ tab: "topics", open: "career" }, { tab: "topics", open: "career" })).toBe(false);

    // Divergence: invalid tab
    expect(hasNonCanonicalQueryParams({ tab: "invalid" }, { tab: "chart" })).toBe(true);

    // Divergence: unknown extra param
    expect(hasNonCanonicalQueryParams({ tab: "topics", open: "career", foo: "bar" }, { tab: "topics", open: "career" })).toBe(true);

    // Divergence: redundant tab=chart
    expect(hasNonCanonicalQueryParams({ tab: "chart" }, { tab: "chart" })).toBe(true);

    // Divergence: open on chart tab
    expect(hasNonCanonicalQueryParams({ open: "career" }, { tab: "chart" })).toBe(true);
  });
});
