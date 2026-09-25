"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";

import { FreeToolCrossSellBanner } from "./free-tool-cross-sell-banner";
import {
  getGoodDaysForActivity,
  GOOD_DAY_ACTIVITIES,
  type GoodDayActivity,
  type GoodDayItem,
} from "./lunar-calendar-engine";

export type GoodDaysPreviewProps = {
  locale: "vi" | "en";
  className?: string;
};

type FreeResultItem = {
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

type FaqItemData = {
  q: string;
  a: string;
};

const FREE_RESULTS_VI: readonly FreeResultItem[] = [
  { num: "01", icon: "calendar-day", title: "Ngày ứng viên có lý do rõ", body: "Mỗi ngày đề xuất nêu đúng quy tắc đã dùng — Hoàng Đạo, sao trực nhật, tiết khí và các khung giờ tốt." },
  { num: "02", icon: "compass", title: "Bộ lọc theo loại việc", body: "Cưới hỏi, khai trương, xuất hành, động thổ, ký kết, chuyển nhà... mỗi việc có tiêu chí sao phù hợp." },
  { num: "03", icon: "scroll", title: "Khung giờ hoàng đạo chi tiết", body: "Hiển thị đầy đủ 6 khung giờ hoàng đạo trong ngày để chọn thời điểm tiến hành thuận lợi." },
  { num: "04", icon: "book-open", title: "So sánh tối đa 3 ngày", body: "Đặt cạnh nhau các tiêu chí của từng ngày để tự đối chiếu và cân nhắc thời gian." },
  { num: "05", icon: "shield-lock", title: "Không chấm điểm gộp", body: "Không bịa đặt điểm số '95/100' hay hứa hẹn may rủi tuyệt đối; chỉ nêu căn cứ lịch pháp thực tế." },
  { num: "06", icon: "help-circle", title: "Cầu nối lá số cá nhân", body: "Chuyển nhanh ngày đã chọn sang đối chiếu với các cung trên lá số Tử Vi của bạn." },
];

const FREE_RESULTS_EN: readonly FreeResultItem[] = [
  { num: "01", icon: "calendar-day", title: "Candidate dates with transparent reasons", body: "Each recommended date discloses the applied rules — Hoàng Đạo duty deity, solar terms, and favorable hours." },
  { num: "02", icon: "compass", title: "Activity-specific filters", body: "Weddings, openings, travel, groundbreaking, contracts, moving... tailored deity requirements." },
  { num: "03", icon: "scroll", title: "Detailed auspicious hours", body: "Displays the 6 auspicious two-hour blocks of the day for timely execution." },
  { num: "04", icon: "book-open", title: "Compare up to 3 dates", body: "Place candidate dates side by side to compare criteria directly." },
  { num: "05", icon: "shield-lock", title: "No composite fortune score", body: "No fabricated percentage scores or guaranteed luck promises; pure astronomical facts." },
  { num: "06", icon: "help-circle", title: "Bridge to personal chart", body: "Seamlessly cross-reference chosen dates with the palaces of your natal Zi Wei chart." },
];

const GLOSSARY_ITEMS_VI: readonly GlossaryItem[] = [
  { icon: "calendar-day", term: "Sao Hoàng Đạo", body: "Sáu sao tốt (Thanh Long, Minh Đường, Kim Quỹ, Thiên Đức, Ngọc Đường, Tư Mệnh) đem lại vượng khí cho ngày." },
  { icon: "compass", term: "Can Chi Ngày", body: "Cặp Can Chi của ngày kết hợp với ngũ hành giúp xác định tính chất thời điểm." },
  { icon: "book-open", term: "Tiết Khí", body: "Các mốc thiên văn trong năm chỉ rõ thời điểm khí trời chuyển dịch, có ảnh hưởng lớn tới việc khởi sự." },
  { icon: "scroll", term: "Giờ Hoàng Đạo", body: "Khoảng thời gian 2 giờ đồng hồ trong ngày có trường năng lượng tốt để tiến hành các nghi lễ hoặc giao dịch." },
];

const GLOSSARY_ITEMS_EN: readonly GlossaryItem[] = [
  { icon: "calendar-day", term: "Auspicious Stars", body: "Six benevolent deities (Thanh Long, Minh Đường, Kim Quỹ, Thiên Đức, Ngọc Đường, Tư Mệnh) blessing the date." },
  { icon: "compass", term: "Daily Stem & Branch", body: "The cyclical combination reflecting daily cosmic elements and energetic qualities." },
  { icon: "book-open", term: "Solar Terms", body: "Astronomical solar coordinates indicating seasonal climatic and energetic transitions." },
  { icon: "scroll", term: "Auspicious Hours", body: "Two-hour windows during the day favorable for ceremonies, departures, or signings." },
];

const METHOD_ROWS_VI: readonly MethodRow[] = [
  { label: "Thuật toán lọc", value: "Quy tắc lịch pháp cổ truyền: lọc theo ngày Hoàng Đạo, sao trực nhật theo tính chất từng loại việc." },
  { label: "Múi giờ chuẩn", value: "GMT+7 (Asia/Ho_Chi_Minh) cho tất cả các phép tính ngày và giờ." },
  { label: "Nguyên tắc đạo đức", value: "Không chấm điểm may rủi bịa đặt; không khẳng định 'chắc chắn thành công'; kết quả mang tính định hướng thời điểm." },
  { label: "Giới hạn tự nhiên", value: "Ngày tốt theo lịch áp dụng cho số đông; sự phù hợp sâu sắc cần đối chiếu thêm cung số trên lá số Tử Vi." },
];

const METHOD_ROWS_EN: readonly MethodRow[] = [
  { label: "Filtering Method", value: "Traditional astronomical rules: filtering via Hoàng Đạo days, duty deities tailored to activity nature." },
  { label: "Timezone", value: "GMT+7 (Asia/Ho_Chi_Minh) for all date and hour computations." },
  { label: "Ethics Baseline", value: "No fabricated luck scores; no guarantee promises; objective temporal guidance only." },
  { label: "Boundary", value: "Auspicious calendar days apply broadly; personal synergy requires individual Zi Wei analysis." },
];

const FAQ_ITEMS_VI: readonly FaqItemData[] = [
  { q: "Xem Ngày Tốt khác Lịch Âm ở điểm nào?", a: "Lịch Âm tra cứu toàn diện từng ngày. Xem Ngày Tốt giúp bạn lọc nhanh các ngày cát lợi phù hợp nhất cho một mục đích cụ thể (cưới hỏi, khai trương, xuất hành, động thổ...)." },
  { q: "Làm sao để biết ngày tốt có hợp với tuổi của tôi không?", a: "Ngày hoàng đạo là ngày tốt chung cho thiên thời. Để biết ngày có xung khắc với tuổi hay chạm vào cung xấu trên lá số của bạn hay không, bạn nên bấm xem ngày đó theo lá số Tử Vi cá nhân." },
  { q: "Tại sao công cụ không cho điểm số ví dụ '90/100'?", a: "Lá Số Việt tuân thủ nguyên tắc minh bạch: vận khí không thể quy về một con số đơn lẻ bịa đặt. Chúng tôi cung cấp chính xác các căn cứ (Hoàng Đạo, Sao, Giờ) để bạn tự cân nhắc." },
  { q: "Có cần chọn đúng giờ hoàng đạo trong ngày tốt không?", a: "Nên ưu tiên tiến hành các việc trọng đại (lễ cưới, ký kết, mở hàng) vào khung giờ hoàng đạo để thêm phần thuận lợi." },
];

const FAQ_ITEMS_EN: readonly FaqItemData[] = [
  { q: "How does Good Days differ from Lunar Calendar?", a: "Lunar Calendar displays all days broadly. Good Days filters candidate auspicious dates specifically matched to a milestone activity." },
  { q: "How can I tell if a good day suits my individual age?", a: "Auspicious days represent favorable cosmic climate generally. Checking personal alignment requires verifying your Zi Wei natal chart." },
  { q: "Why doesn't the tool provide a composite score like '90/100'?", a: "La So Viet avoids arbitrary metrics. We provide clear, verifiable traditional criteria (deity, term, hours) for informed decisions." },
  { q: "Should important tasks be scheduled during auspicious hours?", a: "Yes, aligning major milestones with the day's favorable two-hour windows enhances smooth execution." },
];

function renderSvgIcon(name: string, size = 20, color = "var(--teal, #6E9C97)") {
  switch (name) {
    case "calendar-day":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
      );
    case "compass":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="10" />
          <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" fill="currentColor" fillOpacity="0.15" />
        </svg>
      );
    case "scroll":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M8 21h12a2 2 0 0 0 2-2v-2H10v2a2 2 0 1 1-4 0V5a2 2 0 1 0-4 0v3h4" />
          <path d="M19 17V5a2 2 0 0 0-2-2H4" />
        </svg>
      );
    case "book-open":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
          <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
        </svg>
      );
    case "shield-lock":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
      );
    case "help-circle":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="10" />
          <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
      );
    default:
      return null;
  }
}

export function GoodDaysPreview({ locale, className }: GoodDaysPreviewProps) {
  const isVi = locale === "vi";

  // Date selection state
  const today = useMemo(() => new Date(), []);
  const [selectedYear, setSelectedYear] = useState<number>(today.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(today.getMonth() + 1);
  const [selectedActivity, setSelectedActivity] = useState<GoodDayActivity>("wedding");
  const [compareIds, setCompareIds] = useState<number[]>([]);
  const [activeDayNum, setActiveDayNum] = useState<number | null>(null);

  // Compute candidate days
  const candidateDays = useMemo<GoodDayItem[]>(() => {
    return getGoodDaysForActivity(selectedYear, selectedMonth, selectedActivity, locale);
  }, [selectedYear, selectedMonth, selectedActivity, locale]);

  function handlePrevMonth() {
    if (selectedMonth === 1) {
      setSelectedYear((y) => y - 1);
      setSelectedMonth(12);
    } else {
      setSelectedMonth((m) => m - 1);
    }
    setCompareIds([]);
    setActiveDayNum(null);
  }

  function handleNextMonth() {
    if (selectedMonth === 12) {
      setSelectedYear((y) => y + 1);
      setSelectedMonth(1);
    } else {
      setSelectedMonth((m) => m + 1);
    }
    setCompareIds([]);
    setActiveDayNum(null);
  }

  function toggleCompare(dayOfMonth: number) {
    setCompareIds((prev) => {
      if (prev.includes(dayOfMonth)) {
        return prev.filter((id) => id !== dayOfMonth);
      }
      if (prev.length >= 3) return prev;
      return [...prev, dayOfMonth];
    });
  }

  // Active inspected day
  const inspectedDay = useMemo<GoodDayItem | null>(() => {
    if (activeDayNum !== null) {
      return candidateDays.find((d) => d.dayOfMonth === activeDayNum) ?? null;
    }
    return candidateDays[0] ?? null;
  }, [candidateDays, activeDayNum]);

  // Compared days list
  const comparedDays = useMemo<GoodDayItem[]>(() => {
    return candidateDays.filter((d) => compareIds.includes(d.dayOfMonth));
  }, [candidateDays, compareIds]);

  const activeActivityMeta = useMemo(() => {
    return (
      GOOD_DAY_ACTIVITIES.find((a) => a.id === selectedActivity) ??
      GOOD_DAY_ACTIVITIES[0]!
    );
  }, [selectedActivity]);

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
        {/* 01 HERO */}
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
              <span style={{ color: "var(--text-faint, #6E6656)" }}>/</span>
              <Link href={isVi ? "/cong-cu-mien-phi" : "/en/cong-cu-mien-phi"} style={{ color: "var(--text-faint, #6E6656)", textDecoration: "none" }}>
                {isVi ? "Công cụ miễn phí" : "Free tools"}
              </Link>
              <span style={{ color: "var(--text-faint, #6E6656)" }}>/</span>
              <span style={{ color: "var(--text-muted, #A79E8B)" }}>
                {isVi ? "Xem Ngày Tốt" : "Good Days"}
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
              {isVi ? "Xem Ngày Tốt" : "Good Days Selection"}
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
                ? "Lọc danh sách ngày hoàng đạo phù hợp theo từng loại việc cụ thể (cưới hỏi, khai trương, xuất hành, động thổ, ký kết, chuyển nhà), nêu đúng lý do và khung giờ hoàng đạo, không chấm điểm may rủi tổng hợp."
                : "Filter auspicious dates tailored for specific milestone activities (wedding, opening, travel, groundbreaking, contracts, moving) with transparent reasons and favorable hours."}
            </p>

            <div style={{ marginTop: "32px", display: "flex", gap: "16px", flexWrap: "wrap", alignItems: "center" }}>
              <a
                href="#bo-loc-ngay"
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
                {isVi ? "Tra cứu ngày tốt ngay" : "Filter good days now"}
              </a>
              <Link
                href={isVi ? "/lich-am" : "/en/lich-am"}
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
                {isVi ? "Xem toàn bộ lịch âm tháng" : "View full monthly lunar calendar"}
              </Link>
            </div>
          </div>
        </section>

        {/* 02 TÍNH NĂNG */}
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
              {isVi ? "02 · Minh bạch căn cứ" : "02 · Transparent rationale"}
            </div>
            <h2 style={{ margin: "14px 0 0", fontFamily: "var(--font-display, Georgia, serif)", fontWeight: 400, fontSize: "clamp(26px, 3.2vw, 34px)", color: "var(--text-heading, #F6F1E6)", maxWidth: "640px" }}>
              {isVi ? "Quy tắc rõ ràng, không điểm số ảo" : "Explicit rules, zero artificial ratings"}
            </h2>
            <div style={{ marginTop: "40px", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1px", background: "var(--border-hairline, #3A3227)", border: "1px solid var(--border-hairline, #3A3227)", borderRadius: "var(--radius-lg, 12px)", overflow: "hidden" }}>
              {freeResults.map((item) => (
                <div key={item.num} style={{ background: "var(--surface-panel, #1C1813)", padding: "26px", display: "flex", flexDirection: "column", gap: "10px" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    {renderSvgIcon(item.icon)}
                    <span style={{ fontFamily: "var(--font-mono, monospace)", fontSize: "11px", letterSpacing: "0.08em", color: "var(--text-faint, #6E6656)" }}>{item.num}</span>
                  </div>
                  <div style={{ marginTop: "6px", fontFamily: "var(--font-display, Georgia, serif)", fontSize: "17px", color: "var(--text-heading, #F6F1E6)" }}>{item.title}</div>
                  <p style={{ margin: 0, fontSize: "13.5px", lineHeight: 1.6, color: "var(--text-body, #DCD4C3)" }}>{item.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 03 BỘ LỌC VÀ DANH SÁCH NGÀY ỨNG VIÊN */}
        <section id="bo-loc-ngay" style={{ padding: "clamp(56px, 9vw, 96px) 0" }} data-screen-label="03-bo-loc">
          <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "0 clamp(20px, 5vw, 32px)" }}>
            <div style={{ fontFamily: "var(--font-mono, monospace)", fontSize: "11.5px", letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--teal, #6E9C97)" }}>
              {isVi ? "03 · Chọn việc & xem ngày" : "03 · Select activity & view dates"}
            </div>
            <h2 style={{ margin: "14px 0 0", fontFamily: "var(--font-display, Georgia, serif)", fontWeight: 400, fontSize: "clamp(26px, 3.2vw, 34px)", color: "var(--text-heading, #F6F1E6)", maxWidth: "680px" }}>
              {isVi ? "Danh sách ngày hoàng đạo phù hợp" : "Eligible auspicious candidate dates"}
            </h2>

            {/* Activity selection chips */}
            <div style={{ marginTop: "28px" }}>
              <span style={{ display: "block", fontSize: "13.5px", color: "var(--text-faint, #6E6656)", marginBottom: "12px", fontFamily: "var(--font-mono, monospace)", textTransform: "uppercase" }}>
                {isVi ? "1. Chọn loại công việc cần xem" : "1. Select milestone activity"}
              </span>
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                {GOOD_DAY_ACTIVITIES.map((act) => {
                  const isActive = act.id === selectedActivity;
                  return (
                    <button
                      key={act.id}
                      type="button"
                      aria-pressed={isActive}
                      onClick={() => {
                        setSelectedActivity(act.id);
                        setCompareIds([]);
                      }}
                      style={{
                        padding: "8px 16px",
                        borderRadius: "var(--radius-pill, 9999px)",
                        border: isActive ? "1px solid var(--gold-400, #D4AF37)" : "1px solid var(--border-hairline, #3A3227)",
                        background: isActive ? "rgba(201,164,77,0.18)" : "var(--surface-panel, #1C1813)",
                        color: isActive ? "var(--gold-400, #D4AF37)" : "var(--text-body, #DCD4C3)",
                        fontWeight: isActive ? 600 : 400,
                        fontSize: "14px",
                        cursor: "pointer",
                        transition: "all 0.15s ease",
                      }}
                    >
                      {isVi ? act.nameVi : act.nameEn}
                    </button>
                  );
                })}
              </div>
              <p style={{ margin: "8px 0 0", fontSize: "13px", color: "var(--text-muted, #A79E8B)" }}>
                {isVi ? activeActivityMeta.descVi : activeActivityMeta.nameEn}
              </p>
            </div>

            {/* Month & Year switcher */}
            <div style={{ marginTop: "24px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "16px", flexWrap: "wrap", borderTop: "1px solid var(--border-hairline, #3A3227)", paddingTop: "20px" }}>
              <div>
                <span style={{ display: "block", fontSize: "13.5px", color: "var(--text-faint, #6E6656)", marginBottom: "6px", fontFamily: "var(--font-mono, monospace)", textTransform: "uppercase" }}>
                  {isVi ? "2. Khoảng thời gian tra cứu" : "2. Timeframe"}
                </span>
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
                      width: "34px",
                      height: "34px",
                      display: "grid",
                      placeItems: "center",
                      cursor: "pointer",
                      fontSize: "16px",
                    }}
                  >
                    ‹
                  </button>
                  <span style={{ fontFamily: "var(--font-display, Georgia, serif)", fontSize: "17px", color: "var(--text-heading, #F6F1E6)", minWidth: "130px", textAlign: "center" }}>
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
                      width: "34px",
                      height: "34px",
                      display: "grid",
                      placeItems: "center",
                      cursor: "pointer",
                      fontSize: "16px",
                    }}
                  >
                    ›
                  </button>
                </div>
              </div>

              <div style={{ fontSize: "13.5px", color: "var(--text-muted, #A79E8B)" }}>
                {isVi
                  ? `Tìm thấy ${candidateDays.length} ngày hoàng đạo phù hợp trong tháng`
                  : `Found ${candidateDays.length} auspicious candidate dates`}
              </div>
            </div>

            {/* Candidate table */}
            <div style={{ marginTop: "24px", overflowX: "auto" }}>
              <table style={{ width: "100%", minWidth: "720px", borderCollapse: "collapse", fontSize: "13.5px" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border-hairline, #3A3227)", background: "var(--surface-deep, #0F0D0A)" }}>
                    <th scope="col" style={{ textAlign: "left", padding: "12px 14px", color: "var(--text-faint, #6E6656)", fontFamily: "var(--font-mono, monospace)", fontSize: "11px", textTransform: "uppercase" }}>
                      {isVi ? "Ngày dương" : "Solar date"}
                    </th>
                    <th scope="col" style={{ textAlign: "left", padding: "12px 14px", color: "var(--text-faint, #6E6656)", fontFamily: "var(--font-mono, monospace)", fontSize: "11px", textTransform: "uppercase" }}>
                      {isVi ? "Âm lịch" : "Lunar date"}
                    </th>
                    <th scope="col" style={{ textAlign: "left", padding: "12px 14px", color: "var(--text-faint, #6E6656)", fontFamily: "var(--font-mono, monospace)", fontSize: "11px", textTransform: "uppercase" }}>
                      {isVi ? "Can Chi ngày" : "Daily Can Chi"}
                    </th>
                    <th scope="col" style={{ textAlign: "left", padding: "12px 14px", color: "var(--text-faint, #6E6656)", fontFamily: "var(--font-mono, monospace)", fontSize: "11px", textTransform: "uppercase" }}>
                      {isVi ? "Sao trực nhật" : "Auspicious Star"}
                    </th>
                    <th scope="col" style={{ textAlign: "left", padding: "12px 14px", color: "var(--text-faint, #6E6656)", fontFamily: "var(--font-mono, monospace)", fontSize: "11px", textTransform: "uppercase" }}>
                      {isVi ? "Căn cứ phù hợp" : "Rationale"}
                    </th>
                    <th scope="col" style={{ textAlign: "center", padding: "12px 14px", color: "var(--text-faint, #6E6656)", fontFamily: "var(--font-mono, monospace)", fontSize: "11px", textTransform: "uppercase" }}>
                      {isVi ? "So sánh" : "Compare"}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {candidateDays.map((d) => {
                    const isSelectedCompare = compareIds.includes(d.dayOfMonth);
                    const isInspected = inspectedDay?.dayOfMonth === d.dayOfMonth;
                    return (
                      <tr
                        key={d.dayOfMonth}
                        onClick={() => setActiveDayNum(d.dayOfMonth)}
                        style={{
                          borderBottom: "1px solid var(--border-hairline, #3A3227)",
                          background: isInspected ? "rgba(201, 164, 77, 0.12)" : "transparent",
                          cursor: "pointer",
                          transition: "background 0.15s ease",
                        }}
                      >
                        <td style={{ padding: "14px", color: "var(--text-heading, #F6F1E6)", fontWeight: 600 }}>
                          {d.dayOfWeekName}, {d.dayOfMonth}/{selectedMonth}
                        </td>
                        <td style={{ padding: "14px", color: "var(--text-body, #DCD4C3)" }}>
                          {d.lunarDateFormatted}
                        </td>
                        <td style={{ padding: "14px", color: "var(--text-body, #DCD4C3)" }}>
                          {d.dayCanChi}
                        </td>
                        <td style={{ padding: "14px", color: "var(--gold-400, #D4AF37)", fontWeight: 500 }}>
                          {d.starName}
                        </td>
                        <td style={{ padding: "14px" }}>
                          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                            {d.reasons.map((r, i) => (
                              <span
                                key={i}
                                style={{
                                  fontSize: "11.5px",
                                  padding: "2px 8px",
                                  borderRadius: "var(--radius-sm, 3px)",
                                  background: "var(--surface-panel, #1C1813)",
                                  border: "1px solid var(--border-hairline, #3A3227)",
                                  color: "var(--text-body, #DCD4C3)",
                                }}
                              >
                                {r}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td style={{ padding: "14px", textAlign: "center" }} onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            aria-pressed={isSelectedCompare}
                            onClick={() => toggleCompare(d.dayOfMonth)}
                            style={{
                              fontFamily: "var(--font-mono, monospace)",
                              fontSize: "11px",
                              padding: "4px 10px",
                              borderRadius: "var(--radius-pill, 9999px)",
                              border: isSelectedCompare ? "1px solid var(--gold-400, #D4AF37)" : "1px solid var(--border-hairline, #3A3227)",
                              background: isSelectedCompare ? "rgba(201,164,77,0.2)" : "transparent",
                              color: isSelectedCompare ? "var(--gold-400, #D4AF37)" : "var(--text-muted, #A79E8B)",
                              cursor: "pointer",
                            }}
                          >
                            {isSelectedCompare ? (isVi ? "✓ Đã chọn" : "✓ Added") : (isVi ? "+ So sánh" : "+ Compare")}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Inspected day detail banner & bridge */}
            {inspectedDay && (
              <div
                style={{
                  marginTop: "32px",
                  background: "var(--surface-panel, #1C1813)",
                  border: "1px solid var(--border-hairline, #3A3227)",
                  borderRadius: "var(--radius-md, 8px)",
                  padding: "24px",
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                  gap: "24px",
                  alignItems: "center",
                }}
              >
                <div>
                  <span style={{ fontFamily: "var(--font-mono, monospace)", fontSize: "11.5px", textTransform: "uppercase", color: "var(--teal, #6E9C97)" }}>
                    {isVi ? "Chi tiết ngày đang xem" : "Inspected day"}
                  </span>
                  <h3 style={{ margin: "6px 0 4px", fontFamily: "var(--font-display, Georgia, serif)", fontSize: "22px", color: "var(--gold-400, #D4AF37)" }}>
                    {inspectedDay.dayOfWeekName}, {inspectedDay.solarDateString}
                  </h3>
                  <p style={{ margin: 0, fontSize: "14px", color: "var(--text-body, #DCD4C3)" }}>
                    {isVi
                      ? `Tức ngày ${inspectedDay.lunarDateFormatted} · Ngày ${inspectedDay.dayCanChi} (Hoàng Đạo: ${inspectedDay.starName})`
                      : `Lunar ${inspectedDay.lunarDateFormatted} · ${inspectedDay.dayCanChi} (Auspicious: ${inspectedDay.starName})`}
                  </p>
                  <div style={{ marginTop: "12px", display: "flex", gap: "6px", flexWrap: "wrap", alignItems: "center" }}>
                    <span style={{ fontSize: "12.5px", color: "var(--text-faint, #6E6656)" }}>{isVi ? "Giờ tốt:" : "Good hours:"}</span>
                    {inspectedDay.goodHours.map((h, i) => (
                      <span
                        key={i}
                        style={{
                          fontSize: "12px",
                          padding: "2px 8px",
                          borderRadius: "var(--radius-pill, 9999px)",
                          background: "rgba(201,164,77,0.12)",
                          color: "var(--gold-400, #D4AF37)",
                          border: "1px solid rgba(201,164,77,0.3)",
                        }}
                      >
                        {h}
                      </span>
                    ))}
                  </div>
                </div>

                <div style={{ borderLeft: "1px solid var(--border-hairline, #3A3227)", paddingLeft: "24px" }}>
                  <p style={{ margin: "0 0 12px", fontSize: "13.5px", color: "var(--text-muted, #A79E8B)", lineHeight: 1.5 }}>
                    {isVi
                      ? "Ngày hoàng đạo tốt cho thiên thời chung. Để biết ngày này có trợ lực hay xung kỵ với bản mệnh của bạn:"
                      : "Auspicious days benefit general circumstances. To evaluate harmony with your natal chart:"}
                  </p>
                  <Link
                    href={
                      isVi
                        ? `/tao-la-so/tu-vi?birthDay=${inspectedDay.dayOfMonth}&birthMonth=${selectedMonth}&birthYear=${selectedYear}`
                        : `/en/tao-la-so/tu-vi?birthDay=${inspectedDay.dayOfMonth}&birthMonth=${selectedMonth}&birthYear=${selectedYear}`
                    }
                    style={{
                      display: "inline-block",
                      padding: "10px 20px",
                      borderRadius: "var(--radius-sm, 4px)",
                      background: "linear-gradient(103deg, #9A7730 0%, #F2DCA0 34%, #C9A44D 58%, #A8842F 100%)",
                      color: "#0F0D0A",
                      fontWeight: 600,
                      fontSize: "13.5px",
                      textDecoration: "none",
                    }}
                  >
                    {isVi ? "Xem ngày này trên lá số của bạn" : "Check date against your chart"}
                  </Link>
                </div>
              </div>
            )}

            {/* Comparison Table (when 2 or 3 days selected) */}
            {comparedDays.length > 0 && (
              <div style={{ marginTop: "48px", borderTop: "1px solid var(--border-hairline, #3A3227)", paddingTop: "32px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                  <h3 style={{ margin: 0, fontFamily: "var(--font-display, Georgia, serif)", fontSize: "20px", color: "var(--text-heading, #F6F1E6)" }}>
                    {isVi ? `Bảng đối chiếu ${comparedDays.length} ngày đã chọn` : `Side-by-side comparison (${comparedDays.length} dates)`}
                  </h3>
                  <button
                    type="button"
                    onClick={() => setCompareIds([])}
                    style={{
                      background: "transparent",
                      border: "none",
                      color: "var(--text-faint, #6E6656)",
                      fontSize: "12px",
                      textDecoration: "underline",
                      cursor: "pointer",
                    }}
                  >
                    {isVi ? "Xoá so sánh" : "Clear comparison"}
                  </button>
                </div>

                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", minWidth: "600px", borderCollapse: "collapse", fontSize: "13.5px" }}>
                    <thead>
                      <tr style={{ borderBottom: "1px solid var(--border-hairline, #3A3227)" }}>
                        <th scope="col" style={{ textAlign: "left", padding: "10px 12px", color: "var(--text-faint, #6E6656)", fontFamily: "var(--font-mono, monospace)", fontSize: "11px", textTransform: "uppercase" }}>
                          {isVi ? "Tiêu chí" : "Criteria"}
                        </th>
                        {comparedDays.map((d) => (
                          <th key={d.dayOfMonth} scope="col" style={{ textAlign: "left", padding: "10px 12px", color: "var(--gold-400, #D4AF37)", fontFamily: "var(--font-display, Georgia, serif)", fontSize: "15px" }}>
                            {d.dayOfWeekName}, {d.dayOfMonth}/{selectedMonth}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      <tr style={{ borderBottom: "1px solid var(--border-hairline, #3A3227)" }}>
                        <td style={{ padding: "12px", color: "var(--text-faint, #6E6656)" }}>{isVi ? "Âm lịch" : "Lunar date"}</td>
                        {comparedDays.map((d) => (
                          <td key={d.dayOfMonth} style={{ padding: "12px", color: "var(--text-body, #DCD4C3)" }}>{d.lunarDateFormatted}</td>
                        ))}
                      </tr>
                      <tr style={{ borderBottom: "1px solid var(--border-hairline, #3A3227)" }}>
                        <td style={{ padding: "12px", color: "var(--text-faint, #6E6656)" }}>{isVi ? "Can Chi" : "Can Chi"}</td>
                        {comparedDays.map((d) => (
                          <td key={d.dayOfMonth} style={{ padding: "12px", color: "var(--text-body, #DCD4C3)" }}>{d.dayCanChi}</td>
                        ))}
                      </tr>
                      <tr style={{ borderBottom: "1px solid var(--border-hairline, #3A3227)" }}>
                        <td style={{ padding: "12px", color: "var(--text-faint, #6E6656)" }}>{isVi ? "Sao trực" : "Star"}</td>
                        {comparedDays.map((d) => (
                          <td key={d.dayOfMonth} style={{ padding: "12px", color: "var(--gold-400, #D4AF37)" }}>{d.starName} (Hoàng Đạo)</td>
                        ))}
                      </tr>
                      <tr style={{ borderBottom: "1px solid var(--border-hairline, #3A3227)" }}>
                        <td style={{ padding: "12px", color: "var(--text-faint, #6E6656)" }}>{isVi ? "Tiết khí" : "Solar term"}</td>
                        {comparedDays.map((d) => (
                          <td key={d.dayOfMonth} style={{ padding: "12px", color: "var(--text-body, #DCD4C3)" }}>{d.solarTerm || "—"}</td>
                        ))}
                      </tr>
                      <tr style={{ borderBottom: "1px solid var(--border-hairline, #3A3227)" }}>
                        <td style={{ padding: "12px", color: "var(--text-faint, #6E6656)" }}>{isVi ? "Giờ tốt" : "Good hours"}</td>
                        {comparedDays.map((d) => (
                          <td key={d.dayOfMonth} style={{ padding: "12px", color: "var(--text-body, #DCD4C3)" }}>{d.goodHours.join(", ")}</td>
                        ))}
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div style={{ marginTop: "56px" }}>
              <FreeToolCrossSellBanner locale={locale} tool="good-days" />
            </div>
          </div>
        </section>

        {/* 04 THUẬT NGỮ */}
        <section style={{ padding: "clamp(48px, 8vw, 88px) 0", background: "var(--surface-deep, #0F0D0A)", borderTop: "1px solid var(--border-hairline, #3A3227)", borderBottom: "1px solid var(--border-hairline, #3A3227)" }} data-screen-label="04-thuat-ngu">
          <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "0 clamp(20px, 5vw, 32px)" }}>
            <div style={{ fontFamily: "var(--font-mono, monospace)", fontSize: "11.5px", letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--teal, #6E9C97)" }}>{isVi ? "04 · Thuật ngữ cốt lõi" : "04 · Core terminology"}</div>
            <h2 style={{ margin: "14px 0 0", fontFamily: "var(--font-display, Georgia, serif)", fontWeight: 400, fontSize: "clamp(26px, 3.2vw, 34px)", color: "var(--text-heading, #F6F1E6)", maxWidth: "640px" }}>
              {isVi ? "Hiểu đúng các khái niệm chọn ngày" : "Key concepts for date selection"}
            </h2>
            <div style={{ marginTop: "36px", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1px", background: "var(--border-hairline, #3A3227)", border: "1px solid var(--border-hairline, #3A3227)", borderRadius: "var(--radius-lg, 12px)", overflow: "hidden" }}>
              {glossaryItems.map((g, idx) => (
                <div key={idx} style={{ background: "var(--surface-panel, #1C1813)", padding: "26px" }}>
                  {renderSvgIcon(g.icon)}
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
              {isVi ? "Cơ sở lọc ngày và giới hạn" : "Date filtering basis and limitations"}
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
              {faqItems.map((f, idx) => (
                <div key={idx} style={{ background: "var(--surface-panel, #1C1813)", border: "1px solid var(--border-hairline, #3A3227)", borderRadius: "var(--radius-md, 8px)", padding: "24px" }}>
                  <h3 style={{ margin: 0, fontFamily: "var(--font-display, Georgia, serif)", fontSize: "17px", color: "var(--text-heading, #F6F1E6)" }}>{f.q}</h3>
                  <p style={{ margin: "12px 0 0", fontSize: "14px", lineHeight: 1.6, color: "var(--text-body, #DCD4C3)" }}>{f.a}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
