import { createElement, type ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { ReadingContextV1 } from "@lasoviet/contracts";

vi.mock("server-only", () => ({}));

import viProfileMessages from "../../../messages/vi/profile.json";
import {
  BirthWizardReviewStep,
  type ReadingContextLabels,
} from "./birth-wizard-review-step";
import type { WizardReadingContextDraft } from "./birth-wizard-state";
import {
  readBirthProfileDraft,
  saveBirthProfileDraft,
} from "./birth-profile-draft";
import { BirthDateFields } from "./birth-date-fields";
import { createBirthProfileSubmission } from "./save-birth-profile";
import {
  canAdvanceStep1,
  canAdvanceStep2,
  validateWizardDate,
  toReadingContextPayload,
} from "./birth-wizard-state";
import { buildBirthProfile } from "./birth-profile-input";

function findElementInTree(
  node: unknown,
  predicate: (el: { type: unknown; props: Record<string, unknown> }) => boolean,
): { type: unknown; props: Record<string, unknown> } | null {
  if (!node || typeof node !== "object") return null;
  const candidate = node as { type?: unknown; props?: Record<string, unknown> };
  if (candidate.type && candidate.props && predicate(candidate as { type: unknown; props: Record<string, unknown> })) {
    return candidate as { type: unknown; props: Record<string, unknown> };
  }
  if (Array.isArray(node)) {
    for (const child of node) {
      const found = findElementInTree(child, predicate);
      if (found) return found;
    }
  }
  if (candidate.props && candidate.props.children) {
    return findElementInTree(candidate.props.children, predicate);
  }
  return null;
}

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
  lifeStage: viProfileMessages.readingContext.lifeStage as Record<any, string>,
  topConcern: viProfileMessages.readingContext.topConcern as Record<any, string>,
};

const defaultReviewProps = {
  title: "Kiểm tra thông tin",
  subtitle: "Rà soát lại toàn bộ thông tin",
  subjectSectionTitle: "Người được lập",
  birthSectionTitle: "Ngày, giờ sinh",
  editLabel: "Sửa",
  displayNameLabel: "Tên hiển thị",
  forWhomLabel: "Người được lập",
  dateLabel: "Ngày sinh",
  timeLabel: "Giờ sinh",
  genderLabel: "Giới tính",
  timezoneLabel: "Múi giờ",
  disclosure: "Thông tin của bạn được bảo mật tuyệt đối.",
  guestNotice: "Hồ sơ khách sẽ tự xóa sau 24 giờ nếu chưa đăng nhập.",
  consentLabel: "Tôi đồng ý",
  duplicateNotice: "Đang xử lý...",
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
  readingContextLabels: labels,
};

function mockSubmissionDeps() {
  const request = vi.fn();
  return {
    resolveCurrentActor: vi.fn().mockResolvedValue({
      kind: "account",
      userId: "account-1",
      sessionId: "session-1",
      requestId: "server-request-id",
    }),
    privateApiClient: vi.fn().mockReturnValue({ request }),
    getVisitorId: vi.fn().mockResolvedValue("123e4567-e89b-12d3-a456-426614174000"),
    request,
  };
}

describe("FD-078 reading context component interaction & callbacks", () => {
  it("handles lifeStage selection, single-select replacement, deselection, skip, and skip recovery", () => {
    let state: WizardReadingContextDraft = {
      skippedQuestions: { lifeStage: false, topConcern: false },
    };
    const onReadingContextChange = vi.fn((next: WizardReadingContextDraft) => {
      state = next;
    });

    // 1. Initial render: no choice active, not skipped
    let tree = BirthWizardReviewStep({
      ...defaultReviewProps,
      readingContext: state,
      onReadingContextChange,
    }) as ReactElement;

    // Find studying button and click it
    const studyingBtn = findElementInTree(
      tree,
      (el) => el.type === "button" && el.props.children === labels.lifeStage.studying,
    );
    expect(studyingBtn).not.toBeNull();
    expect(studyingBtn?.props["aria-pressed"]).toBe(false);

    (studyingBtn?.props.onClick as () => void)();
    expect(onReadingContextChange).toHaveBeenCalledWith({
      lifeStage: "studying",
      skippedQuestions: { lifeStage: false, topConcern: false },
    });

    // 2. Re-render with studying active -> clicking early_career replaces studying (single-select)
    tree = BirthWizardReviewStep({
      ...defaultReviewProps,
      readingContext: state,
      onReadingContextChange,
    }) as ReactElement;

    const earlyCareerBtn = findElementInTree(
      tree,
      (el) => el.type === "button" && el.props.children === labels.lifeStage.early_career,
    );
    expect(earlyCareerBtn).not.toBeNull();
    (earlyCareerBtn?.props.onClick as () => void)();
    expect(onReadingContextChange).toHaveBeenCalledWith({
      lifeStage: "early_career",
      skippedQuestions: { lifeStage: false, topConcern: false },
    });

    // 3. Re-render with early_career active -> clicking early_career again deselects it
    tree = BirthWizardReviewStep({
      ...defaultReviewProps,
      readingContext: state,
      onReadingContextChange,
    }) as ReactElement;

    const activeEarlyCareerBtn = findElementInTree(
      tree,
      (el) => el.type === "button" && el.props.children === labels.lifeStage.early_career,
    );
    expect(activeEarlyCareerBtn?.props["aria-pressed"]).toBe(true);

    (activeEarlyCareerBtn?.props.onClick as () => void)();
    expect(onReadingContextChange).toHaveBeenCalledWith({
      lifeStage: undefined,
      skippedQuestions: { lifeStage: false, topConcern: false },
    });

    // 4. Click skip button for lifeStage
    tree = BirthWizardReviewStep({
      ...defaultReviewProps,
      readingContext: state,
      onReadingContextChange,
    }) as ReactElement;

    const skipButtons = [
      findElementInTree(
        tree,
        (el) => el.type === "button" && Boolean(el.props.className?.toString().includes("wizard-context-skip-btn")),
      ),
    ];
    expect(skipButtons[0]).not.toBeNull();
    (skipButtons[0]?.props.onClick as () => void)();
    expect(onReadingContextChange).toHaveBeenCalledWith({
      lifeStage: undefined,
      skippedQuestions: { lifeStage: true, topConcern: false },
    });

    // 5. Re-render with skip active -> selecting business_owner recovers from skip
    tree = BirthWizardReviewStep({
      ...defaultReviewProps,
      readingContext: state,
      onReadingContextChange,
    }) as ReactElement;

    const bizOwnerBtn = findElementInTree(
      tree,
      (el) => el.type === "button" && el.props.children === labels.lifeStage.business_owner,
    );
    expect(bizOwnerBtn).not.toBeNull();
    (bizOwnerBtn?.props.onClick as () => void)();
    expect(onReadingContextChange).toHaveBeenCalledWith({
      lifeStage: "business_owner",
      skippedQuestions: { lifeStage: false, topConcern: false },
    });
  });

  it("handles topConcern selection, replacement, deselection, and skipping", () => {
    let state: WizardReadingContextDraft = {
      skippedQuestions: { lifeStage: false, topConcern: false },
    };
    const onReadingContextChange = vi.fn((next: WizardReadingContextDraft) => {
      state = next;
    });

    // 1. Initial render -> click career
    let tree = BirthWizardReviewStep({
      ...defaultReviewProps,
      readingContext: state,
      onReadingContextChange,
    }) as ReactElement;

    const careerBtn = findElementInTree(
      tree,
      (el) => el.type === "button" && el.props.children === labels.topConcern.career,
    );
    expect(careerBtn).not.toBeNull();
    (careerBtn?.props.onClick as () => void)();
    expect(onReadingContextChange).toHaveBeenCalledWith({
      topConcern: "career",
      skippedQuestions: { lifeStage: false, topConcern: false },
    });

    // 2. Re-render -> replace with money
    tree = BirthWizardReviewStep({
      ...defaultReviewProps,
      readingContext: state,
      onReadingContextChange,
    }) as ReactElement;

    const moneyBtn = findElementInTree(
      tree,
      (el) => el.type === "button" && el.props.children === labels.topConcern.money,
    );
    expect(moneyBtn).not.toBeNull();
    (moneyBtn?.props.onClick as () => void)();
    expect(onReadingContextChange).toHaveBeenCalledWith({
      topConcern: "money",
      skippedQuestions: { lifeStage: false, topConcern: false },
    });

    // 3. Skip topConcern
    const allSkips: { props: Record<string, unknown> }[] = [];
    function collectSkips(node: unknown) {
      if (!node || typeof node !== "object") return;
      const c = node as { type?: unknown; props?: Record<string, unknown> };
      if (c.type === "button" && c.props?.className?.toString().includes("wizard-context-skip-btn")) {
        allSkips.push(c as { props: Record<string, unknown> });
      }
      if (Array.isArray(node)) node.forEach(collectSkips);
      if (c.props?.children) collectSkips(c.props.children);
    }
    collectSkips(tree);
    expect(allSkips.length).toBe(2);
    // Click the second skip button (for topConcern)
    (allSkips[1]?.props.onClick as () => void)();
    expect(onReadingContextChange).toHaveBeenCalledWith({
      topConcern: undefined,
      skippedQuestions: { lifeStage: false, topConcern: true },
    });
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

describe("submission & action boundary for reading context", () => {
  const profile = {
    version: 1,
    calendar: { kind: "solar" as const, date: "1990-01-01" },
    time: { precision: "unknown" as const },
    timezone: { offsetMinutes: 420 },
    consentVersion: "2026-09-14",
  };



  it("submits unwrapped body without readingContext when readingContext is undefined (all skipped)", async () => {
    const deps = mockSubmissionDeps();
    deps.request
      .mockResolvedValueOnce({ ok: true, value: { id: "consent-1" } })
      .mockResolvedValueOnce({
        ok: true,
        value: {
          profileId: "profile-1",
          revisionId: "revision-1",
          ziweiEligibility: { version: 1, eligible: false, reason: "TIME_UNKNOWN" },
        },
      })
      .mockResolvedValueOnce({ ok: true, value: undefined });

    const submit = createBirthProfileSubmission(deps);
    const result = await submit({
      profile,
      explicitConsent: true,
      readingContext: undefined,
    });

    expect(result.ok).toBe(true);
    expect(deps.request.mock.calls[1]).toEqual([
      "/birth-profiles",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(profile),
      },
    ]);
  });

  it("submits wrapped body with readingContext when readingContext is provided", async () => {
    const deps = mockSubmissionDeps();
    deps.request
      .mockResolvedValueOnce({ ok: true, value: { id: "consent-1" } })
      .mockResolvedValueOnce({
        ok: true,
        value: {
          profileId: "profile-1",
          revisionId: "revision-1",
          ziweiEligibility: { version: 1, eligible: false, reason: "TIME_UNKNOWN" },
        },
      })
      .mockResolvedValueOnce({ ok: true, value: undefined });

    const readingContextPayload: ReadingContextV1 = {
      version: 1,
      lifeStage: "early_career",
      topConcern: "money",
    };

    const submit = createBirthProfileSubmission(deps);
    const result = await submit({
      profile,
      explicitConsent: true,
      readingContext: readingContextPayload,
    });

    expect(result.ok).toBe(true);
    const call1 = deps.request.mock.calls[1]!;
    expect(call1[0]).toBe("/birth-profiles");
    expect(call1[1].method).toBe("POST");
    expect(JSON.parse(call1[1].body)).toEqual({
      profile,
      readingContext: readingContextPayload,
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

describe("Wizard form state transition and submission pipeline", () => {
  it("transitions cleanly through steps and exercises exact submission payload assembly", async () => {
    // Step 1: Subject and gender validation
    const step1Valid = canAdvanceStep1({
      forWhom: "self",
      consentOther: false,
    });
    expect(step1Valid).toBe(true);

    // Step 2: Date and time validation
    const dateResult = validateWizardDate("12", "04", "1994", undefined, "solar");
    expect(dateResult.valid).toBe(true);
    const isoDate = dateResult.valid ? dateResult.isoDate : "";
    expect(isoDate).toBe("1994-04-12");

    const timeState = { precision: "exact_minute" as const, hour: "09", minute: "30" };
    const step2Valid = canAdvanceStep2({ dateValid: dateResult.valid, gender: "male", timeState });
    expect(step2Valid).toBe(true);

    // Step 3: Interactive reading context selection & skip
    let currentDraft: WizardReadingContextDraft = { skippedQuestions: { lifeStage: false, topConcern: false } };
    let step3Element = BirthWizardReviewStep({
      ...defaultReviewProps,
      readingContext: currentDraft,
      onReadingContextChange: (next) => {
        currentDraft = next;
      },
    }) as ReactElement;

    // Simulate clicking lifeStage button "Mới đi làm" (early_career)
    const earlyCareerBtn = findElementInTree(
      step3Element,
      (el) => el.type === "button" && el.props.children === labels.lifeStage.early_career,
    );
    expect(earlyCareerBtn).not.toBeNull();
    (earlyCareerBtn!.props.onClick as () => void)();
    expect(currentDraft.lifeStage).toBe("early_career");

    // Simulate skipping topConcern
    step3Element = BirthWizardReviewStep({
      ...defaultReviewProps,
      readingContext: currentDraft,
      onReadingContextChange: (next) => {
        currentDraft = next;
      },
    }) as ReactElement;
    const skipBtns: Array<{ type: unknown; props: Record<string, unknown> }> = [];
    function collectSkip(node: unknown) {
      if (!node || typeof node !== "object") return;
      const el = node as { type?: unknown; props?: Record<string, unknown> };
      if (el.type === "button" && el.props?.className && String(el.props.className).includes("wizard-context-skip-btn")) {
        skipBtns.push(el as any);
      }
      if (el.props?.children) {
        if (Array.isArray(el.props.children)) {
          for (const c of el.props.children) collectSkip(c);
        } else {
          collectSkip(el.props.children);
        }
      }
    }
    collectSkip(step3Element);
    expect(skipBtns.length).toBe(2);
    // Click skip on topConcern (index 1)
    (skipBtns[1]!.props.onClick as () => void)();
    expect(currentDraft.skippedQuestions.topConcern).toBe(true);

    // Transform draft to submission readingContext
    const readingContextPayload = toReadingContextPayload(currentDraft);
    expect(readingContextPayload).toEqual({
      version: 1,
      lifeStage: "early_career",
    });

    // Build birth profile input
    const profile = buildBirthProfile({
      date: isoDate,
      calendarType: "solar",
      time: timeState,
      gender: "male",
      locale: "vi",
    });

    // Execute submission
    const deps = mockSubmissionDeps();
    deps.request
      .mockResolvedValueOnce({ ok: true, value: { id: "consent-1" } })
      .mockResolvedValueOnce({
        ok: true,
        value: {
          profileId: "prof-e2e",
          revisionId: "rev-e2e",
          ziweiEligibility: { version: 1, eligible: true, timeIndex: 4 },
        },
      })
      .mockResolvedValueOnce({ ok: true, value: undefined });

    const submit = createBirthProfileSubmission(deps);
    const result = await submit({
      profile,
      explicitConsent: true,
      readingContext: readingContextPayload,
    });

    expect(result.ok).toBe(true);
    const call1 = deps.request.mock.calls[1]!;
    expect(call1[0]).toBe("/birth-profiles");
    expect(call1[1].method).toBe("POST");
    expect(JSON.parse(call1[1].body)).toEqual({
      profile,
      readingContext: readingContextPayload,
    });
  });

  it("omits readingContext completely when all questions are skipped (LSV-17 contract)", () => {
    const skippedDraft: WizardReadingContextDraft = {
      skippedQuestions: { lifeStage: true, topConcern: true },
    };
    const payload = toReadingContextPayload(skippedDraft);
    expect(payload).toBeUndefined();
  });
});

});
