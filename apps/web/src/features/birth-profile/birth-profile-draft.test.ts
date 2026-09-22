import { afterEach, describe, expect, it, vi } from "vitest";

import {
  BIRTH_PROFILE_DRAFT_STORAGE_KEY,
  BIRTH_PROFILE_DRAFT_VERSION,
  bindDraftPagehideFlush,
  clearBirthProfileDraft,
  createDraftAutosaveController,
  readBirthProfileDraft,
  resolveRestorableWizardStep,
  saveBirthProfileDraft,
  saveHomepageDraft,
} from "./birth-profile-draft";

function createMockStorage(initial?: Record<string, string>): Storage {
  const values = new Map(Object.entries(initial ?? {}));
  return {
    get length() {
      return values.size;
    },
    clear() {
      values.clear();
    },
    getItem(key) {
      return values.get(key) ?? null;
    },
    key(index) {
      return Array.from(values.keys())[index] ?? null;
    },
    removeItem(key) {
      values.delete(key);
    },
    setItem(key, value) {
      values.set(key, value);
    },
  };
}

const fixedNow = new Date(2026, 8, 16, 12, 0, 0).getTime();

afterEach(() => {
  vi.useRealTimers();
});

describe("birth profile draft boundary", () => {
  it("round-trips a partial homepage draft without losing shared birth data", () => {
    const storage = createMockStorage();

    expect(
      saveHomepageDraft(
        {
          day: "12",
          month: "04",
          year: "1994",
          timeMode: "branch_only",
          branch: "si",
        },
        { localStorage: storage, now: fixedNow },
      ),
    ).toBe(true);

    expect(readBirthProfileDraft({ localStorage: storage, now: fixedNow })).toMatchObject({
      step: 1,
      day: "12",
      month: "04",
      year: "1994",
      timeState: { precision: "branch_only", branch: "si" },
    });
  });

  it("round-trips the complete wizard at the exact valid Review step", () => {
    const storage = createMockStorage();

    saveBirthProfileDraft(
      {
        step: 3,
        displayName: "Minh An",
        forWhom: "self",
        gender: "male",
        calendarType: "solar",
        day: "12",
        month: "04",
        year: "1994",
        timeState: { precision: "exact_minute", hour: "09", minute: "30" },
        place: "Ha Noi",
      },
      { localStorage: storage, now: fixedNow },
    );

    expect(readBirthProfileDraft({ localStorage: storage, now: fixedNow })).toEqual({
      version: BIRTH_PROFILE_DRAFT_VERSION,
      step: 3,
      displayName: "Minh An",
      forWhom: "self",
      consentOther: false,
      gender: "male",
      calendarType: "solar",
      isLeapMonth: false,
      day: "12",
      month: "04",
      year: "1994",
      timeState: { precision: "exact_minute", hour: "09", minute: "30" },
      place: "Ha Noi",
      createdAt: fixedNow,
      updatedAt: fixedNow,
    });
  });

  it("preserves wizard-only data when homepage edits shared birth fields", () => {
    const storage = createMockStorage();
    saveBirthProfileDraft(
      {
        step: 3,
        displayName: "Minh An",
        forWhom: "self",
        gender: "female",
        day: "12",
        month: "04",
        year: "1994",
        timeState: { precision: "branch_only", branch: "si" },
        place: "Ha Noi",
      },
      { localStorage: storage, now: fixedNow },
    );

    saveHomepageDraft(
      {
        day: "15",
        month: "06",
        year: "1995",
        timeMode: "exact_minute",
        hour: "10",
        minute: "45",
      },
      { localStorage: storage, now: fixedNow + 1_000 },
    );

    expect(
      readBirthProfileDraft({ localStorage: storage, now: fixedNow + 1_000 }),
    ).toMatchObject({
      step: 3,
      displayName: "Minh An",
      gender: "female",
      place: "Ha Noi",
      day: "15",
      month: "06",
      year: "1995",
      timeState: { precision: "exact_minute", hour: "10", minute: "45" },
    });
  });

  it.each([
    ["malformed JSON", "not-json"],
    [
      "expired draft",
      JSON.stringify({
        version: BIRTH_PROFILE_DRAFT_VERSION,
        createdAt: fixedNow - 25 * 60 * 60 * 1000,
        updatedAt: fixedNow - 25 * 60 * 60 * 1000,
      }),
    ],
    [
      "future timestamp",
      JSON.stringify({
        version: BIRTH_PROFILE_DRAFT_VERSION,
        createdAt: fixedNow + 1,
        updatedAt: fixedNow + 1,
      }),
    ],
    [
      "future solar date",
      JSON.stringify({
        version: BIRTH_PROFILE_DRAFT_VERSION,
        createdAt: fixedNow,
        updatedAt: fixedNow,
        day: "01",
        month: "01",
        year: "2099",
      }),
    ],
    [
      "future lunar year",
      JSON.stringify({
        version: BIRTH_PROFILE_DRAFT_VERSION,
        createdAt: fixedNow,
        updatedAt: fixedNow,
        calendarType: "lunar",
        day: "01",
        month: "01",
        year: "2027",
      }),
    ],
    [
      "malformed branch state",
      JSON.stringify({
        version: BIRTH_PROFILE_DRAFT_VERSION,
        createdAt: fixedNow,
        updatedAt: fixedNow,
        timeState: { precision: "branch_only", branch: "not-a-branch" },
      }),
    ],
    [
      "persisted final consent",
      JSON.stringify({
        version: BIRTH_PROFILE_DRAFT_VERSION,
        createdAt: fixedNow,
        updatedAt: fixedNow,
        consent: true,
      }),
    ],
  ])("fails closed for %s", (_name, raw) => {
    const storage = createMockStorage({ [BIRTH_PROFILE_DRAFT_STORAGE_KEY]: raw });

    expect(readBirthProfileDraft({ localStorage: storage, now: fixedNow })).toBeNull();
    expect(storage.getItem(BIRTH_PROFILE_DRAFT_STORAGE_KEY)).toBeNull();
  });

  it("round-trips readingContext draft with selected choices and skip states", () => {
    const storage = createMockStorage();
    const readingContext = {
      lifeStage: "early_career" as const,
      topConcern: "career" as const,
      skippedQuestions: { lifeStage: false, topConcern: false },
    };

    saveBirthProfileDraft(
      {
        step: 3,
        gender: "male",
        day: "12",
        month: "04",
        year: "1994",
        timeState: { precision: "exact_minute", hour: "09", minute: "30" },
        readingContext,
      },
      { localStorage: storage, now: fixedNow },
    );

    expect(readBirthProfileDraft({ localStorage: storage, now: fixedNow })).toMatchObject({
      step: 3,
      readingContext: {
        lifeStage: "early_career",
        topConcern: "career",
        skippedQuestions: { lifeStage: false, topConcern: false },
      },
    });

    // Test with skip state
    const skippedContext = {
      skippedQuestions: { lifeStage: true, topConcern: true },
    };
    saveBirthProfileDraft(
      {
        step: 3,
        gender: "male",
        day: "12",
        month: "04",
        year: "1994",
        timeState: { precision: "exact_minute", hour: "09", minute: "30" },
        readingContext: skippedContext,
      },
      { localStorage: storage, now: fixedNow + 100 },
    );

    expect(readBirthProfileDraft({ localStorage: storage, now: fixedNow + 100 })).toMatchObject({
      step: 3,
      readingContext: {
        skippedQuestions: { lifeStage: true, topConcern: true },
      },
    });
  });

  it("never persists explicit consent even when it is passed at runtime", () => {
    const storage = createMockStorage();
    saveBirthProfileDraft(
      {
        step: 3,
        gender: "male",
        // @ts-expect-error This field is deliberately excluded from the public input.
        consent: true,
      },
      { localStorage: storage, now: fixedNow },
    );

    expect(storage.getItem(BIRTH_PROFILE_DRAFT_STORAGE_KEY)).not.toContain("consent");
  });

  it("restores the highest valid step and downgrades invalid prerequisites", () => {
    expect(
      resolveRestorableWizardStep(
        {
          step: 3,
          gender: null,
          day: "12",
          month: "04",
          year: "1994",
          timeState: { precision: "exact_minute", hour: "09", minute: "30" },
        },
        fixedNow,
      ),
    ).toBe(1);
    expect(
      resolveRestorableWizardStep(
        {
          step: 3,
          forWhom: "other",
          consentOther: false,
          gender: "male",
          day: "12",
          month: "04",
          year: "1994",
          timeState: { precision: "exact_minute", hour: "09", minute: "30" },
        },
        fixedNow,
      ),
    ).toBe(1);
    expect(
      resolveRestorableWizardStep(
        {
          step: 3,
          gender: "male",
          day: "31",
          month: "04",
          year: "1994",
          timeState: { precision: "exact_minute", hour: "09", minute: "30" },
        },
        fixedNow,
      ),
    ).toBe(2);
    expect(
      resolveRestorableWizardStep(
        {
          step: 3,
          gender: "male",
          calendarType: "lunar",
          day: "01",
          month: "01",
          year: "2027",
          timeState: { precision: "branch_only", branch: "si" },
        },
        fixedNow,
      ),
    ).toBe(2);
  });

  it("handles storage failures and explicit clears without throwing", () => {
    const storage: Storage = {
      length: 0,
      clear: () => {
        throw new Error("denied");
      },
      getItem: () => {
        throw new Error("denied");
      },
      key: () => null,
      removeItem: () => {
        throw new Error("denied");
      },
      setItem: () => {
        throw new Error("denied");
      },
    };

    expect(readBirthProfileDraft({ localStorage: storage, now: fixedNow })).toBeNull();
    expect(saveBirthProfileDraft({}, { localStorage: storage, now: fixedNow })).toBe(false);
    expect(() => clearBirthProfileDraft({ localStorage: storage })).not.toThrow();
  });
});

describe("draft autosave lifecycle", () => {
  it("flushes a pending debounced write on pagehide and removes the listener", () => {
    vi.useFakeTimers();
    const save = vi.fn();
    const target = new EventTarget();
    const controller = createDraftAutosaveController({
      delayMs: 300,
      save,
      clear: vi.fn(),
      isMeaningful: (value: string) => value !== "",
    });
    const unbind = bindDraftPagehideFlush(controller, target);

    controller.schedule("pending-pagehide-write");
    target.dispatchEvent(new Event("pagehide"));

    expect(save).toHaveBeenCalledOnce();
    expect(save).toHaveBeenCalledWith("pending-pagehide-write");
    vi.runAllTimers();
    expect(save).toHaveBeenCalledOnce();

    controller.schedule("after-cleanup");
    unbind();
    target.dispatchEvent(new Event("pagehide"));
    expect(save).toHaveBeenCalledOnce();

    vi.advanceTimersByTime(300);
    expect(save).toHaveBeenCalledTimes(2);
    expect(save).toHaveBeenLastCalledWith("after-cleanup");
  });

  it("flushes a pending write before immediate navigation", () => {
    vi.useFakeTimers();
    const save = vi.fn();
    const controller = createDraftAutosaveController({
      delayMs: 300,
      save,
      clear: vi.fn(),
      isMeaningful: (value: string) => value !== "",
    });

    controller.schedule("in-flight");
    controller.flush();

    expect(save).toHaveBeenCalledOnce();
    expect(save).toHaveBeenCalledWith("in-flight");
    vi.runAllTimers();
    expect(save).toHaveBeenCalledOnce();
  });

  it("cancels a stale debounce after clear and after successful navigation cleanup", () => {
    vi.useFakeTimers();
    const save = vi.fn();
    const clear = vi.fn();
    const controller = createDraftAutosaveController({
      delayMs: 300,
      save,
      clear,
      isMeaningful: (value: string) => value !== "",
    });

    controller.schedule("draft");
    controller.cancelAndClear();
    vi.advanceTimersByTime(300);
    expect(save).not.toHaveBeenCalled();
    expect(clear).toHaveBeenCalledOnce();

    controller.schedule("next-draft");
    controller.cancelAndClear();
    controller.dispose();
    vi.runAllTimers();
    expect(save).not.toHaveBeenCalled();
    expect(clear).toHaveBeenCalledTimes(2);
  });

  it("clears immediately when the post-hydration form becomes empty", () => {
    const clear = vi.fn();
    const controller = createDraftAutosaveController({
      save: vi.fn(),
      clear,
      isMeaningful: (value: string) => value !== "",
    });

    controller.schedule("");

    expect(clear).toHaveBeenCalledOnce();
  });
  it("preserves lunar calendar and leap month when autosaving homepage draft", () => {
    const storage = createMockStorage();
    saveHomepageDraft(
      {
        day: "15",
        month: "08",
        year: "1990",
        calendarType: "lunar",
        isLeapMonth: true,
        timeMode: "branch_only",
        branch: "wu",
      },
      { localStorage: storage, now: fixedNow },
    );

    const restored = readBirthProfileDraft({ localStorage: storage, now: fixedNow });
    expect(restored).not.toBeNull();
    expect(restored?.calendarType).toBe("lunar");
    expect(restored?.isLeapMonth).toBe(true);
    expect(restored?.timeState).toEqual({ precision: "branch_only", branch: "wu" });
  });

  it("normalizes homepage autosave empty branch to unknown exactly like submit so draft precedence cannot corrupt visible/submit state", () => {
    const storage = createMockStorage();
    saveHomepageDraft(
      {
        day: "12",
        month: "04",
        year: "1994",
        timeMode: "branch_only",
        branch: "",
      },
      { localStorage: storage, now: fixedNow },
    );

    const restored = readBirthProfileDraft({ localStorage: storage, now: fixedNow });
    expect(restored).not.toBeNull();
    expect(restored?.timeState).toEqual({ precision: "unknown" });
    expect(restored?.day).toBe("12");
    expect(restored?.month).toBe("04");
    expect(restored?.year).toBe("1994");
  });
});
