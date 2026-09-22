import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { BirthDetailsFields } from "./birth-details-fields";

describe("BirthDetailsFields presenter", () => {
  const defaultTimeLabels = {
    hour: "Giờ",
    minute: "Phút",
    title: "Giờ sinh",
    unknown: "Không rõ giờ sinh",
    unknownHelp: "Bạn vẫn có thể lưu hồ sơ.",
    exactMode: "Giờ & phút chính xác",
    branchMode: "Giờ theo 12 Địa Chi",
    branch: "Địa Chi",
    branchHelp: "Khung 2 tiếng",
  };

  it("renders 56px field shells with 36px icons for date and exact time", () => {
    const html = renderToStaticMarkup(
      createElement(BirthDetailsFields, {
        day: "12",
        month: "04",
        year: "1994",
        timeState: { precision: "exact_minute", hour: "09", minute: "30" },
        timeLabels: defaultTimeLabels,
        onDayChange: () => {},
        onMonthChange: () => {},
        onYearChange: () => {},
        onTimeStateChange: () => {},
      }),
    );

    expect(html).toContain("ui-field-shell__control");
    expect(html).toContain("ui-field-shell__icon");
    expect(html).toContain("birth-date-leading-icon");
    expect(html).toContain("ui-field-shell__icon");
    expect(html).toContain("class=\"icon\"");
  });

  it("renders 12 branches mode with select chevron shell", () => {
    const html = renderToStaticMarkup(
      createElement(BirthDetailsFields, {
        day: "12",
        month: "04",
        year: "1994",
        timeState: { precision: "branch_only", branch: "si" },
        timeLabels: defaultTimeLabels,
        onDayChange: () => {},
        onMonthChange: () => {},
        onYearChange: () => {},
        onTimeStateChange: () => {},
      }),
    );

    expect(html).toContain("wizard-branch-select");
    expect(html).toContain("ui-field-shell__select");
  });

  it("preserves unknown time checkbox and guidance", () => {
    const html = renderToStaticMarkup(
      createElement(BirthDetailsFields, {
        day: "12",
        month: "04",
        year: "1994",
        timeState: { precision: "unknown" },
        timeLabels: defaultTimeLabels,
        onDayChange: () => {},
        onMonthChange: () => {},
        onYearChange: () => {},
        onTimeStateChange: () => {},
      }),
    );

    expect(html).toContain("wizard-unknown-time");
    expect(html).toContain("Bạn vẫn có thể lưu hồ sơ.");
  });

  it("renders two-column segmented control for gender when provided", () => {
    const html = renderToStaticMarkup(
      createElement(BirthDetailsFields, {
        day: "12",
        month: "04",
        year: "1994",
        gender: "female",
        genderLabel: "Giới tính",
        maleLabel: "Nam",
        femaleLabel: "Nữ",
        timeState: { precision: "exact_minute", hour: "09", minute: "30" },
        timeLabels: defaultTimeLabels,
        onDayChange: () => {},
        onMonthChange: () => {},
        onYearChange: () => {},
        onGenderChange: () => {},
        onTimeStateChange: () => {},
      }),
    );

    expect(html).toContain("wizard-segmented-control");
    expect(html).toContain("Nam");
    expect(html).toContain("Nữ");
  });

  it("renders compact solar/lunar selector inside grouped date field when onCalendarTypeChange is passed", () => {
    const html = renderToStaticMarkup(
      createElement(BirthDetailsFields, {
        day: "12",
        month: "04",
        year: "1994",
        calendarType: "solar",
        onCalendarTypeChange: () => {},
        timeState: { precision: "exact_minute", hour: "09", minute: "30" },
        timeLabels: defaultTimeLabels,
        onDayChange: () => {},
        onMonthChange: () => {},
        onYearChange: () => {},
        onTimeStateChange: () => {},
      }),
    );

    expect(html).toContain("birth-date-calendar-select");
  });
});
