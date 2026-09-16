import { describe, expect, it } from "vitest";

import {
  BirthProfileCreateRequestV1Schema,
  BirthProfileCreateWrapperV1Schema,
  ClearReadingContextRequestV1Schema,
  computeReadingContextFingerprint,
  LifeStageV1Schema,
  normalizeBirthProfileCreateRequest,
  ReadingContextRecordV1Schema,
  ReadingContextV1Schema,
  SetReadingContextRequestV1Schema,
  TopConcernV1Schema,
} from "./reading-context-v1";

const profile = {
  version: 1,
  calendar: { kind: "solar", date: "1990-01-01" },
  time: { precision: "unknown" },
  timezone: { ianaZone: "Asia/Ho_Chi_Minh" },
  consentVersion: "2026-09-01",
};

describe("ReadingContextV1 contracts", () => {
  it("accepts every approved life-stage and top-concern enum value", () => {
    const lifeStages = [
      "studying",
      "early_career",
      "established_career",
      "business_owner",
      "between_paths",
      "retired",
    ] as const;
    const topConcerns = [
      "career",
      "money",
      "love",
      "family",
      "wellbeing",
      "self_understanding",
    ] as const;

    for (const lifeStage of lifeStages) {
      expect(LifeStageV1Schema.safeParse(lifeStage).success).toBe(true);
      expect(
        ReadingContextV1Schema.safeParse({ version: 1, lifeStage }).success,
      ).toBe(true);
    }
    for (const topConcern of topConcerns) {
      expect(TopConcernV1Schema.safeParse(topConcern).success).toBe(true);
      expect(
        ReadingContextV1Schema.safeParse({ version: 1, topConcern }).success,
      ).toBe(true);
    }
  });

  it("rejects invalid enum values, extra keys, and empty contexts", () => {
    expect(LifeStageV1Schema.safeParse("student").success).toBe(false);
    expect(TopConcernV1Schema.safeParse("health").success).toBe(false);
    expect(ReadingContextV1Schema.safeParse({ version: 1 }).success).toBe(
      false,
    );
    expect(
      ReadingContextV1Schema.safeParse({
        version: 1,
        lifeStage: "studying",
        extra: true,
      }).success,
    ).toBe(false);
    expect(
      SetReadingContextRequestV1Schema.safeParse({
        version: 1,
        expectedStateVersion: 0,
        idempotencyKey: "set-1",
      }).success,
    ).toBe(false);
  });

  it("validates replacement and clear mutation bounds strictly", () => {
    const replacement = SetReadingContextRequestV1Schema.parse({
      version: 1,
      topConcern: "money",
      expectedStateVersion: 0,
      idempotencyKey: "  set-1  ",
    });
    expect(replacement.idempotencyKey).toBe("set-1");

    expect(
      SetReadingContextRequestV1Schema.safeParse({
        ...replacement,
        expectedStateVersion: -1,
      }).success,
    ).toBe(false);
    expect(
      ClearReadingContextRequestV1Schema.safeParse({
        version: 1,
        expectedStateVersion: 0,
        idempotencyKey: "clear-1",
      }).success,
    ).toBe(false);
    expect(
      ClearReadingContextRequestV1Schema.safeParse({
        version: 1,
        expectedStateVersion: 1,
        idempotencyKey: " ",
      }).success,
    ).toBe(false);
  });

  it("accepts legacy raw profiles and strict wrapper profiles then normalizes them", () => {
    const legacy = BirthProfileCreateRequestV1Schema.parse(profile);
    expect(normalizeBirthProfileCreateRequest(legacy)).toEqual({
      profile,
      readingContext: undefined,
    });

    const wrapper = BirthProfileCreateWrapperV1Schema.parse({
      profile,
      readingContext: { version: 1, lifeStage: "early_career" },
    });
    expect(normalizeBirthProfileCreateRequest(wrapper)).toEqual({
      profile,
      readingContext: { version: 1, lifeStage: "early_career" },
    });
    expect(
      BirthProfileCreateRequestV1Schema.safeParse({
        profile,
        readingContext: { version: 1, topConcern: "money" },
        extra: true,
      }).success,
    ).toBe(false);
  });

  it("validates strict reading-context records", () => {
    expect(
      ReadingContextRecordV1Schema.safeParse({
        profileId: "profile-1",
        revisionId: null,
        revisionNumber: null,
        stateVersion: 0,
        lifeStage: null,
        topConcern: null,
        createdAt: null,
        updatedAt: null,
      }).success,
    ).toBe(true);
    expect(
      ReadingContextRecordV1Schema.safeParse({
        profileId: "profile-1",
        revisionId: null,
        revisionNumber: null,
        stateVersion: -1,
        lifeStage: null,
        topConcern: null,
        createdAt: null,
        updatedAt: null,
      }).success,
    ).toBe(false);
  });
});

describe("computeReadingContextFingerprint", () => {
  it("produces deterministic lowercase SHA-256 output and normalizes undefined to null", () => {
    const omitted = computeReadingContextFingerprint("set", 0, {
      lifeStage: "early_career",
    });
    const nullNormalized = computeReadingContextFingerprint("set", 0, {
      lifeStage: "early_career",
      topConcern: null,
    });

    expect(omitted).toBe(nullNormalized);
    expect(omitted).toBe(
      computeReadingContextFingerprint("set", 0, {
        lifeStage: "early_career",
      }),
    );
    expect(omitted).toMatch(/^[0-9a-f]{64}$/);
  });

  it("changes for every enum value and control field", () => {
    const lifeStageHashes = [
      "studying",
      "early_career",
      "established_career",
      "business_owner",
      "between_paths",
      "retired",
    ].map((lifeStage) =>
      computeReadingContextFingerprint("set", 0, { lifeStage }),
    );
    const topConcernHashes = [
      "career",
      "money",
      "love",
      "family",
      "wellbeing",
      "self_understanding",
    ].map((topConcern) =>
      computeReadingContextFingerprint("set", 0, { topConcern }),
    );

    expect(new Set(lifeStageHashes)).toHaveLength(lifeStageHashes.length);
    expect(new Set(topConcernHashes)).toHaveLength(topConcernHashes.length);
    expect(
      computeReadingContextFingerprint("set", 0, { topConcern: "money" }),
    ).not.toBe(
      computeReadingContextFingerprint("clear", 0, { topConcern: "money" }),
    );
    expect(
      computeReadingContextFingerprint("set", 0, { topConcern: "money" }),
    ).not.toBe(
      computeReadingContextFingerprint("set", 1, { topConcern: "money" }),
    );
  });

  it("uses the clear command tuple with both context positions normalized to null", () => {
    expect(computeReadingContextFingerprint("clear", 3)).toBe(
      computeReadingContextFingerprint("clear", 3, {
        lifeStage: null,
        topConcern: null,
      }),
    );
  });
});
