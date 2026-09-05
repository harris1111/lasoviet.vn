"use client";

import React, { useState } from "react";
import Link from "next/link";

export type TarotPreviewProps = {
  locale: "vi" | "en";
  className?: string;
};

type TrustItem = {
  num: string;
  icon: "compass" | "scroll" | "book-open" | "shield-lock" | "user-circle" | "calendar-day";
  title: string;
  body: string;
};

type SpreadCard = {
  position: string;
  name: string;
  orientation: string;
  meaning: string;
};

type GlossaryItem = {
  icon: "scroll" | "compass" | "user-circle";
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
  { num: "01", icon: "compass", title: "Một lá hôm nay", body: "Rút một lá mỗi ngày để phản chiếu nhanh — khoá lại sau khi rút, không rút lại trong ngày." },
  { num: "02", icon: "scroll", title: "Ba lá cho một câu hỏi", body: "Đặt một câu hỏi cụ thể, nhận ba lá theo ba vị trí rõ ràng." },
  { num: "03", icon: "book-open", title: "Ý nghĩa theo từng vị trí", body: "Mỗi lá được diễn giải riêng theo đúng vị trí, không gộp thành một đoạn chung." },
  { num: "04", icon: "shield-lock", title: "Không rút lại đến khi vừa ý", body: "Một lượt rút được lưu lại đầy đủ — không cho rút lại âm thầm để tìm kết quả khác." },
  { num: "05", icon: "user-circle", title: "Ranh giới câu hỏi rõ ràng", body: "Câu hỏi về khủng hoảng, y tế, pháp lý hoặc tài chính sẽ được chuyển hướng an toàn thay vì rút bài." },
  { num: "06", icon: "calendar-day", title: "Lưu vào nhật ký cá nhân", body: "Xem lại các lượt rút trước đó cùng ghi chú riêng của bạn." },
];

const FREE_RESULTS_EN: readonly TrustItem[] = [
  { num: "01", icon: "compass", title: "One card today", body: "Draw one card each day for quick reflection — locked after draw, no redraws within the day." },
  { num: "02", icon: "scroll", title: "Three cards for a question", body: "Ask a specific question, receive three cards in three distinct positions." },
  { num: "03", icon: "book-open", title: "Meaning by each position", body: "Each card is interpreted individually according to its exact position, not merged into a generic paragraph." },
  { num: "04", icon: "shield-lock", title: "No redraws until satisfied", body: "Every draw session is fully recorded — no silent redraws to fish for a different outcome." },
  { num: "05", icon: "user-circle", title: "Clear question boundaries", body: "Questions concerning crisis, medical, legal, or financial issues are safely redirected rather than drawn." },
  { num: "06", icon: "calendar-day", title: "Save to personal journal", body: "Review previous draw sessions alongside your personal reflections." },
];

const SPREAD_CARDS_VI: readonly SpreadCard[] = [
  { position: "Tình huống hiện tại", name: "Người Treo Ngược", orientation: "Xuôi", meaning: "Gợi ý một giai đoạn cần tạm dừng và nhìn vấn đề từ góc khác trước khi hành động." },
  { position: "Hành động khả thi", name: "Bánh Xe Số Mệnh", orientation: "Ngược", meaning: "Cho thấy một chu kỳ đang chuyển đổi — có thể cần thời gian trước khi rõ ràng hơn." },
  { position: "Xu hướng kết quả", name: "Ngôi Sao", orientation: "Xuôi", meaning: "Xu hướng tích cực nếu giữ được sự kiên nhẫn qua giai đoạn chuyển tiếp." },
];

const SPREAD_CARDS_EN: readonly SpreadCard[] = [
  { position: "Current situation", name: "The Hanged Man", orientation: "Upright", meaning: "Suggests a phase calling for pause and viewing the situation from another perspective before acting." },
  { position: "Actionable step", name: "Wheel of Fortune", orientation: "Reversed", meaning: "Indicates a transitional cycle — time may be needed before clarity emerges." },
  { position: "Outcome trajectory", name: "The Star", orientation: "Upright", meaning: "A positive trajectory if patience is maintained through the transition phase." },
];

const GLOSSARY_ITEMS_VI: readonly GlossaryItem[] = [
  { icon: "scroll", term: "Trải bài (Spread)", body: "Cách sắp xếp các lá bài theo những vị trí có ý nghĩa cố định — Lá Số Việt chỉ dùng hai trải bài: một lá và ba lá." },
  { icon: "compass", term: "Xuôi & Ngược (Upright/Reversed)", body: "Một lá bài rút xuôi và rút ngược mang sắc thái ý nghĩa khác nhau, không phải \"tốt\" và \"xấu\" đối lập tuyệt đối." },
  { icon: "user-circle", term: "Vị trí (Position)", body: "Trong trải ba lá, mỗi vị trí (ví dụ: tình huống, hành động, xu hướng) quy định lá bài ở đó nên đọc theo khía cạnh nào." },
];

const GLOSSARY_ITEMS_EN: readonly GlossaryItem[] = [
  { icon: "scroll", term: "Spread", body: "Card layout in predefined positions with fixed meanings — La So Viet supports only two spreads: one card and three cards." },
  { icon: "compass", term: "Upright / Reversed", body: "Upright and reversed cards carry distinct interpretive nuances, not a simplistic \"good\" vs. \"bad\" polarity." },
  { icon: "user-circle", term: "Position", body: "In a three-card spread, each position (e.g. situation, action, trajectory) governs the interpretive angle of that card." },
];

const METHOD_ROWS_VI: readonly MethodRow[] = [
  { label: "Bộ bài", value: "Bộ Tarot 78 lá tiêu chuẩn (Rider–Waite), tên lá theo bản dịch tiếng Việt phổ biến." },
  { label: "Cách rút", value: "Rút ngẫu nhiên có lưu seed để có thể xem lại chính xác lượt rút đã thực hiện." },
  { label: "Giới hạn rút lại", value: "Một lá hôm nay chỉ rút một lần mỗi ngày; ba lá cho một câu hỏi lưu lại lịch sử, không cho rút lại âm thầm." },
  { label: "Vai trò của AI", value: "Diễn giải lá đã rút theo đúng vị trí bằng tiếng Việt — không tự chọn lại lá để \"khớp\" câu hỏi." },
];

const METHOD_ROWS_EN: readonly MethodRow[] = [
  { label: "Deck", value: "Standard 78-card Rider–Waite deck, using widely accepted Vietnamese naming conventions." },
  { label: "Draw mechanism", value: "Randomized draw with recorded seed to guarantee exact audit and review of each session." },
  { label: "Redraw limits", value: "One card today allows one draw per day; three cards for a question logs full history without silent redraws." },
  { label: "Role of AI", value: "Interprets drawn cards strictly according to their assigned positions — never swaps cards to fit a question." },
];

const LIMIT_ITEMS_VI: readonly string[] = [
  "Kết quả mang tính phản chiếu và tự chiêm nghiệm, không phải dự đoán chắc chắn về tương lai.",
  "Không nhận câu hỏi liên quan trực tiếp đến chẩn đoán y tế, tư vấn pháp lý hoặc quyết định đầu tư/tài chính cụ thể.",
  "Không khuyến khích rút đi rút lại cùng một câu hỏi để tìm kết quả dễ chịu hơn.",
  "Trải bài mẫu ở trên chỉ minh hoạ cấu trúc ba vị trí, không phải kết quả rút bài thật.",
];

const LIMIT_ITEMS_EN: readonly string[] = [
  "Results serve as contemplative reflection and self-inquiry, not deterministic predictions of the future.",
  "Does not accept inquiries directly concerning medical diagnoses, legal advice, or specific financial/investment decisions.",
  "Repeated redraws for the same question in search of a more comfortable result are not supported.",
  "The sample spread above illustrates the three-position structure only and does not represent an actual draw.",
];

const FAQ_ITEMS_VI: readonly FaqItem[] = [
  { num: "01", q: "Tarot tại Lá Số Việt có bao nhiêu kiểu trải bài?", a: "Chỉ hai: Một lá hôm nay và Ba lá cho một câu hỏi. Không có trải bài phức tạp hơn ở giai đoạn đầu." },
  { num: "02", q: "Tôi có thể rút lại nếu không thích kết quả không?", a: "Không. Một lá hôm nay chỉ rút được một lần mỗi ngày; ba lá cho một câu hỏi lưu lại lịch sử đầy đủ thay vì cho rút lại âm thầm." },
  { num: "03", q: "Tarot có nhận mọi loại câu hỏi không?", a: "Không. Các câu hỏi liên quan trực tiếp đến khủng hoảng, y tế, pháp lý hoặc tài chính sẽ được chuyển hướng đến nội dung an toàn phù hợp thay vì rút bài." },
  { num: "04", q: "Khi nào Tarot ra mắt?", a: "Chưa có ngày cụ thể. Lá Số Việt đang hoàn thiện cơ chế rút bài và bộ căn cứ diễn giải trước khi phát hành." },
  { num: "05", q: "Trải bài mẫu ở trên có phải kết quả rút bài thật không?", a: "Không. Đây là ví dụ minh hoạ cấu trúc ba vị trí, không phải kết quả rút từ một câu hỏi thật." },
];

const FAQ_ITEMS_EN: readonly FaqItem[] = [
  { num: "01", q: "How many spread styles does Tarot at La So Viet support?", a: "Only two: One card today and Three cards for a question. No complex multi-spread variations in the initial phase." },
  { num: "02", q: "Can I redraw if I am unsatisfied with the result?", a: "No. One card today can only be drawn once per day; three cards for a question saves the complete history rather than allowing silent redraws." },
  { num: "03", q: "Does Tarot accept any question?", a: "No. Questions directly involving personal crisis, healthcare, legal actions, or financial speculation are redirected to safe resources instead." },
  { num: "04", q: "When will Tarot launch?", a: "No specific launch date yet. La So Viet is completing the draw mechanism and interpretive evidence foundation prior to release." },
  { num: "05", q: "Is the sample spread above a real draw result?", a: "No. It is an illustrative demonstration of the three-position spread structure, not an outcome from an actual inquiry." },
];

function ChevronRightIcon({ size = 14, color = "currentColor" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flex: "none" }}>
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}

function ToolIcon({ name, color = "var(--oxblood, #9B6358)" }: { name: string; color?: string }) {
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
    case "shield-lock":
      return (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          <rect x="9" y="10" width="6" height="5" rx="1" />
          <path d="M10 10V8a2 2 0 0 1 4 0v2" />
        </svg>
      );
    case "user-circle":
      return (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="10" />
          <circle cx="12" cy="10" r="3" />
          <path d="M7 20.662V19a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v1.662" />
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

export function TarotPreview({ locale, className }: TarotPreviewProps) {
  const isVi = locale === "vi";
  const [insightStamped, setInsightStamped] = useState(false);
  const [faqOpen, setFaqOpen] = useState<Record<number, boolean>>({ 0: true });

  const toggleFaq = (index: number) => {
    setFaqOpen((prev) => ({ ...prev, [index]: !prev[index] }));
  };

  const freeResults = isVi ? FREE_RESULTS_VI : FREE_RESULTS_EN;
  const spreadCards = isVi ? SPREAD_CARDS_VI : SPREAD_CARDS_EN;
  const glossaryItems = isVi ? GLOSSARY_ITEMS_VI : GLOSSARY_ITEMS_EN;
  const methodRows = isVi ? METHOD_ROWS_VI : METHOD_ROWS_EN;
  const limitItems = isVi ? LIMIT_ITEMS_VI : LIMIT_ITEMS_EN;
  const faqs = isVi ? FAQ_ITEMS_VI : FAQ_ITEMS_EN;

  const homeHref = isVi ? "/" : "/en";
  const tuviHref = isVi ? "/tu-vi" : "/en/tu-vi";
  const freeToolsHref = isVi ? "/cong-cu-mien-phi" : "/en/cong-cu-mien-phi";
  const kienthucHref = isVi ? "/kien-thuc" : "/en/kien-thuc";
  const loginHref = isVi ? "/dang-nhap" : "/en/dang-nhap";

  return (
    <div
      className={className}
      data-screen-label="boi-bai"
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
                color: "var(--oxblood, #9B6358)",
                textDecoration: "none",
                borderBottom: "1px solid var(--oxblood, #9B6358)",
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
                {isVi ? "Tarot / Bói Bài" : "Tarot / Divination"}
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
                color: "var(--oxblood, #9B6358)",
                border: "1px solid var(--oxblood-deep, #4A2E29)",
                borderRadius: "var(--radius-pill, 9999px)",
                padding: "6px 14px",
                background: "var(--oxblood-tint, rgba(123, 67, 61, 0.18))",
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
              {isVi ? "Tarot / Bói Bài" : "Tarot / Divination"}
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
              {isVi ? (
                <>
                  Chỉ hai hình thức được duyệt:{" "}
                  <strong style={{ color: "var(--text-heading, #F6F1E6)" }}>Một lá hôm nay</strong> để phản chiếu nhanh,{" "}
                  hoặc{" "}
                  <strong style={{ color: "var(--text-heading, #F6F1E6)" }}>Ba lá cho một câu hỏi</strong> để nhìn một tình huống rõ hơn. Không có trải bài phức tạp hay rút lại đến khi vừa ý.
                </>
              ) : (
                <>
                  Only two approved formats:{" "}
                  <strong style={{ color: "var(--text-heading, #F6F1E6)" }}>One card today</strong> for swift reflection,{" "}
                  or{" "}
                  <strong style={{ color: "var(--text-heading, #F6F1E6)" }}>Three cards for a question</strong> to gain perspective on a situation. No convoluted spreads or redraws until satisfied.
                </>
              )}
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
                href="#trai-bai-mau"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  fontSize: "14.5px",
                  color: "var(--text-body, #DCD4C3)",
                  textDecoration: "none",
                }}
              >
                {isVi ? "Xem trải bài mẫu" : "View sample spread"}
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
            <div style={{ fontFamily: "var(--font-mono, monospace)", fontSize: "11.5px", letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--oxblood, #9B6358)" }}>
              {isVi ? "02 · Khi ra mắt" : "02 · At launch"}
            </div>
            <h2 style={{ margin: "14px 0 0", fontFamily: "var(--font-display, Georgia, serif)", fontWeight: 400, fontSize: "clamp(26px, 3.2vw, 34px)", color: "var(--text-heading, #F6F1E6)", maxWidth: "640px" }}>
              {isVi ? "Hai hình thức, không có gì khác" : "Two formats, nothing else"}
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

        {/* 03 TRẢI BÀI MẪU */}
        <section id="trai-bai-mau" style={{ padding: "clamp(56px, 9vw, 96px) 0" }} data-screen-label="03-trai-bai-mau">
          <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "0 clamp(20px, 5vw, 32px)" }}>
            <div style={{ fontFamily: "var(--font-mono, monospace)", fontSize: "11.5px", letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--oxblood, #9B6358)" }}>
              {isVi ? "03 · Ví dụ minh hoạ" : "03 · Illustrative example"}
            </div>
            <h2 style={{ margin: "14px 0 0", fontFamily: "var(--font-display, Georgia, serif)", fontWeight: 400, fontSize: "clamp(26px, 3.2vw, 34px)", color: "var(--text-heading, #F6F1E6)", maxWidth: "680px" }}>
              {isVi ? "Ba lá cho một câu hỏi trông như thế nào" : "What three cards for a question look like"}
            </h2>
            <p style={{ margin: "16px 0 0", maxWidth: "680px", fontSize: "16px", lineHeight: 1.65, color: "var(--text-muted, #A79E8B)" }}>
              {isVi
                ? "Ví dụ dưới đây minh hoạ cấu trúc trải bài ba vị trí — tên lá và ý nghĩa chỉ mang tính minh hoạ, không phải kết quả rút bài thật."
                : "The example below illustrates the three-position spread structure — card names and meanings are strictly illustrative, not an actual reading."}
            </p>
            <div style={{ marginTop: "44px", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "24px" }}>
              {spreadCards.map((card, idx) => (
                <div key={idx}>
                  <div style={{ fontFamily: "var(--font-mono, monospace)", fontSize: "10.5px", letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text-faint, #6E6656)", marginBottom: "10px", textAlign: "center" }}>
                    {card.position}
                  </div>
                  <div style={{ aspectRatio: "2 / 3", border: "1px solid var(--oxblood-deep, #4A2E29)", borderRadius: "var(--radius-md, 8px)", background: "linear-gradient(160deg, var(--surface-panel, #1C1813), var(--surface-deep, #0F0D0A))", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "16px", textAlign: "center", gap: "8px", boxShadow: "0 18px 40px rgba(0, 0, 0, 0.4)" }}>
                    <span style={{ fontFamily: "var(--font-mono, monospace)", fontSize: "10px", letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--oxblood, #9B6358)" }}>{card.orientation}</span>
                    <span style={{ fontFamily: "var(--font-display, Georgia, serif)", fontSize: "18px", color: "var(--text-heading, #F6F1E6)" }}>{card.name}</span>
                  </div>
                  <p style={{ margin: "12px 0 0", fontSize: "13px", lineHeight: 1.6, color: "var(--text-muted, #A79E8B)" }}>{card.meaning}</p>
                </div>
              ))}
            </div>
            <div style={{ marginTop: "40px", maxWidth: "680px", background: "var(--surface-panel, #1C1813)", border: "1px solid var(--border-hairline, #3A3227)", borderRadius: "var(--radius-md, 8px)", padding: "24px 26px", position: "relative", boxShadow: "0 24px 60px rgba(0, 0, 0, 0.55)" }}>
              <div style={{ position: "absolute", top: 24, left: -1, width: 2, height: 34, background: "var(--oxblood, #9B6358)" }} />
              <div style={{ fontFamily: "var(--font-mono, monospace)", fontSize: "10.5px", letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--text-faint, #6E6656)" }}>{isVi ? "Tổng hợp" : "Synthesis"}</div>
              <p style={{ margin: "12px 0 0", fontFamily: "var(--font-display, Georgia, serif)", fontSize: "18px", lineHeight: 1.5, color: "var(--text-heading, #F6F1E6)" }}>
                {isVi ? "Ba lá cho thấy một giai đoạn cần tạm dừng trước khi quyết định, với xu hướng cải thiện nếu chọn đúng thời điểm." : "The three cards reveal a phase requiring pause before deciding, with an improving outlook when timing is respected."}
              </p>
              <p style={{ margin: "10px 0 0", fontFamily: "var(--font-display, Georgia, serif)", fontStyle: "italic", fontSize: "15px", lineHeight: 1.6, color: "var(--text-muted, #A79E8B)" }}>
                {isVi ? "Bản diễn giải đầy đủ sẽ tách rõ ý nghĩa từng lá theo đúng vị trí, không gộp thành một câu phán chung." : "The complete interpretation will separate each card by its assigned position, avoiding sweeping unverified assertions."}
              </p>
              <button type="button" onClick={() => setInsightStamped(!insightStamped)} style={{ marginTop: "16px", display: "inline-flex", alignItems: "center", gap: "10px", fontSize: "13.5px", color: insightStamped ? "var(--accent-gold, #C9A44D)" : "var(--text-body, #DCD4C3)", background: "transparent", border: "none", padding: 0, cursor: "pointer" }}>
                <span style={{ position: "relative", width: 22, height: 22, display: "inline-block", flex: "none", border: "1.5px solid var(--accent-seal, #CE5B45)", borderRadius: "var(--radius-sm, 4px)" }}>
                  <span style={{ position: "absolute", inset: 3, border: "1px solid var(--accent-seal, #CE5B45)", borderRadius: 2, display: "block", background: insightStamped ? "var(--accent-seal, #CE5B45)" : "transparent" }} />
                </span>
                <span>{isVi ? "Vì sao có nhận định này?" : "Why this assessment?"}</span>
              </button>
            </div>
          </div>
        </section>

        {/* 04 THUẬT NGỮ */}
        <section style={{ padding: "clamp(48px, 8vw, 88px) 0", background: "var(--surface-deep, #0F0D0A)", borderTop: "1px solid var(--border-hairline, #3A3227)", borderBottom: "1px solid var(--border-hairline, #3A3227)" }} data-screen-label="04-thuat-ngu">
          <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "0 clamp(20px, 5vw, 32px)" }}>
            <div style={{ fontFamily: "var(--font-mono, monospace)", fontSize: "11.5px", letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--oxblood, #9B6358)" }}>{isVi ? "04 · Thuật ngữ cốt lõi" : "04 · Core terminology"}</div>
            <h2 style={{ margin: "14px 0 0", fontFamily: "var(--font-display, Georgia, serif)", fontWeight: 400, fontSize: "clamp(26px, 3.2vw, 34px)", color: "var(--text-heading, #F6F1E6)", maxWidth: "640px" }}>
              {isVi ? "Đọc một trải bài mà không bị ngợp thuật ngữ" : "Read a spread without jargon overload"}
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
            <div style={{ fontFamily: "var(--font-mono, monospace)", fontSize: "11.5px", letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--oxblood, #9B6358)" }}>{isVi ? "05 · Minh bạch phương pháp" : "05 · Transparent methodology"}</div>
            <h2 style={{ margin: "14px 0 0", fontFamily: "var(--font-display, Georgia, serif)", fontWeight: 400, fontSize: "clamp(26px, 3.2vw, 34px)", color: "var(--text-heading, #F6F1E6)", maxWidth: "680px" }}>
              {isVi ? "Cách rút bài sẽ hoạt động" : "How the draw will work"}
            </h2>
            <div style={{ marginTop: "36px", maxWidth: "760px" }}>
              {methodRows.map((m, idx) => (
                <div key={idx} style={{ display: "flex", gap: "24px", padding: "18px 0", borderTop: "1px solid var(--border-hairline, #3A3227)", alignItems: "baseline" }}>
                  <span style={{ flex: "none", width: "200px", fontFamily: "var(--font-mono, monospace)", fontSize: "12px", letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--text-muted, #A79E8B)" }}>{m.label}</span>
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
                      <span style={{ fontFamily: "var(--font-mono, monospace)", fontSize: "12px", color: "var(--oxblood, #9B6358)" }}>{f.num}</span>
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

export default TarotPreview;
