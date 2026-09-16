import { describe, expect, it } from "vitest";

import { parseWizardDraftV2 } from "./birth-wizard-state";

const draft = {
  version: 2 as const,
  step: 2,
  subject: { relationship: "self" },
  birth: { date: "1990-01-01" },
  updatedAt: "2026-09-15T12:00:00.000Z",
};

describe("parseWizardDraftV2", () => {
  it.each([1, 2, 3] as const)("accepts supported wizard step %i", (step) => {
    expect(parseWizardDraftV2({ ...draft, step })).toMatchObject({ step });
  });

  it("accepts omitted reading context and round-trips normalized data", () => {
    const parsed = parseWizardDraftV2(draft);

    expect(parsed).toEqual(draft);
    expect(parseWizardDraftV2(JSON.parse(JSON.stringify(parsed)))).toEqual(draft);
  });

  it("accepts explicit skips and unanswered in-progress questions", () => {
    expect(
      parseWizardDraftV2({
        ...draft,
        readingContext: {
          skippedQuestions: { lifeStage: true, topConcern: true },
        },
      }),
    ).toMatchObject({
      readingContext: {
        skippedQuestions: { lifeStage: true, topConcern: true },
      },
    });
    expect(
      parseWizardDraftV2({
        ...draft,
        readingContext: {
          skippedQuestions: { lifeStage: false, topConcern: false },
        },
      }),
    ).not.toBeNull();
  });

  it("accepts one or both selections", () => {
    expect(
      parseWizardDraftV2({
        ...draft,
        readingContext: {
          lifeStage: "early_career",
          skippedQuestions: { lifeStage: false, topConcern: true },
        },
      }),
    ).not.toBeNull();
    expect(
      parseWizardDraftV2({
        ...draft,
        readingContext: {
          lifeStage: "business_owner",
          topConcern: "money",
          skippedQuestions: { lifeStage: false, topConcern: false },
        },
      }),
    ).not.toBeNull();
  });

  it("preserves selected and skipped context through JSON round-trip restore", () => {
    const withContext = {
      ...draft,
      readingContext: {
        lifeStage: "early_career" as const,
        topConcern: "money" as const,
        skippedQuestions: { lifeStage: false, topConcern: false },
      },
    };

    expect(
      parseWizardDraftV2(JSON.parse(JSON.stringify(withContext))),
    ).toEqual(withContext);
  });

  it.each([
    {
      ...draft,
      readingContext: {
        lifeStage: "invalid",
        skippedQuestions: { lifeStage: false, topConcern: false },
      },
    },
    {
      ...draft,
      readingContext: {
        lifeStage: "early_career",
        skippedQuestions: { lifeStage: true, topConcern: false },
      },
    },
    {
      ...draft,
      readingContext: {
        topConcern: "invalid",
        skippedQuestions: { lifeStage: false, topConcern: false },
      },
    },
    { ...draft, updatedAt: "not-a-timestamp" },
    { ...draft, updatedAt: "2026-09-15T12:00:00" },
    { ...draft, step: 1.5 },
    { ...draft, step: 0 },
    { ...draft, step: 4 },
    { ...draft, step: -1 },
    { ...draft, extra: true },
    { ...draft, readingContext: { skippedQuestions: { lifeStage: false } } },
    {
      ...draft,
      readingContext: {
        skippedQuestions: { lifeStage: false, topConcern: false },
        unexpected: true,
      },
    },
    {
      ...draft,
      readingContext: {
        skippedQuestions: {
          lifeStage: false,
          topConcern: false,
          unexpected: true,
        },
      },
    },
  ])("rejects malformed draft %#", (invalidDraft) => {
    expect(parseWizardDraftV2(invalidDraft)).toBeNull();
  });

  it("requires subject and birth keys", () => {
    const { subject: _, ...withoutSubject } = draft;
    const { birth: __, ...withoutBirth } = draft;

    expect(parseWizardDraftV2(withoutSubject)).toBeNull();
    expect(parseWizardDraftV2(withoutBirth)).toBeNull();
    expect(parseWizardDraftV2({ ...draft, subject: undefined })).toBeNull();
    expect(parseWizardDraftV2({ ...draft, birth: undefined })).toBeNull();
  });

  it("keeps opaque persisted values including null and JSON scalars", () => {
    expect(
      parseWizardDraftV2({
        ...draft,
        subject: null,
        birth: ["known", 1, true, null],
      }),
    ).toMatchObject({
      subject: null,
      birth: ["known", 1, true, null],
    });
  });
});
