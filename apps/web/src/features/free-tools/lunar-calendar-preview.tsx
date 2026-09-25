"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";

import { FreeToolCrossSellBanner } from "./free-tool-cross-sell-banner";
import { getMonthLunarDays, type LunarDayInfo } from "./lunar-calendar-engine";

export type LunarCalendarPreviewProps = {
  locale: "vi" | "en";
  className?: string;
};

type TrustItem = {
  num: string;
  icon: string;
  title: string;
  body: string;
};

type GlossaryItem = {
  icon: string;
  term: string;
  body: string;
};

type MethodRow = {
  label: string;
  value: string;
};

type FaqItem = {
  num: string;
  q: string;
  a: string;
};

const FREE_RESULTS_VI: readonly TrustItem[] = [
  { num: "01", icon: "calendar-day", title: "Âm–dương song song", body: "Mỗi ngày hiển thị cả ngày dương và ngày âm tương ứng, tra cứu trực quan theo từng tháng." },
  { num: "02", icon: "compass", title: "Can chi ngày, tháng, năm", body: "Xem đầy đủ cặp Thiên Can – Địa Chi và sao trực của từng ngày trong lưới tháng." },
  { num: "03", icon: "scroll", title: "Hoàng Đạo & Hắc Đạo", body: "Phân biệt rõ 6 sao Hoàng Đạo và 6 sao Hắc Đạo cho ngày và các khung giờ tốt." },
  { num: "04", icon: "book-open", title: "24 Tiết khí chính xác", body: "Hiển thị đúng ngày chuyển tiết khí thiên văn theo lịch vạn niên chuẩn." },
  { num: "05", icon: "map-pin", title: "Theo múi giờ Việt Nam", body: "Quy đổi tính toán theo múi giờ chuẩn GMT+7 (Asia/Ho_Chi_Minh)." },
  { num: "06", icon: "share", title: "Liên kết lá số cá nhân", body: "Chuyển nhanh ngày đang chọn sang lập lá số Tử Vi cá nhân hóa." },
];

const FREE_RESULTS_EN: readonly TrustItem[] = [
  { num: "01", icon: "calendar-day", title: "Parallel solar-lunar dates", body: "Every calendar day displays both solar and lunar equivalents side by side." },
  { num: "02", icon: "compass", title: "Daily Can Chi", body: "Inspect Heavenly Stem and Earthly Branch pairs for day, month, and year across the grid." },
  { num: "03", icon: "scroll", title: "Auspicious & Inauspicious", body: "Distinguish the 6 Auspicious (Hoàng Đạo) and 6 Inauspicious (Hắc Đạo) stars and hours." },
  { num: "04", icon: "book-open", title: "24 Solar terms", body: "Accurately displays the astronomical 24 solar terms on their exact transition dates." },
  { num: "05", icon: "map-pin", title: "Vietnam timezone", body: "Astronomical calculations reference Vietnam GMT+7 (Asia/Ho_Chi_Minh) baseline." },
  { num: "06", icon: "share", title: "Bridge to personal chart", body: "Seamlessly port any selected date into personalized Zi Wei chart generation." },
];

const GLOSSARY_ITEMS_VI: readonly GlossaryItem[] = [
  { icon: "calendar-day", term: "Lịch Âm Dương", body: "Hệ thống lịch kết hợp chu kỳ mặt trăng (tháng âm) và mặt trời (24 tiết khí năm dương)." },
  { icon: "compass", term: "Can Chi", body: "Hệ thống 10 Thiên Can và 12 Địa Chi dùng để định vị thời gian theo chu kỳ lục thập hoa giáp 60 năm." },
  { icon: "scroll", term: "Ngày Hoàng Đạo", body: "Ngày có một trong 6 sao tốt trực nhật: Thanh Long, Minh Đường, Kim Quỹ, Thiên Đức, Ngọc Đường, Tư Mệnh." },
  { icon: "book-open", term: "Tiết Khí", body: "24 điểm phân chia quỹ đạo mặt trời trong năm, đánh dấu sự chuyển đổi thời tiết và năng lượng tự nhiên." },
];

const GLOSSARY_ITEMS_EN: readonly GlossaryItem[] = [
  { icon: "calendar-day", term: "Lunisolar Calendar", body: "Dual calendar system tracking lunar cycles alongside astronomical solar terms." },
  { icon: "compass", term: "Can Chi (Stem & Branch)", body: "Sexagenary cycle of 10 Heavenly Stems and 12 Earthly Branches coordinating calendar time." },
  { icon: "scroll", term: "Hoàng Đạo (Auspicious)", body: "Days governed by one of the six benevolent stars: Thanh Long, Minh Đường, Kim Quỹ, Thiên Đức, Ngọc Đường, Tư Mệnh." },
  { icon: "book-open", term: "Solar Terms (Tiết khí)", body: "24 astronomical milestones along the ecliptic reflecting natural seasonal transitions." },
];

const METHOD_ROWS_VI: readonly MethodRow[] = [
  { label: "Thuật toán", value: "Quy đổi thiên văn chuẩn xác theo thư viện lunar-typescript (tính toán cho múi giờ UTC+7)." },
  { label: "Múi giờ chuẩn", value: "GMT+7 (Asia/Ho_Chi_Minh) cho toàn bộ lịch âm và tiết khí." },
  { label: "Quy tắc Hoàng Đạo", value: "Chiếu theo 12 trực thần truyền thống: 6 sao Hoàng Đạo cát lợi và 6 sao Hắc Đạo cần lưu ý." },
  { label: "Tính trung thực", value: "Không chấm điểm may rủi bịa đặt; chỉ hiển thị dữ liệu lịch pháp và căn cứ thiên văn thực tế." },
];

const METHOD_ROWS_EN: readonly MethodRow[] = [
  { label: "Algorithm", value: "Precise astronomical calculations via lunar-typescript adapted for UTC+7." },
  { label: "Baseline Timezone", value: "GMT+7 (Asia/Ho_Chi_Minh) applied to all lunar dates and solar terms." },
  { label: "Auspicious System", value: "Traditional 12-star deity system: 6 Hoàng Đạo (auspicious) and 6 Hắc Đạo (inauspicious)." },
  { label: "Integrity", value: "No fabricated luck scores; transparent display of authentic calendar facts." },
];

const FAQ_ITEMS_VI: readonly FaqItem[] = [
  { num: "01", q: "Lịch Âm khác Xem Ngày Tốt ở điểm nào?", a: "Lịch Âm hiển thị toàn diện dữ liệu lịch pháp, can chi, tiết khí và giờ hoàng đạo từng ngày. Xem Ngày Tốt là công cụ chuyên biệt để lọc ngày phù hợp cho mục đích lớn như cưới hỏi, khai trương, xuất hành." },
  { num: "02", q: "Ngày hoàng đạo là gì và giờ hoàng đạo có ý nghĩa ra sao?", a: "Ngày hoàng đạo là ngày do sáu sao tốt trực nhật, thích hợp cho các công việc quan trọng. Giờ hoàng đạo là các khung giờ trong ngày có khí tốt để tiến hành công việc thuận lợi." },
  { num: "03", q: "Dữ liệu lịch âm này có tính chuẩn cho các năm khác không?", a: "Có. Thuật toán hỗ trợ tính toán chính xác mọi tháng và năm theo chu kỳ thiên văn âm dương của Việt Nam." },
  { num: "04", q: "Ngày tốt theo lịch âm có chắc chắn hợp với tôi không?", a: "Ngày hoàng đạo là tốt chung cho số đông. Để biết ngày có hợp với bản mệnh của riêng bạn hay không, cần đối chiếu với các cung và sao trên lá số Tử Vi cá nhân." },
];

const FAQ_ITEMS_EN: readonly FaqItem[] = [
  { num: "01", q: "How does Lunar Calendar differ from Good Days?", a: "Lunar Calendar provides comprehensive calendar data, Can Chi, solar terms, and auspicious hours. Good Days specializes in filtering dates tailored for major milestones." },
  { num: "02", q: "What are Hoàng Đạo days and hours?", a: "Hoàng Đạo refers to days and two-hour windows governed by benevolent astronomical deities, favored for significant undertakings." },
  { num: "03", q: "Is the calculation accurate across different years?", a: "Yes. The underlying astronomical engine computes accurately for any month and year under Vietnam's lunisolar baseline." },
  { num: "04", q: "Does an auspicious calendar day guarantee it suits me?", a: "Calendar auspiciousness applies broadly to the general population. Personal alignment requires cross-referencing your individual Zi Wei natal chart." },
];

function ChevronRightIcon({ size = 14, color = "currentColor" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flex: "none" }}>
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}

function ToolIcon({ name, color = "var(--teal, #6E9C97)" }: { name: string; color?: string }) {
  switch (name) {
    case "compass":
      return (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="10" />
          <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" fill="currentColor" fillOpacity="0.15" />
        </svg>
      );
    case "scroll":
      return (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M8 21h12a2 2 0 0 0 2-2v-2H10v2a2 2 0 1 1-4 0V5a2 2 0 1 0-4 0v3h4" />
          <path d="M19 17V5a2 2 0 0 0-2-2H4" />
        </svg>
      );
    case "book-open":
      return (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
          <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
        </svg>
      );
    case "map-pin":
      return (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
          <circle cx="12" cy="10" r="3" />
        </svg>
      );
    case "share":
      return (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="18" cy="5" r="3" />
          <circle cx="6" cy="12" r="3" />
          <circle cx="18" cy="19" r="3" />
          <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
          <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
        </svg>
      );
    default:
      return (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
      );
  }
}

export function LunarCalendarPreview({ locale, className }: LunarCalendarPreviewProps) {
  const isVi = locale === "vi";

  // Current real date defaults
  const today = useMemo(() => new Date(), []);
  const todayYear = today.getFullYear();
  const todayMonth = today.getMonth() + 1;
  const todayDay = today.getDate();

  const [selectedYear, setSelectedYear] = useState<number>(todayYear);
  const [selectedMonth, setSelectedMonth] = useState<number>(todayMonth);
  const [selectedDay, setSelectedDay] = useState<number>(todayDay);
  const [onlyHoangDao, setOnlyHoangDao] = useState<boolean>(false);

  // Computed month data
  const monthData = useMemo(() => {
    return getMonthLunarDays(selectedYear, selectedMonth, locale);
  }, [selectedYear, selectedMonth, locale]);

  // Selected day details
  const activeDay = useMemo<LunarDayInfo>(() => {
    const found = monthData.days.find((d) => d.dayOfMonth === selectedDay);
    return found ?? monthData.days[0] ?? {
      dayOfMonth: 1,
      solarDateString: `${selectedYear}-${String(selectedMonth).padStart(2, "0")}-01`,
      dayOfWeek: 1,
      dayOfWeekName: isVi ? "Thứ Hai" : "Monday",
      lunarDay: 1,
      lunarMonth: 1,
      isLeapMonth: false,
      lunarYearName: "",
      lunarMonthName: "",
      lunarDayName: "",
      isHoangDao: true,
      starName: "Tư Mệnh",
      solarTerm: "",
      goodHours: [],
    };
  }, [monthData, selectedDay, selectedYear, selectedMonth, isVi]);

  function handlePrevMonth() {
    if (selectedMonth === 1) {
      setSelectedYear((y) => y - 1);
      setSelectedMonth(12);
    } else {
      setSelectedMonth((m) => m - 1);
    }
    setSelectedDay(1);
  }

  function handleNextMonth() {
    if (selectedMonth === 12) {
      setSelectedYear((y) => y + 1);
      setSelectedMonth(1);
    } else {
      setSelectedMonth((m) => m + 1);
    }
    setSelectedDay(1);
  }

  function handleToday() {
    setSelectedYear(todayYear);
    setSelectedMonth(todayMonth);
    setSelectedDay(todayDay);
  }

  // Calculate leading padding cells (Monday-first grid: 0 = Mon, ..., 6 = Sun)
  // firstDayOfWeek: 0 = Sun, 1 = Mon, ..., 6 = Sat
  const leadingPadCount = (monthData.firstDayOfWeek + 6) % 7;

  const weekdayHeaders = isVi
    ? ["T2", "T3", "T4", "T5", "T6", "T7", "CN"]
    : ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  const tuviHref = isVi
    ? `/tao-la-so/tu-vi?birthDay=${activeDay.dayOfMonth}&birthMonth=${selectedMonth}&birthYear=${selectedYear}`
    : `/en/tao-la-so/tu-vi?birthDay=${activeDay.dayOfMonth}&birthMonth=${selectedMonth}&birthYear=${selectedYear}`;

  const freeResults = isVi ? FREE_RESULTS_VI : FREE_RESULTS_EN;
  const glossaryItems = isVi ? GLOSSARY_ITEMS_VI : GLOSSARY_ITEMS_EN;
  const methodRows = isVi ? METHOD_ROWS_VI : METHOD_ROWS_EN;
  const faqItems = isVi ? FAQ_ITEMS_VI : FAQ_ITEMS_EN;

  return (
    <div
      className={className}
      style={{
        background: "var(--surface-base, #15120E)",
        color: "var(--text-body, #DCD4C3)",
        fontFamily: "var(--font-ui, system-ui, -apple-system, sans-serif)",
      }}
    >
      <main>
        {/* 01 HERO SECTION */}
        <section
          style={{
            position: "relative",
            padding: "clamp(56px, 9vw, 96px) 0 clamp(48px, 7vw, 80px)",
            borderBottom: "1px solid var(--border-hairline, #3A3227)",
          }}
          data-screen-label="01-hero"
        >
          <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "0 clamp(20px, 5vw, 32px)" }}>
            <nav
              aria-label={isVi ? "Đường dẫn" : "Breadcrumb"}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                fontSize: "12px",
                fontFamily: "var(--font-mono, monospace)",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "var(--text-faint, #6E6656)",
                marginBottom: "32px",
                flexWrap: "wrap",
              }}
            >
              <Link href={isVi ? "/" : "/en"} style={{ color: "var(--text-faint, #6E6656)", textDecoration: "none" }}>
                {isVi ? "Trang chủ" : "Home"}
              </Link>
              <ChevronRightIcon size={14} color="var(--text-faint, #6E6656)" />
              <Link href={isVi ? "/cong-cu-mien-phi" : "/en/cong-cu-mien-phi"} style={{ color: "var(--text-faint, #6E6656)", textDecoration: "none" }}>
                {isVi ? "Công cụ miễn phí" : "Free tools"}
              </Link>
              <ChevronRightIcon size={14} color="var(--text-faint, #6E6656)" />
              <span style={{ color: "var(--text-muted, #A79E8B)" }}>
                {isVi ? "Lịch Âm" : "Lunar Calendar"}
              </span>
            </nav>

            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                fontFamily: "var(--font-mono, monospace)",
                fontSize: "11.5px",
                letterSpacing: "0.16em",
                textTransform: "uppercase",
                color: "var(--teal, #6E9C97)",
                border: "1px solid var(--teal-deep, #33504C)",
                borderRadius: "var(--radius-pill, 9999px)",
                padding: "6px 14px",
                background: "var(--teal-tint, rgba(85, 119, 115, 0.16))",
              }}
            >
              {isVi ? "Đang hoạt động" : "Active tool"}
            </div>

            <h1
              style={{
                margin: "20px 0 0",
                fontFamily: "var(--font-display, Georgia, serif)",
                fontWeight: 400,
                fontSize: "clamp(32px, 4.2vw, 44px)",
                lineHeight: 1.15,
                color: "var(--text-heading, #F6F1E6)",
              }}
            >
              {isVi
                ? `Lịch âm tháng ${selectedMonth} năm ${selectedYear}`
                : `Lunar Calendar: ${selectedMonth}/${selectedYear}`}
            </h1>

            <p
              style={{
                margin: "20px 0 0",
                maxWidth: "640px",
                fontSize: "17.5px",
                lineHeight: 1.6,
                color: "var(--text-body, #DCD4C3)",
              }}
            >
              {isVi
                ? "Tra cứu lịch âm dương song song, can chi ngày tháng năm, ngày hoàng đạo, tiết khí và các khung giờ tốt theo chuẩn thiên văn Việt Nam (UTC+7)."
                : "Look up parallel solar and lunar dates, daily Can Chi, auspicious Hoàng Đạo stars, solar terms, and favorable hours computed for Vietnam (UTC+7)."}
            </p>

            <div style={{ marginTop: "32px", display: "flex", gap: "16px", flexWrap: "wrap", alignItems: "center" }}>
              <a
                href="#lich-thang"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  minHeight: "48px",
                  padding: "0 24px",
                  borderRadius: "var(--radius-sm, 4px)",
                  background: "linear-gradient(103deg, #9A7730 0%, #F2DCA0 34%, #C9A44D 58%, #A8842F 100%)",
                  color: "#0F0D0A",
                  fontWeight: 600,
                  fontSize: "14.5px",
                  textDecoration: "none",
                }}
              >
                {isVi ? "Xem bảng lịch ngay" : "View calendar grid"}
              </a>
              <Link
                href={isVi ? "/ngay-tot" : "/en/ngay-tot"}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  minHeight: "48px",
                  padding: "0 20px",
                  borderRadius: "var(--radius-sm, 4px)",
                  border: "1px solid var(--border-hairline, #3A3227)",
                  fontSize: "14px",
                  color: "var(--text-body, #DCD4C3)",
                  textDecoration: "none",
                }}
              >
                {isVi ? "Xem ngày tốt cho việc lớn" : "Filter good days for events"}
                <ChevronRightIcon size={16} color="var(--text-body, #DCD4C3)" />
              </Link>
            </div>
          </div>
        </section>

        {/* 02 TÍNH NĂNG NHẬN ĐƯỢC */}
        <section
          style={{
            padding: "clamp(48px, 8vw, 88px) 0",
            background: "var(--surface-deep, #0F0D0A)",
            borderBottom: "1px solid var(--border-hairline, #3A3227)",
          }}
          data-screen-label="02-tinh-nang"
        >
          <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "0 clamp(20px, 5vw, 32px)" }}>
            <div style={{ fontFamily: "var(--font-mono, monospace)", fontSize: "11.5px", letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--teal, #6E9C97)" }}>
              {isVi ? "02 · Dữ liệu chuẩn xác" : "02 · Precise calculation"}
            </div>
            <h2 style={{ margin: "14px 0 0", fontFamily: "var(--font-display, Georgia, serif)", fontWeight: 400, fontSize: "clamp(26px, 3.2vw, 34px)", color: "var(--text-heading, #F6F1E6)", maxWidth: "640px" }}>
              {isVi ? "Đầy đủ thông số lịch pháp trong một bảng tra" : "All calendar parameters in a single view"}
            </h2>
            <div style={{ marginTop: "40px", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1px", background: "var(--border-hairline, #3A3227)", border: "1px solid var(--border-hairline, #3A3227)", borderRadius: "var(--radius-lg, 12px)", overflow: "hidden" }}>
              {freeResults.map((item) => (
                <div key={item.num} style={{ background: "var(--surface-panel, #1C1813)", padding: "26px", display: "flex", flexDirection: "column", gap: "10px" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <ToolIcon name={item.icon} />
                    <span style={{ fontFamily: "var(--font-mono, monospace)", fontSize: "11px", letterSpacing: "0.08em", color: "var(--text-faint, #6E6656)" }}>{item.num}</span>
                  </div>
                  <div style={{ marginTop: "6px", fontFamily: "var(--font-display, Georgia, serif)", fontSize: "17px", color: "var(--text-heading, #F6F1E6)" }}>{item.title}</div>
                  <p style={{ margin: 0, fontSize: "13.5px", lineHeight: 1.6, color: "var(--text-body, #DCD4C3)" }}>{item.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 03 LƯỚI LỊCH THÁNG TƯƠNG TÁC THỰC TẾ */}
        <section id="lich-thang" style={{ padding: "clamp(56px, 9vw, 96px) 0" }} data-screen-label="03-lich-thang">
          <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "0 clamp(20px, 5vw, 32px)" }}>
            <div style={{ fontFamily: "var(--font-mono, monospace)", fontSize: "11.5px", letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--teal, #6E9C97)" }}>
              {isVi ? "03 · Bảng tra cứu trực quan" : "03 · Interactive calendar"}
            </div>
            <h2 style={{ margin: "14px 0 0", fontFamily: "var(--font-display, Georgia, serif)", fontWeight: 400, fontSize: "clamp(26px, 3.2vw, 34px)", color: "var(--text-heading, #F6F1E6)", maxWidth: "680px" }}>
              {isVi ? `Tháng ${selectedMonth}/${selectedYear}` : `Month ${selectedMonth}/${selectedYear}`}
              <small style={{ display: "block", fontSize: "16px", color: "var(--text-muted, #A79E8B)", marginTop: "6px", fontWeight: 400 }}>
                {isVi ? `${monthData.lunarMonthSpan} năm ${monthData.lunarYearName}` : `Lunar year ${monthData.lunarYearName}`}
              </small>
            </h2>

            {/* Controls bar */}
            <div style={{ marginTop: "32px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "16px", flexWrap: "wrap" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <button
                  type="button"
                  aria-label={isVi ? "Tháng trước" : "Previous month"}
                  onClick={handlePrevMonth}
                  style={{
                    background: "var(--surface-panel, #1C1813)",
                    border: "1px solid var(--border-hairline, #3A3227)",
                    borderRadius: "var(--radius-sm, 4px)",
                    color: "var(--text-heading, #F6F1E6)",
                    width: "36px",
                    height: "36px",
                    display: "grid",
                    placeItems: "center",
                    cursor: "pointer",
                    fontSize: "18px",
                  }}
                >
                  ‹
                </button>
                <span style={{ fontFamily: "var(--font-display, Georgia, serif)", fontSize: "18px", color: "var(--text-heading, #F6F1E6)", minWidth: "140px", textAlign: "center" }}>
                  {isVi ? `Tháng ${selectedMonth} / ${selectedYear}` : `${selectedMonth} / ${selectedYear}`}
                </span>
                <button
                  type="button"
                  aria-label={isVi ? "Tháng sau" : "Next month"}
                  onClick={handleNextMonth}
                  style={{
                    background: "var(--surface-panel, #1C1813)",
                    border: "1px solid var(--border-hairline, #3A3227)",
                    borderRadius: "var(--radius-sm, 4px)",
                    color: "var(--text-heading, #F6F1E6)",
                    width: "36px",
                    height: "36px",
                    display: "grid",
                    placeItems: "center",
                    cursor: "pointer",
                    fontSize: "18px",
                  }}
                >
                  ›
                </button>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                <button
                  type="button"
                  aria-pressed={onlyHoangDao}
                  onClick={() => setOnlyHoangDao((prev) => !prev)}
                  style={{
                    fontFamily: "var(--font-ui, sans-serif)",
                    fontSize: "13px",
                    color: onlyHoangDao ? "var(--gold-400, #D4AF37)" : "var(--text-muted, #A79E8B)",
                    background: onlyHoangDao ? "rgba(212,175,55,0.12)" : "transparent",
                    border: onlyHoangDao ? "1px solid var(--gold-400, #D4AF37)" : "1px solid var(--border-hairline, #3A3227)",
                    borderRadius: "var(--radius-pill, 9999px)",
                    padding: "6px 14px",
                    cursor: "pointer",
                  }}
                >
                  {isVi ? "Chỉ hiện ngày hoàng đạo" : "Only auspicious days"}
                </button>
                <button
                  type="button"
                  onClick={handleToday}
                  style={{
                    fontFamily: "var(--font-mono, monospace)",
                    fontSize: "11.5px",
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                    color: "var(--teal, #6E9C97)",
                    background: "var(--teal-tint, rgba(110,156,151,0.16))",
                    border: "1px solid var(--teal, #6E9C97)",
                    borderRadius: "var(--radius-pill, 9999px)",
                    padding: "7px 16px",
                    cursor: "pointer",
                  }}
                >
                  {isVi ? "Hôm nay" : "Today"}
                </button>
              </div>
            </div>

            {/* Calendar grid & Detail pane */}
            <div style={{ marginTop: "24px", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "32px", alignItems: "start" }}>
              {/* Left: Monthly Grid */}
              <div>
                <div
                  role="grid"
                  aria-label={isVi ? `Lưới lịch tháng ${selectedMonth}/${selectedYear}` : `Calendar month grid ${selectedMonth}/${selectedYear}`}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(7, 1fr)",
                    gap: "2px",
                    background: "var(--border-hairline, #3A3227)",
                    border: "1px solid var(--border-hairline, #3A3227)",
                    borderRadius: "var(--radius-md, 8px)",
                    overflow: "hidden",
                  }}
                >
                  {weekdayHeaders.map((w, idx) => (
                    <div
                      key={idx}
                      style={{
                        background: "var(--surface-deep, #0F0D0A)",
                        padding: "10px 4px",
                        textAlign: "center",
                        fontFamily: "var(--font-mono, monospace)",
                        fontSize: "11.5px",
                        fontWeight: 600,
                        letterSpacing: "0.06em",
                        color: "var(--text-faint, #6E6656)",
                      }}
                    >
                      {w}
                    </div>
                  ))}

                  {/* Leading padding empty cells */}
                  {Array.from({ length: leadingPadCount }).map((_, idx) => (
                    <div key={`pad-${idx}`} style={{ background: "var(--surface-deep, #0F0D0A)", minHeight: "68px" }} aria-hidden="true" />
                  ))}

                  {/* Days */}
                  {monthData.days.map((d) => {
                    const isSelected = d.dayOfMonth === selectedDay;
                    const isCurrentToday =
                      selectedYear === todayYear &&
                      selectedMonth === todayMonth &&
                      d.dayOfMonth === todayDay;
                    const isDimmed = onlyHoangDao && !d.isHoangDao;

                    let cellBg = "var(--surface-panel, #1C1813)";
                    let border = "1px solid transparent";

                    if (isSelected) {
                      cellBg = "rgba(201, 164, 77, 0.22)";
                      border = "1px solid var(--gold-400, #D4AF37)";
                    } else if (isCurrentToday) {
                      border = "1px solid var(--son, #CE5B45)";
                    } else if (d.isHoangDao) {
                      border = "1px solid rgba(201, 164, 77, 0.35)";
                    }

                    return (
                      <button
                        key={d.dayOfMonth}
                        type="button"
                        aria-pressed={isSelected}
                        aria-label={`${d.dayOfWeekName}, ngày ${d.dayOfMonth} dương lịch, tức ngày ${d.lunarDay} tháng ${d.lunarMonth} âm lịch`}
                        onClick={() => setSelectedDay(d.dayOfMonth)}
                        style={{
                          background: cellBg,
                          border,
                          padding: "8px 6px",
                          minHeight: "68px",
                          display: "flex",
                          flexDirection: "column",
                          justifyContent: "space-between",
                          textAlign: "left",
                          cursor: "pointer",
                          opacity: isDimmed ? 0.35 : 1,
                          transition: "all 0.15s ease",
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                          <span
                            style={{
                              fontFamily: "var(--font-ui, sans-serif)",
                              fontSize: "16px",
                              fontWeight: isSelected ? 700 : 600,
                              color: isSelected ? "var(--gold-400, #D4AF37)" : "var(--text-heading, #F6F1E6)",
                            }}
                          >
                            {d.dayOfMonth}
                          </span>
                          <span
                            style={{
                              fontSize: "11px",
                              color: d.lunarDay === 1 ? "var(--gold-400, #D4AF37)" : "var(--text-faint, #6E6656)",
                              fontWeight: d.lunarDay === 1 ? 700 : 400,
                            }}
                          >
                            {d.lunarDay === 1 ? `${d.lunarDay}/${d.lunarMonth}` : d.lunarDay}
                          </span>
                        </div>

                        <div style={{ marginTop: "4px", fontSize: "10px", color: d.isHoangDao ? "var(--gold-400, #D4AF37)" : "var(--text-faint, #6E6656)" }}>
                          {d.solarTerm ? (
                            <span style={{ color: "var(--status-success, #6FBF96)" }}>{d.solarTerm}</span>
                          ) : d.isHoangDao ? (
                            "Hoàng Đạo"
                          ) : null}
                        </div>
                      </button>
                    );
                  })}
                </div>

                <div style={{ marginTop: "14px", display: "flex", gap: "18px", flexWrap: "wrap", fontSize: "12px", color: "var(--text-muted, #A79E8B)" }}>
                  <span>
                    <span style={{ display: "inline-block", width: 10, height: 10, borderRadius: 2, border: "1px solid rgba(201,164,77,0.7)", background: "transparent", verticalAlign: "middle", marginRight: 6 }} />
                    {isVi ? "Ngày hoàng đạo" : "Auspicious"}
                  </span>
                  <span>
                    <span style={{ display: "inline-block", width: 10, height: 10, borderRadius: 2, border: "1px solid var(--son, #CE5B45)", background: "transparent", verticalAlign: "middle", marginRight: 6 }} />
                    {isVi ? "Hôm nay" : "Today"}
                  </span>
                  <span>
                    <span style={{ display: "inline-block", width: 10, height: 10, borderRadius: 2, background: "rgba(201,164,77,0.3)", border: "1px solid var(--gold-400, #D4AF37)", verticalAlign: "middle", marginRight: 6 }} />
                    {isVi ? "Đang chọn" : "Selected"}
                  </span>
                </div>
              </div>

              {/* Right: Detailed Inspection Card */}
              <div style={{ background: "var(--surface-panel, #1C1813)", border: "1px solid var(--border-hairline, #3A3227)", borderRadius: "var(--radius-md, 8px)", padding: "24px" }} aria-live="polite">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: "1px solid var(--border-hairline, #3A3227)", paddingBottom: "16px" }}>
                  <div>
                    <span style={{ fontFamily: "var(--font-mono, monospace)", fontSize: "12px", textTransform: "uppercase", color: "var(--teal, #6E9C97)" }}>
                      {activeDay.dayOfWeekName}
                    </span>
                    <h3 style={{ margin: "4px 0 0", fontFamily: "var(--font-display, Georgia, serif)", fontSize: "28px", color: "var(--gold-400, #D4AF37)" }}>
                      {isVi ? `Ngày ${activeDay.dayOfMonth}/${selectedMonth}/${selectedYear}` : `${selectedMonth}/${activeDay.dayOfMonth}/${selectedYear}`}
                    </h3>
                  </div>
                  <span
                    style={{
                      padding: "4px 10px",
                      borderRadius: "var(--radius-pill, 9999px)",
                      fontSize: "12px",
                      fontWeight: 600,
                      background: activeDay.isHoangDao ? "rgba(201,164,77,0.15)" : "rgba(255,255,255,0.08)",
                      color: activeDay.isHoangDao ? "var(--gold-400, #D4AF37)" : "var(--text-muted, #A79E8B)",
                      border: activeDay.isHoangDao ? "1px solid rgba(201,164,77,0.4)" : "1px solid var(--border-hairline, #3A3227)",
                    }}
                  >
                    {activeDay.isHoangDao ? `Hoàng Đạo · ${activeDay.starName}` : `Hắc Đạo · ${activeDay.starName}`}
                  </span>
                </div>

                <dl style={{ margin: "18px 0 0", display: "grid", gridTemplateColumns: "130px 1fr", gap: "10px 12px", fontSize: "14px" }}>
                  <dt style={{ color: "var(--text-faint, #6E6656)" }}>{isVi ? "Ngày âm lịch" : "Lunar date"}</dt>
                  <dd style={{ margin: 0, fontWeight: 600, color: "var(--text-heading, #F6F1E6)" }}>
                    {isVi
                      ? `Ngày ${activeDay.lunarDay} tháng ${activeDay.lunarMonth}${activeDay.isLeapMonth ? " (nhuận)" : ""} năm ${activeDay.lunarYearName}`
                      : `${activeDay.lunarDay}/${activeDay.lunarMonth}${activeDay.isLeapMonth ? " (leap)" : ""} ${activeDay.lunarYearName}`}
                  </dd>

                  <dt style={{ color: "var(--text-faint, #6E6656)" }}>{isVi ? "Can Chi ngày" : "Daily Can Chi"}</dt>
                  <dd style={{ margin: 0, color: "var(--text-heading, #F6F1E6)" }}>{activeDay.lunarDayName}</dd>

                  <dt style={{ color: "var(--text-faint, #6E6656)" }}>{isVi ? "Can Chi tháng" : "Month Can Chi"}</dt>
                  <dd style={{ margin: 0, color: "var(--text-heading, #F6F1E6)" }}>{activeDay.lunarMonthName}</dd>

                  <dt style={{ color: "var(--text-faint, #6E6656)" }}>{isVi ? "Can Chi năm" : "Year Can Chi"}</dt>
                  <dd style={{ margin: 0, color: "var(--text-heading, #F6F1E6)" }}>{activeDay.lunarYearName}</dd>

                  <dt style={{ color: "var(--text-faint, #6E6656)" }}>{isVi ? "Tiết khí" : "Solar term"}</dt>
                  <dd style={{ margin: 0, color: activeDay.solarTerm ? "var(--status-success, #6FBF96)" : "var(--text-muted, #A79E8B)" }}>
                    {activeDay.solarTerm || (isVi ? "Không rơi đúng tiết khí" : "No term change")}
                  </dd>
                </dl>

                {/* Auspicious Hours */}
                <div style={{ marginTop: "24px", borderTop: "1px solid var(--border-hairline, #3A3227)", paddingTop: "16px" }}>
                  <h4 style={{ margin: "0 0 10px", fontSize: "14px", color: "var(--gold-400, #D4AF37)", fontFamily: "var(--font-ui, sans-serif)" }}>
                    {isVi ? "Giờ hoàng đạo trong ngày" : "Auspicious hours today"}
                  </h4>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                    {activeDay.goodHours.map((h, idx) => (
                      <span
                        key={idx}
                        style={{
                          padding: "5px 12px",
                          borderRadius: "var(--radius-pill, 9999px)",
                          background: "rgba(201,164,77,0.12)",
                          border: "1px solid rgba(201,164,77,0.3)",
                          color: "var(--gold-400, #D4AF37)",
                          fontSize: "13px",
                          fontWeight: 500,
                        }}
                      >
                        {h}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Bridge to chart */}
                <div style={{ marginTop: "28px", borderTop: "1px solid var(--border-hairline, #3A3227)", paddingTop: "18px" }}>
                  <p style={{ margin: "0 0 12px", fontSize: "13.5px", color: "var(--text-muted, #A79E8B)" }}>
                    {isVi
                      ? "Xem ngày này tương tác với bản mệnh, cung vận và các sao trên lá số của bạn:"
                      : "See how this specific date interacts with your personalized natal chart:"}
                  </p>
                  <Link
                    href={tuviHref}
                    style={{
                      display: "block",
                      textAlign: "center",
                      padding: "10px 16px",
                      borderRadius: "var(--radius-sm, 4px)",
                      background: "linear-gradient(103deg, #9A7730 0%, #F2DCA0 34%, #C9A44D 58%, #A8842F 100%)",
                      color: "#0F0D0A",
                      fontWeight: 600,
                      fontSize: "13.5px",
                      textDecoration: "none",
                    }}
                  >
                    {isVi ? "Lập lá số cho ngày này" : "Build chart for this date"}
                  </Link>
                </div>
              </div>
            </div>

            <div style={{ marginTop: "56px" }}>
              <FreeToolCrossSellBanner locale={locale} tool="lunar-calendar" />
            </div>
          </div>
        </section>

        {/* 04 THUẬT NGỮ */}
        <section style={{ padding: "clamp(48px, 8vw, 88px) 0", background: "var(--surface-deep, #0F0D0A)", borderTop: "1px solid var(--border-hairline, #3A3227)", borderBottom: "1px solid var(--border-hairline, #3A3227)" }} data-screen-label="04-thuat-ngu">
          <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "0 clamp(20px, 5vw, 32px)" }}>
            <div style={{ fontFamily: "var(--font-mono, monospace)", fontSize: "11.5px", letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--teal, #6E9C97)" }}>{isVi ? "04 · Thuật ngữ cốt lõi" : "04 · Core terminology"}</div>
            <h2 style={{ margin: "14px 0 0", fontFamily: "var(--font-display, Georgia, serif)", fontWeight: 400, fontSize: "clamp(26px, 3.2vw, 34px)", color: "var(--text-heading, #F6F1E6)", maxWidth: "640px" }}>
              {isVi ? "Đọc lịch mà không bị ngợp thuật ngữ" : "Read the calendar without jargon overload"}
            </h2>
            <div style={{ marginTop: "36px", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1px", background: "var(--border-hairline, #3A3227)", border: "1px solid var(--border-hairline, #3A3227)", borderRadius: "var(--radius-lg, 12px)", overflow: "hidden" }}>
              {glossaryItems.map((g, idx) => (
                <div key={idx} style={{ background: "var(--surface-panel, #1C1813)", padding: "26px" }}>
                  <ToolIcon name={g.icon} />
                  <div style={{ marginTop: "14px", fontFamily: "var(--font-display, Georgia, serif)", fontSize: "17px", color: "var(--text-heading, #F6F1E6)" }}>{g.term}</div>
                  <p style={{ margin: "8px 0 0", fontSize: "13.5px", lineHeight: 1.6, color: "var(--text-body, #DCD4C3)" }}>{g.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 05 PHƯƠNG PHÁP & MINH BẠCH */}
        <section style={{ padding: "clamp(56px, 9vw, 96px) 0" }} data-screen-label="05-phuong-phap-minh-bach">
          <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "0 clamp(20px, 5vw, 32px)" }}>
            <div style={{ fontFamily: "var(--font-mono, monospace)", fontSize: "11.5px", letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--teal, #6E9C97)" }}>{isVi ? "05 · Minh bạch phương pháp" : "05 · Transparent methodology"}</div>
            <h2 style={{ margin: "14px 0 0", fontFamily: "var(--font-display, Georgia, serif)", fontWeight: 400, fontSize: "clamp(26px, 3.2vw, 34px)", color: "var(--text-heading, #F6F1E6)", maxWidth: "680px" }}>
              {isVi ? "Cơ sở tính toán lịch pháp chuẩn" : "Standardized lunisolar calculation"}
            </h2>
            <div style={{ marginTop: "36px", maxWidth: "760px" }}>
              {methodRows.map((m, idx) => (
                <div key={idx} style={{ display: "flex", gap: "24px", padding: "18px 0", borderTop: "1px solid var(--border-hairline, #3A3227)", alignItems: "baseline" }}>
                  <span style={{ flex: "none", width: "180px", fontFamily: "var(--font-mono, monospace)", fontSize: "12px", letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--text-muted, #A79E8B)" }}>{m.label}</span>
                  <span style={{ fontSize: "15px", lineHeight: 1.6, color: "var(--text-body, #DCD4C3)" }}>{m.value}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 06 FAQ */}
        <section style={{ padding: "clamp(48px, 8vw, 88px) 0", background: "var(--surface-deep, #0F0D0A)", borderTop: "1px solid var(--border-hairline, #3A3227)" }} data-screen-label="06-faq">
          <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "0 clamp(20px, 5vw, 32px)" }}>
            <div style={{ fontFamily: "var(--font-mono, monospace)", fontSize: "11.5px", letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--teal, #6E9C97)" }}>{isVi ? "06 · Hỏi đáp" : "06 · FAQ"}</div>
            <h2 style={{ margin: "14px 0 0", fontFamily: "var(--font-display, Georgia, serif)", fontWeight: 400, fontSize: "clamp(26px, 3.2vw, 34px)", color: "var(--text-heading, #F6F1E6)", maxWidth: "640px" }}>
              {isVi ? "Câu hỏi thường gặp" : "Frequently asked questions"}
            </h2>
            <div style={{ marginTop: "40px", maxWidth: "760px", display: "grid", gap: "16px" }}>
              {faqItems.map((f) => (
                <div key={f.num} style={{ background: "var(--surface-panel, #1C1813)", border: "1px solid var(--border-hairline, #3A3227)", borderRadius: "var(--radius-md, 8px)", padding: "24px" }}>
                  <div style={{ display: "flex", gap: "16px", alignItems: "baseline" }}>
                    <span style={{ fontFamily: "var(--font-mono, monospace)", fontSize: "12px", color: "var(--teal, #6E9C97)", flex: "none" }}>{f.num}</span>
                    <h3 style={{ margin: 0, fontFamily: "var(--font-display, Georgia, serif)", fontSize: "17px", color: "var(--text-heading, #F6F1E6)" }}>{f.q}</h3>
                  </div>
                  <p style={{ margin: "12px 0 0 28px", fontSize: "14px", lineHeight: 1.6, color: "var(--text-body, #DCD4C3)" }}>{f.a}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
