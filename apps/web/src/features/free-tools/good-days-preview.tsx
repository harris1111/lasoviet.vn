"use client";

import React, { useState } from "react";
import Link from "next/link";

export type GoodDaysPreviewProps = {
  locale: "vi" | "en";
  className?: string;
};

type FreeResultItem = {
  num: string;
  icon: string;
  title: string;
  body: string;
  bordered?: boolean;
};

type CandidateDay = {
  label: string;
  canchi: string;
  status: string;
  statusColor: string;
  reason: string;
};

type CompareRow = {
  label: string;
  values: string[];
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
  { num: "01", icon: "calendar-day", title: "Ngày ứng viên có lý do rõ", body: "Mỗi ngày đề xuất kèm đúng quy tắc đã dùng — Hoàng Đạo/Hắc Đạo, Tam Nương, hợp/xung tuổi." },
  { num: "02", icon: "compass", title: "Bộ lọc theo loại việc", body: "Cưới hỏi, khai trương, xuất hành, động thổ... mỗi loại việc có bộ quy tắc riêng." },
  { num: "03", icon: "scroll", title: "Xem dạng lịch hoặc danh sách", body: "Chuyển đổi giữa lưới tháng và danh sách theo trình tự thời gian." },
  { num: "04", icon: "book-open", title: "So sánh tối đa 3 ngày", body: "Đặt cạnh nhau các tiêu chí của từng ngày để tự cân nhắc." },
  { num: "05", icon: "help-circle", title: "Ngày loại trừ có giải thích", body: "Ngày không phù hợp cũng nêu rõ lý do, không chỉ đơn giản là ẩn đi." },
  { num: "06", icon: "shield-lock", title: "Không chấm điểm tổng hợp", body: "Không có điểm số \"tốt/xấu\" duy nhất cho một ngày.", bordered: false }
];

const FREE_RESULTS_EN: readonly FreeResultItem[] = [
  { num: "01", icon: "calendar-day", title: "Candidate dates with transparent reasons", body: "Each recommended date includes the exact rule applied — Auspicious/Inauspicious cycle, Tam Nuong, and birth year compatibility." },
  { num: "02", icon: "compass", title: "Activity-specific filtering", body: "Weddings, grand openings, departures, groundbreaking... each activity applies a dedicated rule set." },
  { num: "03", icon: "scroll", title: "Calendar grid or chronological list", body: "Switch seamlessly between monthly overview and chronological list views." },
  { num: "04", icon: "book-open", title: "Compare up to 3 candidate dates", body: "Evaluate key criteria side-by-side to make deliberate personal choices." },
  { num: "05", icon: "help-circle", title: "Excluded dates with clear explanations", body: "Unsuitable dates clearly state why they were excluded rather than disappearing silently." },
  { num: "06", icon: "shield-lock", title: "No composite fortune score", body: "No single aggregate \"good/bad\" score is ever assigned to a date.", bordered: false }
];

const CANDIDATE_DAYS_VI: readonly CandidateDay[] = [
  { label: "Ngày ứng viên 1", canchi: "Giáp Tý", status: "Hoàng Đạo", statusColor: "var(--teal, #6E9C97)", reason: "Không rơi vào Tam Nương; hợp tuổi Tý, Ngọ." },
  { label: "Ngày ứng viên 2", canchi: "Bính Dần", status: "Hoàng Đạo", statusColor: "var(--teal, #6E9C97)", reason: "Ngày Hoàng Đạo; cần lưu ý nếu gia chủ tuổi Thân." },
  { label: "Ngày ứng viên 3", canchi: "Kỷ Tỵ", status: "Hắc Đạo", statusColor: "var(--son, #ce5b45)", reason: "Rơi vào Tam Nương — loại khỏi danh sách đề xuất." },
  { label: "Ngày ứng viên 4", canchi: "Canh Ngọ", status: "Hoàng Đạo", statusColor: "var(--teal, #6E9C97)", reason: "Ngày Hoàng Đạo; không xung khắc với các tuổi phổ biến." }
];

const CANDIDATE_DAYS_EN: readonly CandidateDay[] = [
  { label: "Candidate date 1", canchi: "Giap Ty", status: "Auspicious", statusColor: "var(--teal, #6E9C97)", reason: "Not falling on Tam Nuong; favorable for Rat and Horse years." },
  { label: "Candidate date 2", canchi: "Binh Dan", status: "Auspicious", statusColor: "var(--teal, #6E9C97)", reason: "Auspicious day; caution recommended if homeowner was born in Monkey year." },
  { label: "Candidate date 3", canchi: "Ky Ty", status: "Inauspicious", statusColor: "var(--son, #ce5b45)", reason: "Falls on Tam Nuong — excluded from recommendation list." },
  { label: "Candidate date 4", canchi: "Canh Ngo", status: "Auspicious", statusColor: "var(--teal, #6E9C97)", reason: "Auspicious day; no severe clashes with common birth years." }
];

const COMPARE_COLS_VI = ["Ngày ứng viên 1", "Ngày ứng viên 2", "Ngày ứng viên 4"];
const COMPARE_COLS_EN = ["Candidate date 1", "Candidate date 2", "Candidate date 4"];

const COMPARE_ROWS_VI: readonly CompareRow[] = [
  { label: "Can chi ngày", values: ["Giáp Tý", "Bính Dần", "Canh Ngọ"] },
  { label: "Hoàng/Hắc Đạo", values: ["Hoàng Đạo", "Hoàng Đạo", "Hoàng Đạo"] },
  { label: "Tam Nương", values: ["Không", "Không", "Không"] },
  { label: "Lưu ý tuổi", values: ["Không có", "Tuổi Thân nên cân nhắc", "Không có"] }
];

const COMPARE_ROWS_EN: readonly CompareRow[] = [
  { label: "Day sexagenary stem-branch", values: ["Giap Ty", "Binh Dan", "Canh Ngo"] },
  { label: "Auspicious / Inauspicious", values: ["Auspicious", "Auspicious", "Auspicious"] },
  { label: "Tam Nuong taboo", values: ["None", "None", "None"] },
  { label: "Birth year note", values: ["None", "Monkey year should consider", "None"] }
];

const GLOSSARY_ITEMS_VI: readonly GlossaryItem[] = [
  { icon: "compass", term: "Ngày Hoàng Đạo / Hắc Đạo", body: "Hệ 12 trực gán cho từng ngày theo chu kỳ cố định, chia ngày thành nhóm \"Hoàng Đạo\" (thường được chọn) và \"Hắc Đạo\" (thường tránh) tuỳ việc." },
  { icon: "calendar-day", term: "Tam Nương", body: "Các ngày âm lịch cố định trong tháng (mùng 3, 7, 13, 18, 22, 27) theo quan niệm dân gian nên tránh khởi sự việc lớn." },
  { icon: "scroll", term: "Can chi ngày", body: "Mỗi ngày được gán một cặp Thiên Can – Địa Chi theo chu kỳ 60 ngày, dùng để đối chiếu hợp/xung với tuổi gia chủ." },
  { icon: "help-circle", term: "Giờ Hoàng Đạo", body: "Trong một ngày, một số khung giờ được xem là thuận lợi hơn theo cùng hệ quy tắc Hoàng Đạo/Hắc Đạo áp dụng cho ngày." }
];

const GLOSSARY_ITEMS_EN: readonly GlossaryItem[] = [
  { icon: "compass", term: "Auspicious / Inauspicious Days", body: "The 12 duty officers cycle assigns each day as Auspicious (favored) or Inauspicious (avoided) depending on the activity type." },
  { icon: "calendar-day", term: "Tam Nuong Taboo Days", body: "Specific lunar dates each month (3rd, 7th, 13th, 18th, 22nd, 27th) traditionally avoided when initiating major milestones." },
  { icon: "scroll", term: "Day Stem-Branch (Can Chi)", body: "Every day carries a pair of Heavenly Stem and Earthly Branch in a 60-day cycle to cross-reference harmony or clash with the owner." },
  { icon: "help-circle", term: "Auspicious Hours", body: "Within any day, specific two-hour windows are regarded as more favorable under the same twelve-officer framework." }
];

const METHOD_ROWS_VI: readonly MethodRow[] = [
  { label: "Phương pháp", value: "Quy tắc lịch vạn niên cổ truyền (Hoàng Đạo/Hắc Đạo, Tam Nương, hợp/xung Can Chi) — không quy đổi thành điểm số tổng hợp." },
  { label: "Phạm vi hỗ trợ", value: "Ban đầu tập trung các việc phổ biến: cưới hỏi, khai trương, xuất hành, động thổ." },
  { label: "Vai trò của AI", value: "Diễn giải và trình bày kết quả rule-based bằng tiếng Việt — không tự đặt ra quy tắc chọn ngày." }
];

const METHOD_ROWS_EN: readonly MethodRow[] = [
  { label: "Methodology", value: "Traditional perpetual calendar rules (Auspicious/Inauspicious, Tam Nuong, Stem-Branch compatibility) without composite numerical scoring." },
  { label: "Supported scope", value: "Initial release focuses on common milestones: weddings, business openings, travels, groundbreaking." },
  { label: "Role of AI", value: "Explaining and formatting rule-based results in natural language — never inventing date selection rules." }
];

const LIMIT_ITEMS_VI: readonly string[] = [
  "Kết quả diễn đạt là \"phù hợp hơn trong bộ quy tắc này\", không phải \"chắc chắn tốt\" hay \"đảm bảo may mắn\".",
  "Các trường phái xem ngày khác nhau có thể xếp hạng khác nhau cho cùng một ngày — Lá Số Việt công khai rõ bộ quy tắc đang dùng.",
  "Không thay thế tư vấn từ người có chuyên môn cho các quyết định quan trọng, tốn kém hoặc liên quan pháp lý.",
  "Ví dụ ở trên dùng tên ngày minh hoạ, không phải kết quả quy đổi từ lịch thật."
];

const LIMIT_ITEMS_EN: readonly string[] = [
  "Results are phrased as \"more suitable under this rule set\", never \"guaranteed success\" or \"ensured good fortune\".",
  "Different almanac schools may evaluate the same date differently — La So Viet explicitly documents the active rule set.",
  "This tool never replaces professional human consultation for major, expensive, or legally binding decisions.",
  "The examples above use illustrative date names, not real converted calendar data."
];

const FAQ_DATA_VI: readonly FaqItemData[] = [
  { q: "Xem Ngày Tốt có chấm điểm may rủi tổng hợp không?", a: "Không. Mỗi ngày được đánh giá theo từng quy tắc riêng (Hoàng Đạo/Hắc Đạo, Tam Nương, hợp/xung tuổi) và hiển thị rõ lý do — không gộp thành một điểm số duy nhất." },
  { q: "Ngày được đề xuất có đảm bảo kết quả tốt cho việc đó không?", a: "Không. Kết quả chỉ cho biết một ngày \"phù hợp hơn\" trong bộ quy tắc đang dùng, không phải lời đảm bảo về kết quả thực tế của việc bạn làm vào ngày đó." },
  { q: "Tôi có thể so sánh nhiều ngày cùng lúc không?", a: "Có, tối đa 3 ngày cùng lúc để bạn tự cân nhắc theo bảng so sánh." },
  { q: "Khi nào Xem Ngày Tốt ra mắt?", a: "Chưa có ngày cụ thể. Đây là một trong các công cụ được ưu tiên xây dựng sớm vì không cần hồ sơ sinh đầy đủ." },
  { q: "Ví dụ ở trên có phải ngày thật không?", a: "Không. Đây là ví dụ minh hoạ cách hiển thị kết quả, không phải kết quả quy đổi từ lịch thật." }
];

const FAQ_DATA_EN: readonly FaqItemData[] = [
  { q: "Does the Good Days tool give a composite fortune score?", a: "No. Each day is evaluated by explicit individual rules (Auspicious/Inauspicious, Tam Nuong, age compatibility) with stated reasons — never blended into a single score." },
  { q: "Does a recommended day guarantee positive outcomes?", a: "No. The result only indicates a day is \"more suitable\" under the active rule set, not a guarantee of practical outcomes." },
  { q: "Can I compare multiple candidate dates at once?", a: "Yes, up to 3 dates simultaneously to deliberate using side-by-side comparison." },
  { q: "When will the Good Days tool launch?", a: "No firm release date has been set. It is prioritized early because it does not require a full birth profile." },
  { q: "Are the sample dates real calendar dates?", a: "No. These are illustrative examples demonstrating presentation format, not live calendar calculations." }
];

function renderSvgIcon(name: string, size = 18, color = "currentColor") {
  switch (name) {
    case "chevron-right":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M9 5.5l6.5 6.5L9 18.5" />
        </svg>
      );
    case "calendar-day":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="4" y="5.5" width="16" height="14.5" rx="2" />
          <path d="M8.5 3.5v4M15.5 3.5v4M4 10.5h16M11.4 14.8h1.4" />
        </svg>
      );
    case "compass":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="8.2" />
          <path d="M15 9l-2.1 5.2-5.2 2.1 2.1-5.2L15 9z" />
          <circle cx="12" cy="12" r="0.8" fill={color} />
        </svg>
      );
    case "scroll":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M7 4h11.5v13a3 3 0 0 0 3 3H8a3 3 0 0 1-3-3V6" />
          <path d="M9.5 8.4h6.5M9.5 12.2h6.5" />
        </svg>
      );
    case "book-open":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M12 6.6C10.5 5.1 8.4 4.5 5 4.5v13c3.4 0 5.5.6 7 2 1.5-1.4 3.6-2 7-2v-13c-3.4 0-5.5.6-7 2.1z" />
          <path d="M12 6.6v12.9" />
        </svg>
      );
    case "help-circle":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="8.2" />
          <path d="M9.7 9.6a2.4 2.4 0 1 1 3.3 2.2c-.7.3-1 .9-1 1.6v.3" />
          <circle cx="12" cy="16.8" r="0.5" fill={color} />
        </svg>
      );
    case "shield-lock":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M12 3l7.5 3v5.6c0 4.4-3.2 7.1-7.5 8.4-4.3-1.3-7.5-4-7.5-8.4V6L12 3z" />
          <path d="M10 12.6h4v3h-4z" />
          <path d="M10.9 12.6v-1.2a1.1 1.1 0 0 1 2.2 0v1.2" />
        </svg>
      );
    case "chevron-down":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M5.5 9l6.5 6.5L18.5 9" />
        </svg>
      );
    default:
      return null;
  }
}

export function GoodDaysPreview({ locale, className }: GoodDaysPreviewProps) {
  const isVi = locale === "vi";
  const [insightStamped, setInsightStamped] = useState(false);
  const [faqOpen, setFaqOpen] = useState<Record<number, boolean>>({ 0: true });

  const freeResults = isVi ? FREE_RESULTS_VI : FREE_RESULTS_EN;
  const candidateDays = isVi ? CANDIDATE_DAYS_VI : CANDIDATE_DAYS_EN;
  const compareCols = isVi ? COMPARE_COLS_VI : COMPARE_COLS_EN;
  const compareRows = isVi ? COMPARE_ROWS_VI : COMPARE_ROWS_EN;
  const glossaryItems = isVi ? GLOSSARY_ITEMS_VI : GLOSSARY_ITEMS_EN;
  const methodRows = isVi ? METHOD_ROWS_VI : METHOD_ROWS_EN;
  const limitItems = isVi ? LIMIT_ITEMS_VI : LIMIT_ITEMS_EN;
  const faqs = isVi ? FAQ_DATA_VI : FAQ_DATA_EN;

  const toggleFaq = (idx: number) => {
    setFaqOpen((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  return (
    <div
      className={className}
      data-screen-label="ngay-tot"
      style={{
        fontFamily: "var(--font-ui)",
        color: "var(--text-body)",
        minHeight: "100vh",
        background: "var(--surface-canvas)",
      }}
    >
      {/* Header */}
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 40,
          background: "var(--surface-deep)",
          borderBottom: "1px solid var(--border-hairline)",
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
            href={isVi ? "/" : "/en"}
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "22px",
              color: "var(--text-heading)",
              textDecoration: "none",
              letterSpacing: "0.01em",
            }}
          >
            {isVi ? "Lá Số Việt" : "La So Viet"}
          </Link>
          <nav style={{ display: "flex", gap: "24px", fontSize: "14px", flexWrap: "wrap" }}>
            <Link href={isVi ? "/" : "/en"} style={{ color: "var(--text-body)", textDecoration: "none" }}>
              {isVi ? "Trang chủ" : "Home"}
            </Link>
            <Link href={isVi ? "/tu-vi" : "/en/tu-vi"} style={{ color: "var(--text-body)", textDecoration: "none" }}>
              {isVi ? "Tử Vi" : "Zi Wei"}
            </Link>
            <Link href={isVi ? "/kien-thuc" : "/en/kien-thuc"} style={{ color: "var(--text-body)", textDecoration: "none" }}>
              {isVi ? "Kiến thức" : "Knowledge"}
            </Link>
            <Link
              href={isVi ? "/cong-cu-mien-phi" : "/en/cong-cu-mien-phi"}
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
            <Link
              href={isVi ? "/dang-nhap" : "/en/dang-nhap"}
              style={{ color: "var(--text-body)", textDecoration: "none", fontSize: "14px" }}
            >
              {isVi ? "Đăng nhập" : "Sign in"}
            </Link>
            <Link
              href={isVi ? "/tu-vi" : "/en/tu-vi"}
              className="button button-small"
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                minHeight: "40px",
                padding: "0 20px",
                borderRadius: "var(--radius-sm, 4px)",
                fontFamily: "var(--font-ui)",
                fontWeight: 600,
                fontSize: "14px",
                textDecoration: "none",
                background: "var(--gold-gradient, linear-gradient(103deg, #9a7730, #f2dca0 34%, #c9a44d 58%, #a8842f))",
                color: "var(--surface-deep, #15120e)",
                border: "none",
                cursor: "pointer",
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
                color: "var(--text-faint)",
                marginBottom: "32px",
              }}
            >
              <Link href={isVi ? "/" : "/en"} style={{ color: "var(--text-faint)", textDecoration: "none" }}>
                {isVi ? "Trang chủ" : "Home"}
              </Link>
              {renderSvgIcon("chevron-right", 14, "var(--text-faint)")}
              <Link href={isVi ? "/cong-cu-mien-phi" : "/en/cong-cu-mien-phi"} style={{ color: "var(--text-faint)", textDecoration: "none" }}>
                {isVi ? "Công cụ miễn phí" : "Free tools"}
              </Link>
              {renderSvgIcon("chevron-right", 14, "var(--text-faint)")}
              <span style={{ color: "var(--text-muted)" }}>
                {isVi ? "Xem Ngày Tốt" : "Good Days"}
              </span>
            </nav>

            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                fontFamily: "var(--font-mono)",
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
                fontFamily: "var(--font-display)",
                fontWeight: 400,
                fontSize: "clamp(32px, 4.2vw, 44px)",
                lineHeight: 1.15,
                color: "var(--text-heading)",
              }}
            >
              {isVi ? "Xem Ngày Tốt" : "Good Days Selection"}
            </h1>

            <p
              style={{
                margin: "20px 0 0",
                maxWidth: "600px",
                fontSize: "18px",
                lineHeight: 1.6,
                color: "var(--text-body)",
              }}
            >
              {isVi
                ? "Chọn loại việc (cưới hỏi, khai trương, xuất hành...) và một khoảng thời gian, nhận về danh sách ngày kèm đúng lý do — Hoàng Đạo/Hắc Đạo, Tam Nương, hợp/xung tuổi — thay vì một điểm số \"tốt/xấu\" gộp chung."
                : "Select your activity (wedding, grand opening, departure...) and a timeframe to receive candidate dates with clear rationale — Auspicious/Inauspicious duty officers, Tam Nuong, and birth year compatibility — instead of an arbitrary composite fortune score."}
            </p>

            <div style={{ marginTop: "32px", display: "flex", gap: "16px", flexWrap: "wrap", alignItems: "center" }}>
              <Link
                href={isVi ? "/tu-vi" : "/en/tu-vi"}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  minHeight: "48px",
                  padding: "0 24px",
                  borderRadius: "var(--radius-sm, 4px)",
                  fontFamily: "var(--font-ui)",
                  fontWeight: 600,
                  fontSize: "15px",
                  textDecoration: "none",
                  background: "var(--gold-gradient, linear-gradient(103deg, #9a7730, #f2dca0 34%, #c9a44d 58%, #a8842f))",
                  color: "var(--surface-deep, #15120e)",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                {isVi ? "Lập lá số Tử Vi miễn phí" : "Create free Zi Wei chart"}
              </Link>
              <a
                href="#vi-du"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  fontSize: "14.5px",
                  color: "var(--text-body)",
                  textDecoration: "none",
                }}
              >
                {isVi ? "Xem ví dụ minh hoạ" : "View illustrative example"}
                {renderSvgIcon("chevron-right", 16, "currentColor")}
              </a>
            </div>
          </div>
        </section>

        {/* 02 NHẬN ĐƯỢC GÌ */}
        <section
          style={{
            padding: "clamp(48px, 8vw, 88px) 0",
            background: "var(--surface-deep)",
            borderTop: "1px solid var(--border-hairline)",
            borderBottom: "1px solid var(--border-hairline)",
          }}
          data-screen-label="02-nhan-duoc-gi"
        >
          <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "0 clamp(20px, 5vw, 32px)" }}>
            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "11.5px",
                letterSpacing: "0.16em",
                textTransform: "uppercase",
                color: "var(--teal, #6E9C97)",
              }}
            >
              {isVi ? "02 · Khi ra mắt" : "02 · Upon release"}
            </div>
            <h2
              style={{
                margin: "14px 0 0",
                fontFamily: "var(--font-display)",
                fontWeight: 400,
                fontSize: "clamp(26px, 3.2vw, 34px)",
                color: "var(--text-heading)",
                maxWidth: "640px",
              }}
            >
              {isVi ? "Bạn sẽ nhận được gì" : "What you will receive"}
            </h2>

            <div
              style={{
                marginTop: "40px",
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                borderTop: "1px solid var(--border-hairline)",
              }}
            >
              {freeResults.map((item) => (
                <div
                  key={item.num}
                  style={{
                    padding: "28px",
                    borderRight: item.bordered !== false ? "1px solid var(--border-hairline)" : "none",
                    borderBottom: "1px solid var(--border-hairline)",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    {renderSvgIcon(item.icon, 20, "var(--accent-gold, #c9a44d)")}
                    <span
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: "11px",
                        letterSpacing: "0.14em",
                        color: "var(--gold-600, #a8842f)",
                      }}
                    >
                      {item.num}
                    </span>
                  </div>
                  <div
                    style={{
                      marginTop: "10px",
                      fontFamily: "var(--font-display)",
                      fontSize: "18px",
                      color: "var(--text-heading)",
                    }}
                  >
                    {item.title}
                  </div>
                  <div
                    style={{
                      marginTop: "8px",
                      fontSize: "13.5px",
                      lineHeight: 1.6,
                      color: "var(--text-muted)",
                    }}
                  >
                    {item.body}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 03 VÍ DỤ */}
        <section id="vi-du" style={{ padding: "clamp(56px, 9vw, 96px) 0" }} data-screen-label="03-vi-du">
          <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "0 clamp(20px, 5vw, 32px)" }}>
            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "11.5px",
                letterSpacing: "0.16em",
                textTransform: "uppercase",
                color: "var(--teal, #6E9C97)",
              }}
            >
              {isVi ? "03 · Ví dụ minh hoạ" : "03 · Illustrative example"}
            </div>
            <h2
              style={{
                margin: "14px 0 0",
                fontFamily: "var(--font-display)",
                fontWeight: 400,
                fontSize: "clamp(26px, 3.2vw, 34px)",
                color: "var(--text-heading)",
                maxWidth: "680px",
              }}
            >
              {isVi ? "Danh sách ngày ứng viên trông như thế nào" : "What the candidate date list looks like"}
            </h2>
            <p
              style={{
                margin: "16px 0 0",
                maxWidth: "680px",
                fontSize: "16px",
                lineHeight: 1.65,
                color: "var(--text-muted)",
              }}
            >
              {isVi
                ? "Ví dụ dưới đây minh hoạ cho việc \"cưới hỏi\" — tên ngày và lý do là minh hoạ, không phải kết quả tính từ lịch thật."
                : "The example below illustrates dates for a \"wedding\" milestone — date labels and reasons are illustrative samples, not live calendar calculations."}
            </p>

            <div style={{ marginTop: "40px", overflowX: "auto" }}>
              <table style={{ width: "100%", minWidth: "640px", borderCollapse: "collapse", fontSize: "13.5px" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border-hairline)" }}>
                    <th scope="col" style={{ textAlign: "left", padding: "10px 12px 10px 0", color: "var(--text-faint)", fontFamily: "var(--font-mono)", fontSize: "11px", letterSpacing: "0.06em", textTransform: "uppercase" }}>
                      {isVi ? "Ngày" : "Date"}
                    </th>
                    <th scope="col" style={{ textAlign: "left", padding: "10px 12px", color: "var(--text-faint)", fontFamily: "var(--font-mono)", fontSize: "11px", letterSpacing: "0.06em", textTransform: "uppercase" }}>
                      {isVi ? "Can chi ngày" : "Stem-Branch"}
                    </th>
                    <th scope="col" style={{ textAlign: "left", padding: "10px 12px", color: "var(--text-faint)", fontFamily: "var(--font-mono)", fontSize: "11px", letterSpacing: "0.06em", textTransform: "uppercase" }}>
                      {isVi ? "Hoàng/Hắc Đạo" : "Officer"}
                    </th>
                    <th scope="col" style={{ textAlign: "left", padding: "10px 0", color: "var(--text-faint)", fontFamily: "var(--font-mono)", fontSize: "11px", letterSpacing: "0.06em", textTransform: "uppercase" }}>
                      {isVi ? "Lý do" : "Reason"}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {candidateDays.map((d) => (
                    <tr key={d.label} style={{ borderBottom: "1px solid var(--border-hairline)" }}>
                      <td style={{ padding: "12px 12px 12px 0", color: "var(--text-heading)", whiteSpace: "nowrap" }}>{d.label}</td>
                      <td style={{ padding: "12px", color: "var(--text-body)", whiteSpace: "nowrap" }}>{d.canchi}</td>
                      <td style={{ padding: "12px", color: d.statusColor, whiteSpace: "nowrap" }}>{d.status}</td>
                      <td style={{ padding: "12px 0", color: "var(--text-body)" }}>{d.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* InsightCard */}
            <div style={{ marginTop: "40px" }}>
              <div
                style={{
                  position: "relative",
                  background: "var(--surface-panel)",
                  border: "1px solid var(--border-hairline)",
                  borderRadius: "var(--radius-md, 8px)",
                  padding: "24px 26px",
                  boxShadow: "0 24px 60px rgba(0,0,0,0.55)",
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    top: "24px",
                    left: "-1px",
                    width: "2px",
                    height: "34px",
                    background: "var(--accent-gold, #c9a44d)",
                  }}
                />
                <div
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: "11px",
                    letterSpacing: "0.14em",
                    textTransform: "uppercase",
                    color: "var(--text-faint)",
                  }}
                >
                  {isVi ? "Ngày ứng viên 1" : "Candidate date 1"}
                </div>
                <div
                  style={{
                    marginTop: "12px",
                    fontFamily: "var(--font-display)",
                    fontSize: "18px",
                    lineHeight: 1.45,
                    color: "var(--text-heading)",
                  }}
                >
                  {isVi
                    ? "Phù hợp hơn trong bộ quy tắc này: Ngày Hoàng Đạo, không rơi vào Tam Nương."
                    : "More suitable under this rule set: Auspicious day, not falling on Tam Nuong taboo."}
                </div>
                <div
                  style={{
                    marginTop: "8px",
                    fontSize: "13.5px",
                    lineHeight: 1.6,
                    color: "var(--text-muted)",
                  }}
                >
                  {isVi
                    ? "Đây là cách diễn đạt bắt buộc tại Lá Số Việt — không dùng \"chắc chắn tốt\" hay \"đảm bảo may mắn\" cho bất kỳ ngày nào."
                    : "This phrasing is mandatory across La So Viet — never promising \"guaranteed good\" or \"ensured fortune\" for any date."}
                </div>
                <div style={{ marginTop: "18px" }}>
                  <button
                    type="button"
                    onClick={() => setInsightStamped((s) => !s)}
                    style={{
                      background: "none",
                      border: "none",
                      padding: 0,
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "8px",
                      fontSize: "13px",
                      color: "var(--accent-gold, #c9a44d)",
                      fontFamily: "var(--font-ui)",
                    }}
                  >
                    <span
                      style={{
                        width: "18px",
                        height: "18px",
                        border: "1.5px solid var(--accent-seal, #c9a44d)",
                        borderRadius: "var(--radius-sm, 3px)",
                        display: "inline-block",
                        transform: insightStamped ? "scale(0.88) rotate(-3deg)" : "scale(1)",
                        opacity: insightStamped ? 0.6 : 1,
                        transition: "transform 220ms ease, opacity 220ms ease",
                      }}
                    />
                    <span>{isVi ? "Vì sao có nhận định này?" : "Why this assessment?"}</span>
                  </button>
                </div>
              </div>
            </div>

            <h3 style={{ margin: "56px 0 16px", fontFamily: "var(--font-display)", fontSize: "19px", color: "var(--text-heading)" }}>
              {isVi ? "So sánh tối đa 3 ngày" : "Compare up to 3 candidate dates"}
            </h3>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", minWidth: "640px", borderCollapse: "collapse", fontSize: "13.5px" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border-hairline)" }}>
                    <th scope="col" style={{ textAlign: "left", padding: "10px 12px 10px 0", color: "var(--text-faint)", fontFamily: "var(--font-mono)", fontSize: "11px", letterSpacing: "0.06em", textTransform: "uppercase" }}>
                      {isVi ? "Tiêu chí" : "Criteria"}
                    </th>
                    {compareCols.map((c) => (
                      <th key={c} scope="col" style={{ textAlign: "left", padding: "10px 12px", color: "var(--text-faint)", fontFamily: "var(--font-mono)", fontSize: "11px", letterSpacing: "0.06em", textTransform: "uppercase" }}>
                        {c}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {compareRows.map((r) => (
                    <tr key={r.label} style={{ borderBottom: "1px solid var(--border-hairline)" }}>
                      <td style={{ padding: "12px 12px 12px 0", color: "var(--text-faint)", fontFamily: "var(--font-mono)", fontSize: "11.5px", textTransform: "uppercase" }}>
                        {r.label}
                      </td>
                      {r.values.map((v, i) => (
                        <td key={i} style={{ padding: "12px", color: "var(--text-body)" }}>{v}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* 04 THUẬT NGỮ */}
        <section
          style={{
            padding: "clamp(48px, 8vw, 88px) 0",
            background: "var(--surface-deep)",
            borderTop: "1px solid var(--border-hairline)",
            borderBottom: "1px solid var(--border-hairline)",
          }}
          data-screen-label="04-thuat-ngu"
        >
          <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "0 clamp(20px, 5vw, 32px)" }}>
            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "11.5px",
                letterSpacing: "0.16em",
                textTransform: "uppercase",
                color: "var(--teal, #6E9C97)",
              }}
            >
              {isVi ? "04 · Thuật ngữ cốt lõi" : "04 · Core terminology"}
            </div>
            <h2
              style={{
                margin: "14px 0 0",
                fontFamily: "var(--font-display)",
                fontWeight: 400,
                fontSize: "clamp(26px, 3.2vw, 34px)",
                color: "var(--text-heading)",
                maxWidth: "640px",
              }}
            >
              {isVi ? "Đọc kết quả mà không bị ngợp thuật ngữ" : "Read results without terminology overload"}
            </h2>

            <div
              style={{
                marginTop: "40px",
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
                gap: "1px",
                background: "var(--border-hairline)",
                border: "1px solid var(--border-hairline)",
                borderRadius: "var(--radius-lg, 8px)",
                overflow: "hidden",
              }}
            >
              {glossaryItems.map((g) => (
                <div key={g.term} style={{ background: "var(--surface-panel)", padding: "26px" }}>
                  {renderSvgIcon(g.icon, 22, "var(--teal, #6E9C97)")}
                  <div
                    style={{
                      marginTop: "14px",
                      fontFamily: "var(--font-display)",
                      fontSize: "17px",
                      color: "var(--text-heading)",
                    }}
                  >
                    {g.term}
                  </div>
                  <p style={{ margin: "8px 0 0", fontSize: "13.5px", lineHeight: 1.6, color: "var(--text-body)" }}>
                    {g.body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 05 PHƯƠNG PHÁP & GIỚI HẠN */}
        <section style={{ padding: "clamp(56px, 9vw, 96px) 0" }} data-screen-label="05-phuong-phap-gioi-han">
          <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "0 clamp(20px, 5vw, 32px)" }}>
            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "11.5px",
                letterSpacing: "0.16em",
                textTransform: "uppercase",
                color: "var(--teal, #6E9C97)",
              }}
            >
              {isVi ? "05 · Minh bạch phương pháp" : "05 · Method transparency"}
            </div>
            <h2
              style={{
                margin: "14px 0 0",
                fontFamily: "var(--font-display)",
                fontWeight: 400,
                fontSize: "clamp(26px, 3.2vw, 34px)",
                color: "var(--text-heading)",
                maxWidth: "680px",
              }}
            >
              {isVi ? "Quy tắc và giới hạn" : "Rules and limitations"}
            </h2>

            <div style={{ marginTop: "36px", maxWidth: "760px" }}>
              {methodRows.map((m) => (
                <div
                  key={m.label}
                  style={{
                    display: "flex",
                    gap: "24px",
                    padding: "18px 0",
                    borderTop: "1px solid var(--border-hairline)",
                    alignItems: "baseline",
                  }}
                >
                  <span
                    style={{
                      flex: "none",
                      width: "180px",
                      fontFamily: "var(--font-mono)",
                      fontSize: "12px",
                      letterSpacing: "0.06em",
                      textTransform: "uppercase",
                      color: "var(--text-muted)",
                    }}
                  >
                    {m.label}
                  </span>
                  <span style={{ fontSize: "15px", lineHeight: 1.6, color: "var(--text-body)" }}>{m.value}</span>
                </div>
              ))}
            </div>

            <ul
              style={{
                margin: "32px 0 0",
                padding: 0,
                listStyle: "none",
                display: "grid",
                gap: "14px",
                maxWidth: "760px",
                borderTop: "1px solid var(--border-hairline)",
                paddingTop: "24px",
              }}
            >
              {limitItems.map((li, idx) => (
                <li key={idx} style={{ display: "flex", gap: "12px", fontSize: "14.5px", lineHeight: 1.6, color: "var(--text-body)" }}>
                  <span style={{ flex: "none", marginTop: "3px" }}>
                    {renderSvgIcon("chevron-right", 16, "var(--text-faint)")}
                  </span>
                  <span>{li}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* 06 FAQ + CTA */}
        <section
          style={{
            padding: "clamp(56px, 9vw, 96px) 0",
            background: "var(--surface-deep)",
            borderTop: "1px solid var(--border-hairline)",
          }}
          data-screen-label="06-faq-cta"
        >
          <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "0 clamp(20px, 5vw, 32px)" }}>
            <h2
              style={{
                margin: 0,
                fontFamily: "var(--font-display)",
                fontWeight: 400,
                fontSize: "clamp(26px, 3.2vw, 34px)",
                color: "var(--text-heading)",
              }}
            >
              {isVi ? "Câu hỏi thường gặp" : "Frequently asked questions"}
            </h2>

            <div style={{ marginTop: "24px", maxWidth: "760px" }}>
              {faqs.map((f, i) => {
                const isOpen = !!faqOpen[i];
                const num = String(i + 1).padStart(2, "0");
                return (
                  <div
                    key={i}
                    style={{
                      borderBottom: "1px solid var(--border-hairline)",
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => toggleFaq(i)}
                      style={{
                        width: "100%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "20px 0",
                        background: "none",
                        border: "none",
                        color: "inherit",
                        fontFamily: "inherit",
                        fontSize: "inherit",
                        cursor: "pointer",
                        textAlign: "left",
                        gap: "16px",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                        <span
                          style={{
                            fontFamily: "var(--font-mono)",
                            fontSize: "12px",
                            color: "var(--text-faint)",
                          }}
                        >
                          {num}
                        </span>
                        <span
                          style={{
                            fontSize: "16px",
                            color: "var(--text-heading)",
                            fontWeight: 500,
                          }}
                        >
                          {f.q}
                        </span>
                      </div>
                      <span
                        style={{
                          transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
                          transition: "transform 180ms ease",
                          display: "inline-flex",
                        }}
                      >
                        {renderSvgIcon("chevron-down", 18, "var(--text-faint)")}
                      </span>
                    </button>
                    {isOpen && (
                      <div
                        style={{
                          padding: "0 0 20px 32px",
                          fontSize: "14.5px",
                          lineHeight: 1.65,
                          color: "var(--text-muted)",
                        }}
                      >
                        {f.a}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div
              style={{
                marginTop: "72px",
                padding: "48px",
                background: "var(--surface-panel)",
                border: "1px solid var(--border-hairline)",
                borderRadius: "var(--radius-lg, 8px)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "32px",
                flexWrap: "wrap",
              }}
            >
              <div style={{ maxWidth: "520px" }}>
                <h2
                  style={{
                    margin: 0,
                    fontFamily: "var(--font-display)",
                    fontWeight: 400,
                    fontSize: "clamp(22px, 2.6vw, 28px)",
                    color: "var(--text-heading)",
                  }}
                >
                  {isVi ? "Trong lúc chờ, xem lá số Tử Vi miễn phí" : "While waiting, create a free Zi Wei chart"}
                </h2>
                <p style={{ margin: "10px 0 0", fontSize: "14.5px", lineHeight: 1.6, color: "var(--text-muted)" }}>
                  {isVi ? "Miễn phí, không cần tài khoản." : "Free, no account required."}
                </p>
              </div>
              <Link
                href={isVi ? "/tu-vi" : "/en/tu-vi"}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  minHeight: "48px",
                  padding: "0 24px",
                  borderRadius: "var(--radius-sm, 4px)",
                  fontFamily: "var(--font-ui)",
                  fontWeight: 600,
                  fontSize: "15px",
                  textDecoration: "none",
                  background: "var(--gold-gradient, linear-gradient(103deg, #9a7730, #f2dca0 34%, #c9a44d 58%, #a8842f))",
                  color: "var(--surface-deep, #15120e)",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                {isVi ? "Lập lá số Tử Vi miễn phí" : "Create free Zi Wei chart"}
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer
        style={{
          borderTop: "1px solid var(--border-hairline)",
          padding: "48px 0 32px",
        }}
        data-screen-label="footer"
      >
        <div
          style={{
            maxWidth: "1200px",
            margin: "0 auto",
            padding: "0 clamp(20px, 5vw, 32px)",
            display: "flex",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "12px",
          }}
        >
          <span style={{ fontSize: "12.5px", color: "var(--text-faint)" }}>
            {isVi
              ? "© 2026 Lá Số Việt. Nội dung tham khảo văn hoá, không thay thế tư vấn chuyên môn."
              : "© 2026 La So Viet. Cultural reference content, not a substitute for professional consultation."}
          </span>
          <Link
            href={isVi ? "/cong-cu-mien-phi" : "/en/cong-cu-mien-phi"}
            style={{ fontSize: "12.5px", color: "var(--text-faint)", textDecoration: "none" }}
          >
            {isVi ? "← Tất cả công cụ miễn phí" : "← All free tools"}
          </Link>
        </div>
      </footer>
    </div>
  );
}

export default GoodDaysPreview;
