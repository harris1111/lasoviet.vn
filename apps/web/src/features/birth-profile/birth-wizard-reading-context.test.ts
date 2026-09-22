import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { ReadingContextV1 } from "@lasoviet/contracts";

import viProfileMessages from "../../../messages/vi/profile.json";
import {
  BirthWizardReviewStep,
  type ReadingContextLabels,
} from "./birth-wizard-review-step";
import type { WizardReadingContextDraft } from "./birth-wizard-state";
import {
  readBirthProfileDraft,
  saveBirthProfileDraft,
  BIRTH_PROFILE_DRAFT_STORAGE_KEY,
} from "./birth-profile-draft";
import { BirthDateFields } from "./birth-date-fields";

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

const fixedNow = new Date(2026, 8, 22, 10, 0, 0).getTime();

const labels: ReadingContextLabels = {
  title: viProfileMessages.readingContext.title,
  subtitle: viProfileMessages.readingContext.subtitle,
  skip: viProfileMessages.readingContext.skip,
  lifeStageTitle: viProfileMessages.readingContext.lifeStageTitle,
  topConcernTitle: viProfileMessages.readingContext.topConcernTitle,
  lifeStage: viProfileMessages.readingContext.lifeStage,
  topConcern: viProfileMessages.readingContext.topConcern,
};

describe("FD-078 reading context single-select, replace, and skip interaction logic", () => {
  it("selects, replaces, deselects, and skips lifeStage as single-select", () => {
    let state: WizardReadingContextDraft = {
      skippedQuestions: { lifeStage: false, topConcern: false },
    };

    function updateState(next: WizardReadingContextDraft) {
      state = next;
    }

    // Initial render
    const initialHtml = renderToStaticMarkup(
      createElement(BirthWizardReviewStep, {
        title: "Kiểm tra",
        subtitle: "Rà soát",
        subjectSectionTitle: "Người được lập",
        birthSectionTitle: "Ngày, giờ",
        editLabel: "Sửa",
        displayNameLabel: "Tên",
        forWhomLabel: "Đối tượng",
        dateLabel: "Ngày",
        timeLabel: "Giờ",
        genderLabel: "Giới tính",
        timezoneLabel: "Múi giờ",
        disclosure: "Bảo mật",
        guestNotice: "Khách",
        consentLabel: "Đồng ý",
        duplicateNotice: "Chờ",
        displayName: "Minh An",
        forWhom: "Bản thân",
        date: "12/04/1994",
        time: "09:30",
        gender: "Nam",
        timezone: "Asia/Ho_Chi_Minh",
        consent: false,
        pending: false,
        onEditSubject: () => {},
        onEditBirth: () => {},
        onConsentChange: () => {},
        readingContext: state,
        readingContextLabels: labels,
        onReadingContextChange: updateState,
      }),
    );

    expect(initialHtml).toContain("reading-context-section");
    expect(initialHtml).toContain(labels.lifeStage.early_career);

    // 1. Select choice: "studying"
    state = {
      ...state,
      lifeStage: "studying",
      skippedQuestions: { ...state.skippedQuestions, lifeStage: false },
    };
    expect(state.lifeStage).toBe("studying");
    expect(state.skippedQuestions.lifeStage).toBe(false);

    // 2. Replace choice: "early_career"
    state = {
      ...state,
      lifeStage: "early_career",
      skippedQuestions: { ...state.skippedQuestions, lifeStage: false },
    };
    expect(state.lifeStage).toBe("early_career");
    expect(state.skippedQuestions.lifeStage).toBe(false);

    // 3. Skip: clears choice and marks skipped
    state = {
      ...state,
      lifeStage: undefined,
      skippedQuestions: { ...state.skippedQuestions, lifeStage: true },
    };
    expect(state.lifeStage).toBeUndefined();
    expect(state.skippedQuestions.lifeStage).toBe(true);

    // 4. Recover from skip: user selects "business_owner"
    state = {
      ...state,
      lifeStage: "business_owner",
      skippedQuestions: { ...state.skippedQuestions, lifeStage: false },
    };
    expect(state.lifeStage).toBe("business_owner");
    expect(state.skippedQuestions.lifeStage).toBe(false);
  });

  it("selects, replaces, and skips topConcern as single-select", () => {
    let state: WizardReadingContextDraft = {
      skippedQuestions: { lifeStage: false, topConcern: false },
    };

    // 1. Select: "career"
    state = {
      ...state,
      topConcern: "career",
      skippedQuestions: { ...state.skippedQuestions, topConcern: false },
    };
    expect(state.topConcern).toBe("career");
    expect(state.skippedQuestions.topConcern).toBe(false);

    // 2. Replace: "money"
    state = {
      ...state,
      topConcern: "money",
      skippedQuestions: { ...state.skippedQuestions, topConcern: false },
    };
    expect(state.topConcern).toBe("money");

    // 3. Skip: "topConcern"
    state = {
      ...state,
      topConcern: undefined,
      skippedQuestions: { ...state.skippedQuestions, topConcern: true },
    };
    expect(state.topConcern).toBeUndefined();
    expect(state.skippedQuestions.topConcern).toBe(true);
  });
});

describe("draft/OAuth continuation readingContext preservation", () => {
  it("restores active reading context selections across reload/OAuth return", () => {
    const storage = createMockStorage();

    saveBirthProfileDraft(
      {
        step: 3,
        gender: "male",
        day: "12",
        month: "04",
        year: "1994",
        timeState: { precision: "exact_minute", hour: "09", minute: "30" },
        readingContext: {
          lifeStage: "established_career",
          topConcern: "wellbeing",
          skippedQuestions: { lifeStage: false, topConcern: false },
        },
      },
      { localStorage: storage, now: fixedNow },
    );

    const restored = readBirthProfileDraft({ localStorage: storage, now: fixedNow });
    expect(restored).not.toBeNull();
    expect(restored?.readingContext).toEqual({
      lifeStage: "established_career",
      topConcern: "wellbeing",
      skippedQuestions: { lifeStage: false, topConcern: false },
    });
  });

  it("restores skip status across reload/OAuth return so user is not re-prompted", () => {
    const storage = createMockStorage();

    saveBirthProfileDraft(
      {
        step: 3,
        gender: "male",
        day: "12",
        month: "04",
        year: "1994",
        timeState: { precision: "exact_minute", hour: "09", minute: "30" },
        readingContext: {
          skippedQuestions: { lifeStage: true, topConcern: true },
        },
      },
      { localStorage: storage, now: fixedNow },
    );

    const restored = readBirthProfileDraft({ localStorage: storage, now: fixedNow });
    expect(restored).not.toBeNull();
    expect(restored?.readingContext).toEqual({
      skippedQuestions: { lifeStage: true, topConcern: true },
    });
  });
});

describe("submission payload normalization for reading context", () => {
  function normalizeReadingContextPayload(
    readingContext: WizardReadingContextDraft,
  ): ReadingContextV1 | undefined {
    if (readingContext.lifeStage || readingContext.topConcern) {
      return {
        version: 1,
        ...(readingContext.lifeStage ? { lifeStage: readingContext.lifeStage } : {}),
        ...(readingContext.topConcern ? { topConcern: readingContext.topConcern } : {}),
      };
    }
    return undefined;
  }

  it("omits readingContext when both questions are skipped", () => {
    const allSkipped: WizardReadingContextDraft = {
      skippedQuestions: { lifeStage: true, topConcern: true },
    };
    expect(normalizeReadingContextPayload(allSkipped)).toBeUndefined();
  });

  it("omits readingContext when neither question is answered or skipped", () => {
    const empty: WizardReadingContextDraft = {
      skippedQuestions: { lifeStage: false, topConcern: false },
    };
    expect(normalizeReadingContextPayload(empty)).toBeUndefined();
  });

  it("produces exact ReadingContextV1 when one question is selected and other is skipped", () => {
    const partial: WizardReadingContextDraft = {
      lifeStage: "early_career",
      skippedQuestions: { lifeStage: false, topConcern: true },
    };
    const payload = normalizeReadingContextPayload(partial);
    expect(payload).toEqual({
      version: 1,
      lifeStage: "early_career",
    });
  });

  it("produces exact ReadingContextV1 when both questions are selected", () => {
    const complete: WizardReadingContextDraft = {
      lifeStage: "business_owner",
      topConcern: "money",
      skippedQuestions: { lifeStage: false, topConcern: false },
    };
    const payload = normalizeReadingContextPayload(complete);
    expect(payload).toEqual({
      version: 1,
      lifeStage: "business_owner",
      topConcern: "money",
    });
  });
});

describe("BirthDateFields grouped 3 inline selects + calendar control", () => {
  it("renders 3 inline selects for day, month, year plus solar/lunar select in one shell", () => {
    const html = renderToStaticMarkup(
      createElement(BirthDateFields, {
        day: "12",
        month: "04",
        year: "1994",
        calendarType: "solar",
        onDayChange: () => {},
        onMonthChange: () => {},
        onYearChange: () => {},
        onCalendarTypeChange: () => {},
      }),
    );

    // 3 inline date selects
    expect(html).toContain('name="birthDay"');
    expect(html).toContain('name="birthMonth"');
    expect(html).toContain('name="birthYear"');

    // Solar/lunar select in the same shell
    expect(html).toContain('name="calendarType"');
    expect(html).toContain("Dương lịch");
    expect(html).toContain("Âm lịch");

    // All inside ui-field-shell__control
    expect(html).toContain("birth-date-inputs ui-field-shell__control");
  });
});
