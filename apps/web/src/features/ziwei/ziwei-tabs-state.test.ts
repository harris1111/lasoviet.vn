import { describe, expect, it } from "vitest";
import {
  parseResultTabState,
  buildCanonicalTabUrl,
  CANONICAL_RESULT_TABS,
  CANONICAL_TAB_PALACE_IDS,
  CANONICAL_TOPIC_IDS,
  CANONICAL_EVIDENCE_OPEN_IDS,
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
});
