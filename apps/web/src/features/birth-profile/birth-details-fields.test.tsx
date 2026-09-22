import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { BirthDetailsFields } from "./birth-details-fields";
import { generateBirthYears } from "./birth-date-fields";

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
  it("renders explicit placeholder for empty branch state without selecting Tý", () => {
    const html = renderToStaticMarkup(
      createElement(BirthDetailsFields, {
        day: "12",
        month: "04",
        year: "1994",
        timeState: { precision: "branch_only", branch: "" },
        timeLabels: defaultTimeLabels,
        onDayChange: () => {},
        onMonthChange: () => {},
        onYearChange: () => {},
        onTimeStateChange: () => {},
      }),
    );

    expect(html).toContain("wizard-branch-select");
    expect(html).toMatch(/<option (selected="" )?value=""( selected="")?>Chọn giờ sinh \(12 Địa Chi\)<\/option>/);
    // The select does not default to selecting zi
    expect(html).not.toMatch(/<option selected="" value="zi">/);
  });

  it("offers full validation-compatible past range 1000..referenceYear for years", () => {
    const html = renderToStaticMarkup(
      createElement(BirthDetailsFields, {
        day: "12",
        month: "04",
        year: "1994",
        referenceYear: 2026,
        timeState: { precision: "unknown" },
        timeLabels: defaultTimeLabels,
        onDayChange: () => {},
        onMonthChange: () => {},
        onYearChange: () => {},
        onTimeStateChange: () => {},
      }),
    );

    expect(html).toContain('<option value="2026">2026</option>');
    expect(html).toMatch(/<option (selected="" )?value="1994"( selected="")?>1994<\/option>/);
    expect(html).toContain('<option value="1000">1000</option>');
    // Future year 2027 should NOT be present
    expect(html).not.toContain('<option value="2027">2027</option>');
  });

  it("renders lunar leap month checkbox when calendarType is lunar", () => {
    const html = renderToStaticMarkup(
      createElement(BirthDetailsFields, {
        day: "12",
        month: "04",
        year: "1994",
        calendarType: "lunar",
        isLeapMonth: true,
        leapMonthLabel: "Tháng nhuận",
        timeState: { precision: "unknown" },
        timeLabels: defaultTimeLabels,
        onDayChange: () => {},
        onMonthChange: () => {},
        onYearChange: () => {},
        onTimeStateChange: () => {},
      }),
    );

    expect(html).toContain('name="isLeapMonth"');
    expect(html).toContain('checked=""');
    expect(html).toContain("Tháng nhuận");
  });

  it("handles year rollover 2026 -> 2027 via fake clock without freezing current year", () => {
    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date("2027-01-15T00:00:00Z"));
      expect(new Date().getFullYear()).toBe(2027);

      // 1. Initial server referenceYear 2026 matches SSR
      const serverYears = generateBirthYears(2026);
      expect(serverYears[0]).toBe("2026");
      expect(serverYears).not.toContain("2027");

      // 2. Rollover dynamically expands range to 2027 after hydration / effectiveYear update
      const rolledOverYears = generateBirthYears(new Date().getFullYear());
      expect(rolledOverYears[0]).toBe("2027");
      expect(rolledOverYears[1]).toBe("2026");
      expect(rolledOverYears[rolledOverYears.length - 1]).toBe("1000");

      // 3. Render presenter directly with 2027 referenceYear
      const html = renderToStaticMarkup(
        createElement(BirthDetailsFields, {
          day: "12",
          month: "04",
          year: "1994",
          referenceYear: new Date().getFullYear(),
          timeState: { precision: "unknown" },
          timeLabels: defaultTimeLabels,
          onDayChange: () => {},
          onMonthChange: () => {},
          onYearChange: () => {},
          onTimeStateChange: () => {},
        }),
      );
      expect(html).toContain('<option value="2027">2027</option>');
      expect(html).toContain('<option value="2026">2026</option>');
      expect(html).toContain('<option value="1000">1000</option>');
    } finally {
      vi.useRealTimers();
    }
  });
});
