"use client";

import React, { useState } from "react";
import Link from "next/link";

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

type DayDetailRow = {
  label: string;
  value: string;
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
  { num: "01", icon: "calendar-day", title: "Âm–dương song song", body: "Mỗi ngày hiển thị cả ngày dương và ngày âm tương ứng, không cần tra riêng." },
  { num: "02", icon: "compass", title: "Can chi ngày", body: "Xem cặp Thiên Can – Địa Chi của bất kỳ ngày nào trong lưới tháng." },
  { num: "03", icon: "scroll", title: "Quy đổi hai chiều", body: "Nhập một ngày dương để ra ngày âm, hoặc ngược lại." },
  { num: "04", icon: "book-open", title: "Tiết khí trong năm", body: "24 tiết khí hiển thị đúng ngày rơi vào, dùng chung với Bát Tự." },
  { num: "05", icon: "map-pin", title: "Theo đúng múi giờ Việt Nam", body: "Quy đổi tính theo múi giờ GMT+7, nêu rõ nếu có ngoại lệ lịch sử." },
  { num: "06", icon: "share", title: "In và chia sẻ một ngày", body: "Xuất một ngày cụ thể kèm đầy đủ căn cứ quy đổi." },
];

const FREE_RESULTS_EN: readonly TrustItem[] = [
  { num: "01", icon: "calendar-day", title: "Parallel solar-lunar dates", body: "Every calendar day displays both solar and lunar equivalents side by side without lookup hurdles." },
  { num: "02", icon: "compass", title: "Daily Can Chi", body: "Inspect the Heavenly Stem and Earthly Branch pair for any day across the monthly grid." },
  { num: "03", icon: "scroll", title: "Two-way conversion", body: "Input a solar date to retrieve the lunar date, or convert backwards instantly." },
  { num: "04", icon: "book-open", title: "Solar terms of the year", body: "Accurately places the 24 solar terms on their transition dates, aligned with BaZi." },
  { num: "05", icon: "map-pin", title: "Exact Vietnam timezone", body: "Calculations reference GMT+7, with transparent disclosure of historical timezone shifts." },
  { num: "06", icon: "share", title: "Print and share a day", body: "Export an individual day accompanied by complete calculation and conversion rationale." },
];

const DAY_DETAILS_VI: readonly DayDetailRow[] = [
  { label: "Ngày dương", value: "Thứ Bảy (minh hoạ)" },
  { label: "Ngày âm", value: "01 (minh hoạ)" },
  { label: "Can chi ngày", value: "Mậu Thân" },
  { label: "Tiết khí", value: "Không rơi đúng tiết khí" },
  { label: "Múi giờ", value: "GMT+7 (Việt Nam)" },
];

const DAY_DETAILS_EN: readonly DayDetailRow[] = [
  { label: "Solar date", value: "Saturday (illustrative)" },
  { label: "Lunar date", value: "01 (illustrative)" },
  { label: "Daily Can Chi", value: "Mau Than" },
  { label: "Solar term", value: "Does not fall on transition" },
  { label: "Timezone", value: "GMT+7 (Vietnam)" },
];

const GLOSSARY_ITEMS_VI: readonly GlossaryItem[] = [
  { icon: "compass", term: "Can chi ngày", body: "Mỗi ngày mang một cặp Thiên Can – Địa Chi lặp lại theo chu kỳ 60 ngày, dùng để đối chiếu hợp/xung và luận giải Bát Tự." },
  { icon: "calendar-day", term: "Tiết khí", body: "24 mốc thời gian trong năm dương lịch (Lập Xuân, Xuân Phân...) dùng làm ranh giới tháng trong nhiều cách tính Bát Tự." },
  { icon: "scroll", term: "Tháng nhuận", body: "Lịch âm thỉnh thoảng có một tháng lặp lại (tháng nhuận) để đồng bộ với chu kỳ mặt trời — không phải lỗi hiển thị." },
  { icon: "help-circle", term: "Lịch âm–dương song song", body: "Cách trình bày một ngày theo cả lịch dương (mặt trời) và lịch âm (mặt trăng) cùng lúc, phổ biến trong lịch Việt Nam truyền thống." },
];

const GLOSSARY_ITEMS_EN: readonly GlossaryItem[] = [
  { icon: "compass", term: "Daily Can Chi", body: "Each day carries a Stem-Branch pair repeating in a 60-day cycle, utilized for compatibility evaluation and BaZi interpretation." },
  { icon: "calendar-day", term: "Solar terms", body: "24 seasonal markers across the solar year serving as month boundaries in BaZi calculation." },
  { icon: "scroll", term: "Leap month", body: "The lunar calendar periodically inserts an intercalary month to maintain solar synchrony — not an algorithmic rendering flaw." },
  { icon: "help-circle", term: "Parallel solar-lunar calendar", body: "Simultaneous dual-calendar display common throughout traditional Vietnamese civil records." },
];

const METHOD_ROWS_VI: readonly MethodRow[] = [
  { label: "Cơ sở quy đổi", value: "Thuật toán quy đổi âm–dương lịch chuẩn, tính theo múi giờ Việt Nam (GMT+7)." },
  { label: "Phạm vi hỗ trợ", value: "Dự kiến hỗ trợ quy đổi cho khoảng thời gian hiện đại; giới hạn cụ thể sẽ công bố khi ra mắt." },
  { label: "Vai trò của AI", value: "Trình bày kết quả quy đổi bằng tiếng Việt — không tự suy luận ngày âm khi chưa qua thuật toán." },
];

const METHOD_ROWS_EN: readonly MethodRow[] = [
  { label: "Conversion foundation", value: "Standard astronomical lunar-solar algorithms calibrated to Vietnam timezone (GMT+7)." },
  { label: "Coverage scope", value: "Targeted coverage for modern chronological periods; boundaries will be disclosed upon release." },
  { label: "Role of AI", value: "Presents converted calendar metrics in clear Vietnamese — never improvises dates without algorithmic verification." },
];

const LIMIT_ITEMS_VI: readonly string[] = [
  "Lưới tháng ở trên là ví dụ minh hoạ cách hiển thị, không phải kết quả quy đổi từ một tháng thật.",
  "Quy đổi âm–dương lịch có thể khác nhau giữa các nguồn với quy ước tính múi giờ khác nhau — Lá Số Việt sẽ công bố rõ quy ước đang dùng.",
  "Không có gợi ý ngày tốt/xấu trong công cụ này — muốn xem ngày phù hợp cho một việc cụ thể, dùng công cụ Xem Ngày Tốt riêng.",
];

const LIMIT_ITEMS_EN: readonly string[] = [
  "The monthly grid above demonstrates display layout only, not an algorithmic conversion from an actual calendar month.",
  "Lunar-solar conversions may vary across publications using divergent historic timezone offsets — La So Viet will publicly state its baseline.",
  "This utility contains no auspicious date recommendations — for event-specific selection, consult the dedicated Good Days tool.",
];

const FAQ_ITEMS_VI: readonly FaqItem[] = [
  { num: "01", q: "Lịch Âm khác Xem Ngày Tốt ở điểm nào?", a: "Lịch Âm chỉ hiển thị và quy đổi ngày tháng, can chi, tiết khí — không đánh giá ngày nào phù hợp cho việc gì. Xem Ngày Tốt là công cụ riêng để lọc ngày theo mục đích cụ thể." },
  { num: "02", q: "Tháng mẫu ở trên có đúng với tháng thật không?", a: "Không. Đây là ví dụ minh hoạ cách hiển thị lưới tháng và quy đổi, không phải kết quả tính từ một tháng dương lịch thật." },
  { num: "03", q: "Khi nào Lịch Âm ra mắt?", a: "Chưa có ngày cụ thể. Lá Số Việt đang hoàn thiện thuật toán quy đổi trước khi phát hành." },
  { num: "04", q: "Lịch Âm có tính đúng cho các năm trước 1900 không?", a: "Phạm vi hỗ trợ chính xác sẽ được công bố cụ thể khi ra mắt — không giả định hỗ trợ cho mọi khoảng thời gian." },
];

const FAQ_ITEMS_EN: readonly FaqItem[] = [
  { num: "01", q: "How does Lunar Calendar differ from Good Days?", a: "Lunar Calendar presents and converts dates, Can Chi, and solar terms without evaluating suitability. Good Days is a dedicated tool to filter dates for specific activities." },
  { num: "02", q: "Is the sample month above identical to a real calendar month?", a: "No. It is an illustrative demonstration of dual calendar layout and conversion display, not calculated from an actual calendar month." },
  { num: "03", q: "When will Lunar Calendar launch?", a: "No specific date yet. La So Viet is finalizing the conversion algorithms prior to release." },
  { num: "04", q: "Does Lunar Calendar calculate accurately for years prior to 1900?", a: "Precise supported date ranges will be formally announced at launch — support across arbitrary historic eras is not assumed." },
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
    case "help-circle":
      return (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="10" />
          <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
      );
    case "calendar-day":
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
  const [faqOpen, setFaqOpen] = useState<Record<number, boolean>>({ 0: true });

  const toggleFaq = (index: number) => {
    setFaqOpen((prev) => ({ ...prev, [index]: !prev[index] }));
  };

  const freeResults = isVi ? FREE_RESULTS_VI : FREE_RESULTS_EN;
  const dayDetailRows = isVi ? DAY_DETAILS_VI : DAY_DETAILS_EN;
  const glossaryItems = isVi ? GLOSSARY_ITEMS_VI : GLOSSARY_ITEMS_EN;
  const methodRows = isVi ? METHOD_ROWS_VI : METHOD_ROWS_EN;
  const limitItems = isVi ? LIMIT_ITEMS_VI : LIMIT_ITEMS_EN;
  const faqs = isVi ? FAQ_ITEMS_VI : FAQ_ITEMS_EN;

  const weekdayLabels = isVi ? ["CN", "T2", "T3", "T4", "T5", "T6", "T7"] : ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const lunarSeq = [18,19,20,21,22,23,24,25,26,27,28,29,30,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22];
  const monthCells = [];
  for (let i = 0; i < 35; i++) {
    const solarDay = i - 2;
    const inMonth = solarDay >= 1 && solarDay <= 30;
    monthCells.push({
      solar: inMonth ? String(solarDay) : "",
      lunar: inMonth ? String(lunarSeq[i]) : "",
      bg: inMonth ? "var(--surface-panel, #1C1813)" : "var(--surface-deep, #0F0D0A)",
      solarColor: inMonth ? "var(--text-heading, #F6F1E6)" : "var(--text-faint, #6E6656)",
    });
  }

  const homeHref = isVi ? "/" : "/en";
  const tuviHref = isVi ? "/tu-vi" : "/en/tu-vi";
  const freeToolsHref = isVi ? "/cong-cu-mien-phi" : "/en/cong-cu-mien-phi";
  const kienthucHref = isVi ? "/kien-thuc" : "/en/kien-thuc";
  const loginHref = isVi ? "/dang-nhap" : "/en/dang-nhap";

  return (
    <div
      className={className}
      data-screen-label="lich-am"
      style={{
        fontFamily: "var(--font-ui, system-ui, sans-serif)",
        color: "var(--text-body, #DCD4C3)",
        backgroundColor: "var(--surface-canvas, #15120E)",
        minHeight: "100vh",
      }}
    >
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 40,
          background: "var(--surface-deep, #0F0D0A)",
          borderBottom: "1px solid var(--border-hairline, #3A3227)",
        }}
      >
        <div
          style={{
            maxWidth: "1200px",
            margin: "0 auto",
            padding: "0 clamp(20px, 5vw, 32px)",
            height: "72px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "24px",
          }}
        >
          <Link
            href={homeHref}
            style={{
              fontFamily: "var(--font-display, Georgia, serif)",
              fontSize: "22px",
              color: "var(--text-heading, #F6F1E6)",
              textDecoration: "none",
              letterSpacing: "0.01em",
            }}
          >
            {isVi ? "Lá Số Việt" : "La So Viet"}
          </Link>
          <nav style={{ display: "flex", gap: "24px", fontSize: "14px", flexWrap: "wrap" }}>
            <Link href={homeHref} style={{ color: "var(--text-body, #DCD4C3)", textDecoration: "none" }}>
              {isVi ? "Trang chủ" : "Home"}
            </Link>
            <Link href={tuviHref} style={{ color: "var(--text-body, #DCD4C3)", textDecoration: "none" }}>
              {isVi ? "Tử Vi" : "Zi Wei"}
            </Link>
            <Link href={kienthucHref} style={{ color: "var(--text-body, #DCD4C3)", textDecoration: "none" }}>
              {isVi ? "Kiến thức" : "Knowledge"}
            </Link>
            <Link
              href={freeToolsHref}
              style={{
                color: "var(--teal, #6E9C97)",
                textDecoration: "none",
                borderBottom: "1px solid var(--teal, #6E9C97)",
                paddingBottom: "2px",
              }}
            >
              {isVi ? "Công cụ miễn phí" : "Free tools"}
            </Link>
          </nav>
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <Link href={loginHref} style={{ color: "var(--text-body, #DCD4C3)", textDecoration: "none", fontSize: "14px" }}>
              {isVi ? "Đăng nhập" : "Log in"}
            </Link>
            <Link
              href={tuviHref}
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                minHeight: "40px",
                padding: "0 16px",
                borderRadius: "var(--radius-sm, 4px)",
                background: "linear-gradient(103deg, #9A7730 0%, #F2DCA0 34%, #C9A44D 58%, #A8842F 100%)",
                color: "#0F0D0A",
                fontWeight: 600,
                fontSize: "13.5px",
                textDecoration: "none",
              }}
            >
              {isVi ? "Lập lá số Tử Vi" : "Build Zi Wei chart"}
            </Link>
          </div>
        </div>
      </header>

      <main>
        {/* 01 HERO */}
        <section
          style={{ padding: "clamp(48px, 8vw, 88px) 0 clamp(48px, 7vw, 72px)" }}
          data-screen-label="01-hero"
        >
          <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "0 clamp(20px, 5vw, 32px)" }}>
            <nav
              aria-label="Breadcrumb"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                fontSize: "13.5px",
                color: "var(--text-faint, #6E6656)",
                marginBottom: "32px",
              }}
            >
              <Link href={homeHref} style={{ color: "var(--text-faint, #6E6656)", textDecoration: "none" }}>
                {isVi ? "Trang chủ" : "Home"}
              </Link>
              <ChevronRightIcon size={14} color="var(--text-faint, #6E6656)" />
              <Link href={freeToolsHref} style={{ color: "var(--text-faint, #6E6656)", textDecoration: "none" }}>
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
              {isVi ? "Sắp ra mắt" : "Coming soon"}
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
              {isVi ? "Lịch Âm" : "Lunar Calendar"}
            </h1>

            <p
              style={{
                margin: "20px 0 0",
                maxWidth: "600px",
                fontSize: "18px",
                lineHeight: 1.6,
                color: "var(--text-body, #DCD4C3)",
              }}
            >
              {isVi
                ? "Xem ngày âm và ngày dương song song, can chi của ngày, tiết khí và quy đổi hai chiều — không cần lật lịch giấy hay nhớ công thức quy đổi."
                : "View solar and lunar dates side by side, inspect daily Can Chi, identify seasonal solar terms, and perform two-way conversions without physical calendars or manual conversion formulas."}
            </p>

            <div style={{ marginTop: "32px", display: "flex", gap: "16px", flexWrap: "wrap", alignItems: "center" }}>
              <Link
                href={tuviHref}
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
                {isVi ? "Lập lá số Tử Vi miễn phí" : "Build free Zi Wei chart"}
              </Link>
              <a
                href="#thang-mau"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  fontSize: "14.5px",
                  color: "var(--text-body, #DCD4C3)",
                  textDecoration: "none",
                }}
              >
                {isVi ? "Xem tháng mẫu" : "View sample month"}
                <ChevronRightIcon size={16} color="var(--text-body, #DCD4C3)" />
              </a>
            </div>
          </div>
        </section>

        {/* 02 NHẬN ĐƯỢC GÌ */}
        <section
          style={{
            padding: "clamp(48px, 8vw, 88px) 0",
            background: "var(--surface-deep, #0F0D0A)",
            borderTop: "1px solid var(--border-hairline, #3A3227)",
            borderBottom: "1px solid var(--border-hairline, #3A3227)",
          }}
          data-screen-label="02-nhan-duoc-gi"
        >
          <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "0 clamp(20px, 5vw, 32px)" }}>
            <div style={{ fontFamily: "var(--font-mono, monospace)", fontSize: "11.5px", letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--teal, #6E9C97)" }}>
              {isVi ? "02 · Khi ra mắt" : "02 · At launch"}
            </div>
            <h2 style={{ margin: "14px 0 0", fontFamily: "var(--font-display, Georgia, serif)", fontWeight: 400, fontSize: "clamp(26px, 3.2vw, 34px)", color: "var(--text-heading, #F6F1E6)", maxWidth: "640px" }}>
              {isVi ? "Bạn sẽ nhận được gì" : "What you will receive"}
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

        {/* 03 THÁNG MẪU */}
        <section id="thang-mau" style={{ padding: "clamp(56px, 9vw, 96px) 0" }} data-screen-label="03-thang-mau">
          <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "0 clamp(20px, 5vw, 32px)" }}>
            <div style={{ fontFamily: "var(--font-mono, monospace)", fontSize: "11.5px", letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--teal, #6E9C97)" }}>
              {isVi ? "03 · Ví dụ minh hoạ" : "03 · Illustrative example"}
            </div>
            <h2 style={{ margin: "14px 0 0", fontFamily: "var(--font-display, Georgia, serif)", fontWeight: 400, fontSize: "clamp(26px, 3.2vw, 34px)", color: "var(--text-heading, #F6F1E6)", maxWidth: "680px" }}>
              {isVi ? "Một tháng lịch trông như thế nào" : "What a calendar month looks like"}
            </h2>
            <p style={{ margin: "16px 0 0", maxWidth: "680px", fontSize: "16px", lineHeight: 1.65, color: "var(--text-muted, #A79E8B)" }}>
              {isVi
                ? "Lưới tháng minh hoạ dưới đây — số lớn là ngày dương, số nhỏ là ngày âm tương ứng. Không phải quy đổi từ một tháng thật."
                : "The monthly grid below demonstrates layout — larger numbers denote solar dates, smaller numbers indicate lunar counterparts. Not computed from a real calendar month."}
            </p>
            <div style={{ marginTop: "40px", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "40px", alignItems: "start" }}>
              <div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "1px", background: "var(--border-hairline, #3A3227)", border: "1px solid var(--border-hairline, #3A3227)", borderRadius: "var(--radius-md, 8px)", overflow: "hidden" }}>
                  {weekdayLabels.map((w, idx) => (
                    <div key={idx} style={{ background: "var(--surface-deep, #0F0D0A)", padding: "8px", textAlign: "center", fontFamily: "var(--font-mono, monospace)", fontSize: "10.5px", letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--text-faint, #6E6656)" }}>
                      {w}
                    </div>
                  ))}
                  {monthCells.map((c, idx) => (
                    <div key={idx} style={{ background: c.bg, padding: "10px 8px", minHeight: "64px", display: "flex", flexDirection: "column", gap: "2px", boxSizing: "border-box" }}>
                      <span style={{ fontFamily: "var(--font-display, Georgia, serif)", fontSize: "15px", color: c.solarColor }}>{c.solar}</span>
                      <span style={{ fontFamily: "var(--font-mono, monospace)", fontSize: "10.5px", color: "var(--text-faint, #6E6656)" }}>{c.lunar}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h3 style={{ margin: "0 0 14px", fontFamily: "var(--font-display, Georgia, serif)", fontSize: "18px", color: "var(--text-heading, #F6F1E6)" }}>
                  {isVi ? "Chi tiết một ngày (minh hoạ)" : "Single-day details (illustrative)"}
                </h3>
                <div style={{ background: "var(--surface-panel, #1C1813)", border: "1px solid var(--border-hairline, #3A3227)", borderRadius: "var(--radius-md, 8px)", padding: "24px", display: "grid", gap: "12px" }}>
                  {dayDetailRows.map((r, idx) => (
                    <div key={idx} style={{ display: "flex", justifyContent: "space-between", fontSize: "13.5px", paddingBottom: "10px", borderBottom: "1px solid var(--border-hairline, #3A3227)" }}>
                      <span style={{ color: "var(--text-faint, #6E6656)" }}>{r.label}</span>
                      <span style={{ color: "var(--text-heading, #F6F1E6)" }}>{r.value}</span>
                    </div>
                  ))}
                </div>
              </div>
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

        {/* 05 PHƯƠNG PHÁP & GIỚI HẠN */}
        <section style={{ padding: "clamp(56px, 9vw, 96px) 0" }} data-screen-label="05-phuong-phap-gioi-han">
          <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "0 clamp(20px, 5vw, 32px)" }}>
            <div style={{ fontFamily: "var(--font-mono, monospace)", fontSize: "11.5px", letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--teal, #6E9C97)" }}>{isVi ? "05 · Minh bạch phương pháp" : "05 · Transparent methodology"}</div>
            <h2 style={{ margin: "14px 0 0", fontFamily: "var(--font-display, Georgia, serif)", fontWeight: 400, fontSize: "clamp(26px, 3.2vw, 34px)", color: "var(--text-heading, #F6F1E6)", maxWidth: "680px" }}>
              {isVi ? "Cơ sở quy đổi và giới hạn" : "Conversion basis and boundaries"}
            </h2>
            <div style={{ marginTop: "36px", maxWidth: "760px" }}>
              {methodRows.map((m, idx) => (
                <div key={idx} style={{ display: "flex", gap: "24px", padding: "18px 0", borderTop: "1px solid var(--border-hairline, #3A3227)", alignItems: "baseline" }}>
                  <span style={{ flex: "none", width: "180px", fontFamily: "var(--font-mono, monospace)", fontSize: "12px", letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--text-muted, #A79E8B)" }}>{m.label}</span>
                  <span style={{ fontSize: "15px", lineHeight: 1.6, color: "var(--text-body, #DCD4C3)" }}>{m.value}</span>
                </div>
              ))}
            </div>
            <ul style={{ margin: "32px 0 0", padding: 0, listStyle: "none", display: "grid", gap: "14px", maxWidth: "760px", borderTop: "1px solid var(--border-hairline, #3A3227)", paddingTop: "24px" }}>
              {limitItems.map((li, idx) => (
                <li key={idx} style={{ display: "flex", gap: "12px", fontSize: "14.5px", lineHeight: 1.6, color: "var(--text-body, #DCD4C3)" }}>
                  <span style={{ color: "var(--text-faint, #6E6656)", flex: "none", marginTop: "3px" }}><ChevronRightIcon size={16} color="var(--text-faint, #6E6656)" /></span>
                  <span>{li}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* 06 FAQ + CTA */}
        <section style={{ padding: "clamp(56px, 9vw, 96px) 0", background: "var(--surface-deep, #0F0D0A)", borderTop: "1px solid var(--border-hairline, #3A3227)" }} data-screen-label="06-faq-cta">
          <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "0 clamp(20px, 5vw, 32px)" }}>
            <h2 style={{ margin: 0, fontFamily: "var(--font-display, Georgia, serif)", fontWeight: 400, fontSize: "clamp(26px, 3.2vw, 34px)", color: "var(--text-heading, #F6F1E6)" }}>{isVi ? "Câu hỏi thường gặp" : "Frequently asked questions"}</h2>
            <div style={{ marginTop: "24px", maxWidth: "760px" }}>
              {faqs.map((f, idx) => (
                <div key={f.num} style={{ borderBottom: "1px solid var(--border-hairline, #3A3227)", padding: "18px 0" }}>
                  <button type="button" onClick={() => toggleFaq(idx)} style={{ width: "100%", background: "transparent", border: "none", padding: 0, display: "flex", alignItems: "center", justifyContent: "space-between", gap: "16px", textAlign: "left", cursor: "pointer", color: "var(--text-heading, #F6F1E6)", fontSize: "16px", fontFamily: "var(--font-ui, system-ui, sans-serif)" }}>
                    <span style={{ display: "flex", gap: "12px", alignItems: "baseline" }}>
                      <span style={{ fontFamily: "var(--font-mono, monospace)", fontSize: "12px", color: "var(--teal, #6E9C97)" }}>{f.num}</span>
                      <span>{f.q}</span>
                    </span>
                    <span style={{ fontSize: "18px", color: "var(--text-muted, #A79E8B)", flex: "none" }}>{faqOpen[idx] ? "−" : "+"}</span>
                  </button>
                  {faqOpen[idx] && (
                    <p style={{ margin: "12px 0 0 28px", fontSize: "14.5px", lineHeight: 1.65, color: "var(--text-muted, #A79E8B)" }}>{f.a}</p>
                  )}
                </div>
              ))}
            </div>
            <div style={{ marginTop: "72px", padding: "48px", background: "var(--surface-panel, #1C1813)", border: "1px solid var(--border-hairline, #3A3227)", borderRadius: "var(--radius-lg, 12px)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "32px", flexWrap: "wrap" }}>
              <div style={{ maxWidth: "520px" }}>
                <h2 style={{ margin: 0, fontFamily: "var(--font-display, Georgia, serif)", fontWeight: 400, fontSize: "clamp(22px, 2.6vw, 28px)", color: "var(--text-heading, #F6F1E6)" }}>{isVi ? "Trong lúc chờ, xem lá số Tử Vi miễn phí" : "While waiting, explore your free Zi Wei chart"}</h2>
                <p style={{ margin: "10px 0 0", fontSize: "14.5px", lineHeight: 1.6, color: "var(--text-muted, #A79E8B)" }}>{isVi ? "Miễn phí, không cần tài khoản." : "Free of charge, no account required."}</p>
              </div>
              <Link href={tuviHref} style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", minHeight: "48px", padding: "0 24px", borderRadius: "var(--radius-sm, 4px)", background: "linear-gradient(103deg, #9A7730 0%, #F2DCA0 34%, #C9A44D 58%, #A8842F 100%)", color: "#0F0D0A", fontWeight: 600, fontSize: "14.5px", textDecoration: "none" }}>
                {isVi ? "Lập lá số Tử Vi miễn phí" : "Build free Zi Wei chart"}
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer style={{ borderTop: "1px solid var(--border-hairline, #3A3227)", padding: "48px 0 32px" }} data-screen-label="footer">
        <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "0 clamp(20px, 5vw, 32px)", display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "12px" }}>
          <span style={{ fontSize: "12.5px", color: "var(--text-faint, #6E6656)" }}>
            {isVi ? "© 2026 Lá Số Việt. Nội dung tham khảo văn hoá, không thay thế tư vấn chuyên môn." : "© 2026 La So Viet. Cultural reference content, not a substitute for professional counsel."}
          </span>
          <Link href={freeToolsHref} style={{ fontSize: "12.5px", color: "var(--text-faint, #6E6656)", textDecoration: "none" }}>
            {isVi ? "← Tất cả công cụ miễn phí" : "← All free tools"}
          </Link>
        </div>
      </footer>
    </div>
  );
}

export default LunarCalendarPreview;
