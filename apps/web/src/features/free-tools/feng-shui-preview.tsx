"use client";

import React, { useState } from "react";
import Link from "next/link";

export type FengShuiPreviewProps = {
  locale: "vi" | "en";
  className?: string;
};

type TrustItem = {
  num: string;
  icon: "compass" | "user-circle" | "scroll" | "book-open" | "map-pin" | "shield-lock";
  title: string;
  body: string;
  bordered?: boolean;
};

type DirectionRow = {
  label: string;
  rule: string;
  status: string;
  statusColor: string;
  bg: string;
};

type GlossaryItem = {
  icon: "compass" | "user-circle" | "map-pin" | "help-circle";
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
  { num: "01", icon: "compass", title: "La bàn 8 hướng rõ ràng", body: "Hướng nhà đo được hiển thị trên la bàn 8 hướng kèm số độ chính xác, không chỉ tên hướng chung chung." },
  { num: "02", icon: "user-circle", title: "Cung mệnh theo năm sinh, giới tính", body: "Xác định Đông tứ mệnh hay Tây tứ mệnh của gia chủ theo đúng công thức Bát Trạch sẽ công bố." },
  { num: "03", icon: "scroll", title: "Bảng 8 hướng kèm phân loại", body: "Từng hướng trong 8 hướng có mã quy tắc và phân loại riêng — không gộp thành một điểm số." },
  { num: "04", icon: "book-open", title: "Giải thích thuật ngữ Bát Trạch", body: "Sinh Khí, Diên Niên, Thiên Y, Phục Vị... được giải thích bằng tiếng Việt dễ hiểu." },
  { num: "05", icon: "map-pin", title: "Chỉ một tiện ích: hướng nhà", body: "Không gộp hướng bàn làm việc, hướng bếp hay màu sắc vào cùng kết quả ở giai đoạn đầu." },
  { num: "06", icon: "shield-lock", title: "Không bán vật phẩm hoá giải", body: "Không có gợi ý mua vật phẩm phong thuỷ đi kèm bất kỳ hướng nào.", bordered: false }
];

const FREE_RESULTS_EN: readonly TrustItem[] = [
  { num: "01", icon: "compass", title: "Clear 8-direction compass", body: "The measured house orientation is plotted on an 8-direction compass with exact degree bearings, not vague general direction names." },
  { num: "02", icon: "user-circle", title: "Personal trigram by birth year and gender", body: "Determines Eastern or Western group designation according to finalized Eight Mansions formulas." },
  { num: "03", icon: "scroll", title: "8-direction table with rule categorization", body: "Each of the 8 directions carries distinct rule codes and classifications — never blended into a single composite score." },
  { num: "04", icon: "book-open", title: "Eight Mansions terminology explained", body: "Sinh Khi, Dien Nien, Thien Y, Phuc Vi and challenging orientations are explained in clear, straightforward language." },
  { num: "05", icon: "map-pin", title: "Single utility focus: house direction", body: "No confounding desk directions, kitchen hearth placements, or colors in the initial phase." },
  { num: "06", icon: "shield-lock", title: "No remedy merchandise sold", body: "No sales pitches or talismanic remedies accompany any directional outcome.", bordered: false }
];

const DIRECTION_ROWS_VI: readonly DirectionRow[] = [
  { label: "Bắc (0°)", rule: "Nhóm minh hoạ A · mã BT-01", status: "Nhóm A", statusColor: "var(--stone, #7C8A6E)", bg: "var(--surface-panel)" },
  { label: "Đông Bắc (45°)", rule: "Nhóm minh hoạ B · mã BT-02", status: "Nhóm B", statusColor: "var(--text-faint)", bg: "var(--surface-panel)" },
  { label: "Đông (90°)", rule: "Nhóm minh hoạ A · mã BT-03", status: "Nhóm A", statusColor: "var(--stone, #7C8A6E)", bg: "var(--surface-panel)" },
  { label: "Đông Nam (135°)", rule: "Nhóm minh hoạ A · mã BT-04 — hướng nhà đo được", status: "Nhóm A", statusColor: "var(--stone, #7C8A6E)", bg: "var(--stone-tint, rgba(124,138,110,0.16))" },
  { label: "Nam (180°)", rule: "Nhóm minh hoạ A · mã BT-05", status: "Nhóm A", statusColor: "var(--stone, #7C8A6E)", bg: "var(--surface-panel)" },
  { label: "Tây Nam (225°)", rule: "Nhóm minh hoạ B · mã BT-06", status: "Nhóm B", statusColor: "var(--text-faint)", bg: "var(--surface-panel)" },
  { label: "Tây (270°)", rule: "Nhóm minh hoạ B · mã BT-07", status: "Nhóm B", statusColor: "var(--text-faint)", bg: "var(--surface-panel)" },
  { label: "Tây Bắc (315°)", rule: "Nhóm minh hoạ B · mã BT-08", status: "Nhóm B", statusColor: "var(--text-faint)", bg: "var(--surface-panel)" }
];

const DIRECTION_ROWS_EN: readonly DirectionRow[] = [
  { label: "North (0°)", rule: "Illustrative Group A · code BT-01", status: "Group A", statusColor: "var(--stone, #7C8A6E)", bg: "var(--surface-panel)" },
  { label: "North-East (45°)", rule: "Illustrative Group B · code BT-02", status: "Group B", statusColor: "var(--text-faint)", bg: "var(--surface-panel)" },
  { label: "East (90°)", rule: "Illustrative Group A · code BT-03", status: "Group A", statusColor: "var(--stone, #7C8A6E)", bg: "var(--surface-panel)" },
  { label: "South-East (135°)", rule: "Illustrative Group A · code BT-04 — measured orientation", status: "Group A", statusColor: "var(--stone, #7C8A6E)", bg: "var(--stone-tint, rgba(124,138,110,0.16))" },
  { label: "South (180°)", rule: "Illustrative Group A · code BT-05", status: "Group A", statusColor: "var(--stone, #7C8A6E)", bg: "var(--surface-panel)" },
  { label: "South-West (225°)", rule: "Illustrative Group B · code BT-06", status: "Group B", statusColor: "var(--text-faint)", bg: "var(--surface-panel)" },
  { label: "West (270°)", rule: "Illustrative Group B · code BT-07", status: "Group B", statusColor: "var(--text-faint)", bg: "var(--surface-panel)" },
  { label: "North-West (315°)", rule: "Illustrative Group B · code BT-08", status: "Group B", statusColor: "var(--text-faint)", bg: "var(--surface-panel)" }
];

const GLOSSARY_ITEMS_VI: readonly GlossaryItem[] = [
  { icon: "compass", term: "Bát Trạch", body: "Một trường phái phong thuỷ chia người và nhà thành hai nhóm — Đông tứ mệnh và Tây tứ mệnh — mỗi nhóm có 4 hướng thuộc nhóm mình và 4 hướng thuộc nhóm còn lại." },
  { icon: "user-circle", term: "Cung mệnh (Đông/Tây tứ mệnh)", body: "Nhóm mệnh của một người, tính từ năm sinh và giới tính theo công thức riêng — quyết định hướng nào thuộc nhóm \"hợp\" với người đó." },
  { icon: "map-pin", term: "Hướng nhà", body: "Hướng vuông góc với mặt tiền chính của ngôi nhà, đo bằng la bàn theo độ (0-360°), quy về 8 hướng chính." },
  { icon: "help-circle", term: "Sinh Khí, Diên Niên, Thiên Y, Phục Vị...", body: "Tám tên gọi truyền thống cho 8 hướng ứng với một cung mệnh cụ thể — sẽ hiển thị đầy đủ và đúng công thức khi phương pháp được duyệt." }
];

const GLOSSARY_ITEMS_EN: readonly GlossaryItem[] = [
  { icon: "compass", term: "Eight Mansions (Bat Trach)", body: "A classical feng shui school categorizing individuals and houses into Eastern and Western groups, each with four harmonious and four adverse compass directions." },
  { icon: "user-circle", term: "Personal Trigram (Menh Cung)", body: "An individual's birth orientation calculated from solar birth year and gender, determining compatible directional alignments." },
  { icon: "map-pin", term: "House Orientation (Huong Nha)", body: "The perpendicular line facing outward from the primary entrance facade, measured in compass degrees (0-360°) and mapped to eight cardinal directions." },
  { icon: "help-circle", term: "Sinh Khi, Dien Nien, Thien Y, Phuc Vi...", body: "The eight traditional names assigned to directions for a specific trigram — rendered fully upon official methodology ratification." }
];

const METHOD_ROWS_VI: readonly MethodRow[] = [
  { label: "Utility đã chốt", value: "Chỉ hướng nhà — không gộp bàn làm việc, bếp hay màu sắc/ngũ hành ở giai đoạn đầu." },
  { label: "Trường phái", value: "Bát Trạch (Eight Mansions) — công thức tính cung mệnh và bảng 8 hướng cụ thể đang chờ chuyên gia phong thuỷ độc lập rà soát." },
  { label: "Dữ liệu đầu vào", value: "Năm sinh, giới tính của gia chủ và hướng nhà đo được (độ) — không cần bản vẽ mặt bằng ở phiên bản đầu." },
  { label: "Vai trò của AI", value: "Tổ chức và diễn giải kết quả đã tính theo bộ quy tắc đã duyệt bằng tiếng Việt — không tự suy luận hướng tốt/xấu." }
];

const METHOD_ROWS_EN: readonly MethodRow[] = [
  { label: "Settled utility", value: "Strictly house direction — no desk, kitchen hearth, or color/element mixing in the initial release." },
  { label: "School of thought", value: "Eight Mansions (Bat Trach) — precise personal trigram formulas and 8-direction tables are undergoing independent expert review." },
  { label: "Input data", value: "Birth year, gender of the homeowner, and measured orientation in degrees — architectural floor plans are not required initially." },
  { label: "Role of AI", value: "Organizes and interprets rule-based calculations in transparent prose — never invents or guesses favorable orientations." }
];

const LIMIT_ITEMS_VI: readonly string[] = [
  "Kết quả là dữ kiện tham khảo theo một trường phái cụ thể (Bát Trạch), không phải phán quyết tuyệt đối hay dự báo vận hạn.",
  "Không đề xuất hoặc bán vật phẩm phong thuỷ, bùa hộ mệnh hay dịch vụ \"hoá giải\" cho bất kỳ hướng nào.",
  "Chỉ xử lý hướng nhà ở giai đoạn đầu — hướng bàn làm việc, hướng bếp và màu sắc/ngũ hành chưa nằm trong phạm vi.",
  "Không thay thế tư vấn từ kiến trúc sư, kỹ sư xây dựng hoặc chuyên gia phong thuỷ được cấp phép cho quyết định xây dựng thật.",
  "Công thức cung mệnh và bảng 8 hướng cụ thể chưa được chuyên gia độc lập rà soát — chưa công bố như kết quả chính thức.",
  "Ví dụ minh hoạ ở trên chỉ thể hiện hình dạng bảng kết quả, không phải kết luận đã kiểm chứng."
];

const LIMIT_ITEMS_EN: readonly string[] = [
  "Results provide reference data under a singular school (Eight Mansions), not absolute fate decrees or fortune predictions.",
  "We never recommend or sell feng shui items, talismanic amulets, or \"misfortune remedy\" services for any orientation.",
  "Focuses exclusively on house direction in this initial phase — desks, kitchen placement, and color palettes are outside scope.",
  "Does not substitute for licensed architectural, engineering, or accredited professional consulting for actual construction.",
  "Formulas and eight-direction reference tables remain subject to expert review — not yet published as definitive outcomes.",
  "The illustrative example above solely demonstrates result structure, not an empirically audited conclusion."
];

const FAQ_DATA_VI: readonly FaqItem[] = [
  { num: "01", q: "Phong Thủy hướng nhà có bán vật phẩm hoá giải không?", a: "Không, và sẽ không bao giờ có. Lá Số Việt không bán vật phẩm phong thuỷ, bùa hộ mệnh hay dịch vụ \"hoá giải\" đi kèm bất kỳ kết quả nào." },
  { num: "02", q: "Vì sao chỉ có hướng nhà, không có hướng bàn làm việc hay bếp?", a: "Founder đã chọn hướng nhà là utility công khai đầu tiên vì có phạm vi dữ liệu đầu vào/đầu ra rõ nhất. Hướng bàn làm việc, bếp và màu sắc cần một quyết định phương pháp riêng, sẽ xem xét sau khi hướng nhà ổn định." },
  { num: "03", q: "Khi nào Phong Thủy hướng nhà ra mắt?", a: "Chưa có ngày cụ thể. Công thức Bát Trạch và bảng 8 hướng cần một chuyên gia phong thuỷ độc lập rà soát trước khi công bố kết quả thật." },
  { num: "04", q: "Ví dụ ở trên có phải kết quả thật không?", a: "Không. Đây là ví dụ minh hoạ hình dạng bảng kết quả và vị trí trên la bàn — cách phân loại 8 hướng cụ thể chưa được kiểm chứng, không phải kết luận đã duyệt." },
  { num: "05", q: "Tôi có cần bản vẽ mặt bằng nhà không?", a: "Không, ở phiên bản đầu chỉ cần năm sinh, giới tính và hướng nhà đo được. Phân tích mặt bằng chi tiết hơn không nằm trong phạm vi hiện tại." }
];

const FAQ_DATA_EN: readonly FaqItem[] = [
  { num: "01", q: "Does House Direction Feng Shui sell remedial items?", a: "No, and it never will. La So Viet does not sell feng shui charms, amulets, or remedial products alongside any outcome." },
  { num: "02", q: "Why focus only on house orientation rather than desks or kitchens?", a: "The founder selected house direction as the primary public utility due to well-defined inputs and outputs. Desks, kitchens, and color palettes will be addressed once this utility stabilizes." },
  { num: "03", q: "When will House Direction Feng Shui launch?", a: "No firm release date has been set. Calculation formulas and eight-direction matrices require external expert validation before official launch." },
  { num: "04", q: "Is the example above an actual calculation?", a: "No. It is an illustrative visual layout showing the compass display and result table format — directional classifications have not been audited." },
  { num: "05", q: "Do I need architectural floor plans?", a: "No. The initial version only requires birth year, gender, and compass bearing. In-depth spatial floor plan analysis is outside current scope." }
];

function renderSvgIcon(name: string, size = 20, color = "currentColor") {
  switch (name) {
    case "compass":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="8.2" />
          <path d="M15 9l-2.1 5.2-5.2 2.1 2.1-5.2L15 9z" />
          <circle cx="12" cy="12" r="0.9" fill={color} />
        </svg>
      );
    case "user-circle":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="8.2" />
          <circle cx="12" cy="10" r="2.8" />
          <path d="M6.6 18.6c1.2-2 3.1-3.1 5.4-3.1s4.2 1.1 5.4 3.1" />
        </svg>
      );
    case "scroll":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M7 4h11.5v13a3 3 0 0 0 3 3H8a3 3 0 0 1-3-3V6" />
          <path d="M9.5 8.4h6.5M9.5 12.2h6.5" />
        </svg>
      );
    case "book-open":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M12 6.6C10.5 5.1 8.4 4.5 5 4.5v13c3.4 0 5.5.6 7 2 1.5-1.4 3.6-2 7-2v-13c-3.4 0-5.5.6-7 2.1z" />
          <path d="M12 6.6v12.9" />
        </svg>
      );
    case "map-pin":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M12 20.8s7-6.1 7-11a7 7 0 1 0-14 0c0 4.9 7 11 7 11z" />
          <circle cx="12" cy="9.8" r="2.5" />
        </svg>
      );
    case "shield-lock":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M12 3l7.5 3v5.6c0 4.4-3.2 7.1-7.5 8.4-4.3-1.3-7.5-4-7.5-8.4V6L12 3z" />
          <path d="M10 12.6h4v3h-4z" />
          <path d="M10.9 12.6v-1.2a1.1 1.1 0 0 1 2.2 0v1.2" />
        </svg>
      );
    case "help-circle":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="8.2" />
          <path d="M9.7 9.6a2.4 2.4 0 1 1 3.3 2.2c-.7.3-1 .9-1 1.6v.3" />
          <circle cx="12" cy="16.8" r="0.5" fill={color} />
        </svg>
      );
    case "chevron-right":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M9 5.5l6.5 6.5L9 18.5" />
        </svg>
      );
    case "chevron-down":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M5.5 9l6.5 6.5L18.5 9" />
        </svg>
      );
    default:
      return null;
  }
}

export function FengShuiPreview({ locale, className }: FengShuiPreviewProps) {
  const isVi = locale === "vi";
  const [faqOpen, setFaqOpen] = useState<Record<number, boolean>>({ 0: true });

  const freeResults = isVi ? FREE_RESULTS_VI : FREE_RESULTS_EN;
  const directionRows = isVi ? DIRECTION_ROWS_VI : DIRECTION_ROWS_EN;
  const glossaryItems = isVi ? GLOSSARY_ITEMS_VI : GLOSSARY_ITEMS_EN;
  const methodRows = isVi ? METHOD_ROWS_VI : METHOD_ROWS_EN;
  const limitItems = isVi ? LIMIT_ITEMS_VI : LIMIT_ITEMS_EN;
  const faqs = isVi ? FAQ_DATA_VI : FAQ_DATA_EN;

  const toggleFaq = (idx: number) => {
    setFaqOpen((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  const homeHref = isVi ? "/" : "/en";
  const tuviHref = isVi ? "/tu-vi" : "/en/tu-vi";
  const freeToolsHref = isVi ? "/cong-cu-mien-phi" : "/en/cong-cu-mien-phi";
  const kienthucHref = isVi ? "/kien-thuc" : "/en/kien-thuc";
  const loginHref = isVi ? "/dang-nhap" : "/en/dang-nhap";
  const contactHref = isVi ? "/lien-he" : "/en/lien-he";

  return (
    <div
      className={className}
      data-screen-label="phong-thuy-huong-nha"
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
            href={homeHref}
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
            <Link href={homeHref} style={{ color: "var(--text-body)", textDecoration: "none" }}>
              {isVi ? "Trang chủ" : "Home"}
            </Link>
            <Link href={tuviHref} style={{ color: "var(--text-body)", textDecoration: "none" }}>
              {isVi ? "Tử Vi" : "Zi Wei"}
            </Link>
            <Link href={kienthucHref} style={{ color: "var(--text-body)", textDecoration: "none" }}>
              {isVi ? "Kiến thức" : "Knowledge"}
            </Link>
            <Link
              href={freeToolsHref}
              style={{
                color: "var(--stone, #7C8A6E)",
                textDecoration: "none",
                borderBottom: "1px solid var(--stone, #7C8A6E)",
                paddingBottom: "2px",
              }}
            >
              {isVi ? "Công cụ miễn phí" : "Free tools"}
            </Link>
            <Link href={contactHref} style={{ color: "var(--text-body)", textDecoration: "none" }}>
              {isVi ? "Liên hệ" : "Contact"}
            </Link>
          </nav>
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <Link
              href={loginHref}
              style={{ color: "var(--text-body)", textDecoration: "none", fontSize: "14px" }}
            >
              {isVi ? "Đăng nhập" : "Sign in"}
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
                color: "var(--text-faint)",
                marginBottom: "32px",
              }}
            >
              <Link href={homeHref} style={{ color: "var(--text-faint)", textDecoration: "none" }}>
                {isVi ? "Trang chủ" : "Home"}
              </Link>
              {renderSvgIcon("chevron-right", 14, "var(--text-faint)")}
              <Link href={freeToolsHref} style={{ color: "var(--text-faint)", textDecoration: "none" }}>
                {isVi ? "Công cụ miễn phí" : "Free tools"}
              </Link>
              {renderSvgIcon("chevron-right", 14, "var(--text-faint)")}
              <span style={{ color: "var(--text-muted)" }}>
                {isVi ? "Phong Thủy hướng nhà" : "House Direction Feng Shui"}
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
                color: "var(--stone, #7C8A6E)",
                border: "1px solid var(--stone-deep, #3E4636)",
                borderRadius: "var(--radius-pill, 9999px)",
                padding: "6px 14px",
                background: "var(--stone-tint, rgba(124,138,110,0.16))",
              }}
            >
              {isVi ? "Sắp ra mắt" : "Coming Soon"}
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
              {isVi ? "Phong Thủy hướng nhà" : "House Direction Feng Shui"}
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
                ? "So khớp hướng nhà thực đo với cung mệnh gia chủ theo phương pháp Bát Trạch, xem rõ hướng nào thuộc nhóm tốt hay cần lưu ý — kèm đúng lý do, không phải một lời phán chung chung."
                : "Align actual measured house directions with the homeowner's personal trigram under the Eight Mansions method, clarifying which directions are favorable or require caution — with transparent rationale, not a sweeping proclamation."}
            </p>

            <p
              style={{
                margin: "16px 0 0",
                maxWidth: "600px",
                fontSize: "15px",
                lineHeight: 1.6,
                color: "var(--text-muted)",
              }}
            >
              {isVi
                ? "Lá Số Việt chỉ làm một tiện ích duy nhất ở giai đoạn đầu: hướng nhà. Không gộp hướng bàn làm việc, hướng bếp hay màu sắc vào cùng một kết quả."
                : "La So Viet focuses strictly on a single utility in this initial phase: house direction. We do not blend desk orientation, kitchen placement, or decorative colors into an opaque composite."}
            </p>

            <div style={{ marginTop: "32px", display: "flex", gap: "16px", flexWrap: "wrap", alignItems: "center" }}>
              <Link
                href={tuviHref}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  minHeight: "48px",
                  padding: "0 28px",
                  borderRadius: "var(--radius-sm, 4px)",
                  background: "linear-gradient(103deg, #9A7730 0%, #F2DCA0 34%, #C9A44D 58%, #A8842F 100%)",
                  color: "#0F0D0A",
                  fontWeight: 600,
                  fontSize: "15px",
                  textDecoration: "none",
                }}
              >
                {isVi ? "Lập lá số Tử Vi miễn phí" : "Build free Zi Wei chart"}
              </Link>
              <a
                href="#vi-du-huong-nha"
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
                {renderSvgIcon("chevron-right", 16, "var(--text-body)")}
              </a>
            </div>

            <p style={{ margin: "20px 0 0", fontSize: "12.5px", color: "var(--text-faint)" }}>
              {isVi
                ? "Chưa có công cụ tính trực tiếp — trang này giới thiệu phương pháp và một hồ sơ minh hoạ, không phải kết quả tính từ dữ liệu thật."
                : "Live calculation is not yet active — this page introduces the methodology and an illustrative profile, not calculated results from live data."}
            </p>
          </div>
        </section>

        {/* 02 NHẬN ĐƯỢC GÌ */}
        <section
          style={{
            padding: "clamp(56px, 9vw, 104px) 0",
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
                color: "var(--stone, #7C8A6E)",
              }}
            >
              {isVi ? "02 · Khi ra mắt" : "02 · At launch"}
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
              {isVi ? "Bạn sẽ nhận được gì trong bản hướng nhà miễn phí" : "What you will receive in the free house direction utility"}
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
                    padding: "28px 24px",
                    borderBottom: "1px solid var(--border-hairline)",
                    borderRight: item.bordered === false ? "none" : "1px solid var(--border-hairline)",
                    display: "flex",
                    flexDirection: "column",
                    gap: "8px",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    {renderSvgIcon(item.icon, 24, "var(--stone, #7C8A6E)")}
                    <span
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: "12px",
                        color: "var(--text-faint)",
                      }}
                    >
                      {item.num}
                    </span>
                  </div>
                  <div
                    style={{
                      marginTop: "8px",
                      fontFamily: "var(--font-display)",
                      fontSize: "18px",
                      color: "var(--text-heading)",
                    }}
                  >
                    {item.title}
                  </div>
                  <p
                    style={{
                      margin: 0,
                      fontSize: "14px",
                      lineHeight: 1.6,
                      color: "var(--text-body)",
                    }}
                  >
                    {item.body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 03 VÍ DỤ MINH HOẠ */}
        <section id="vi-du-huong-nha" style={{ padding: "clamp(56px, 9vw, 104px) 0" }} data-screen-label="03-vi-du-huong-nha">
          <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "0 clamp(20px, 5vw, 32px)" }}>
            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "11.5px",
                letterSpacing: "0.16em",
                textTransform: "uppercase",
                color: "var(--stone, #7C8A6E)",
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
              {isVi ? "Một kết quả hướng nhà trông như thế nào" : "What a house direction result looks like"}
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
                ? "Hồ sơ dưới đây minh hoạ hình dạng bảng kết quả — cung mệnh và cách xếp loại hướng cụ thể chưa được kiểm chứng bởi chuyên gia phong thuỷ, không phải kết luận thật."
                : "The profile below illustrates the presentation layout — personal trigrams and directional categorizations are not audited by a feng shui expert, not a real conclusion."}
            </p>

            <div
              style={{
                marginTop: "24px",
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
                gap: "16px",
                maxWidth: "640px",
              }}
            >
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <label style={{ fontSize: "12.5px", color: "var(--text-faint)" }}>
                  {isVi ? "Địa chỉ / khu vực" : "Address / area"}
                </label>
                <input
                  type="text"
                  disabled
                  placeholder={isVi ? "Ví dụ: Quận 7, TP.HCM" : "e.g. District 7, HCMC"}
                  style={{
                    minHeight: "44px",
                    padding: "0 12px",
                    background: "var(--surface-panel)",
                    border: "1px solid var(--border-hairline)",
                    borderRadius: "var(--radius-sm, 4px)",
                    color: "var(--text-faint)",
                    fontFamily: "inherit",
                    fontSize: "14px",
                    cursor: "not-allowed",
                  }}
                />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <label style={{ fontSize: "12.5px", color: "var(--text-faint)" }}>
                  {isVi ? "Hướng nhà đo được (độ)" : "Measured orientation (degrees)"}
                </label>
                <input
                  type="text"
                  disabled
                  value={isVi ? "135° (Đông Nam)" : "135° (South-East)"}
                  style={{
                    minHeight: "44px",
                    padding: "0 12px",
                    background: "var(--surface-panel)",
                    border: "1px solid var(--border-hairline)",
                    borderRadius: "var(--radius-sm, 4px)",
                    color: "var(--text-faint)",
                    fontFamily: "inherit",
                    fontSize: "14px",
                    cursor: "not-allowed",
                  }}
                />
              </div>
            </div>
            <p style={{ margin: "10px 0 0", fontSize: "12px", color: "var(--text-faint)" }}>
              {isVi
                ? "Ô nhập chưa hoạt động — dùng để minh hoạ luồng nhập liệu, không phải form thật."
                : "Input fields are inactive — demonstrating input workflow only, not a live form."}
            </p>

            <div
              style={{
                marginTop: "40px",
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                gap: "48px",
                alignItems: "center",
              }}
            >
              <div
                style={{
                  background: "var(--surface-panel)",
                  border: "1px solid var(--border-hairline)",
                  borderRadius: "var(--radius-lg, 8px)",
                  padding: "32px",
                  textAlign: "center",
                }}
              >
                <svg
                  viewBox="0 0 300 300"
                  role="img"
                  aria-label={isVi ? "La bàn minh hoạ 8 hướng, đánh dấu hướng nhà đo được 135 độ (Đông Nam)" : "Compass illustrating 8 directions, marking 135 degrees (South-East)"}
                  style={{ width: "100%", maxWidth: "280px", margin: "0 auto", display: "block" }}
                >
                  <circle cx="150" cy="150" r="130" fill="none" stroke="var(--border-hairline)" strokeWidth="1.5" />
                  <circle cx="150" cy="150" r="4" fill="var(--gold-500)" />
                  <g stroke="var(--border-hairline)" strokeWidth="1">
                    <line x1="150" y1="20" x2="150" y2="280" />
                    <line x1="20" y1="150" x2="280" y2="150" />
                    <line x1="58" y1="58" x2="242" y2="242" />
                    <line x1="242" y1="58" x2="58" y2="242" />
                  </g>
                  <g textAnchor="middle" dominantBaseline="middle" fontSize="14" fontFamily="var(--font-mono)" fill="var(--text-heading)">
                    <text x="150" y="34">{isVi ? "B (0°)" : "N (0°)"}</text>
                    <text x="235" y="70">{isVi ? "ĐB (45°)" : "NE (45°)"}</text>
                    <text x="266" y="150">{isVi ? "Đ (90°)" : "E (90°)"}</text>
                    <text x="235" y="230">{isVi ? "ĐN (135°)" : "SE (135°)"}</text>
                    <text x="150" y="266">{isVi ? "N (180°)" : "S (180°)"}</text>
                    <text x="65" y="230">{isVi ? "TN (225°)" : "SW (225°)"}</text>
                    <text x="34" y="150">{isVi ? "T (270°)" : "W (270°)"}</text>
                    <text x="65" y="70">{isVi ? "TB (315°)" : "NW (315°)"}</text>
                  </g>
                  <line x1="150" y1="150" x2="220" y2="220" stroke="var(--gold-500)" strokeWidth="2.5" />
                  <circle cx="220" cy="220" r="7" fill="var(--gold-500)" />
                </svg>
                <p style={{ margin: "16px 0 0", fontSize: "12.5px", lineHeight: 1.6, color: "var(--text-faint)" }}>
                  {isVi
                    ? "Vạch vàng đánh dấu hướng nhà đo được (Đông Nam, 135°) — minh hoạ vị trí trên la bàn, không phải phép đo thật."
                    : "Gold pointer marks the measured bearing (South-East, 135°) — illustrative placement, not an actual measurement."}
                </p>
              </div>

              <div>
                <h3 style={{ margin: "0 0 16px", fontFamily: "var(--font-display)", fontSize: "19px", color: "var(--text-heading)" }}>
                  {isVi ? "Bảng kết quả (dạng đọc)" : "Result table (reading format)"}
                </h3>
                <div style={{ display: "grid", gap: "8px" }}>
                  {directionRows.map((d) => (
                    <div
                      key={d.label}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: "12px",
                        padding: "10px 14px",
                        background: d.bg,
                        border: "1px solid var(--border-hairline)",
                        borderRadius: "var(--radius-sm, 4px)",
                      }}
                    >
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: "13px", color: "var(--text-heading)", width: "110px" }}>
                        {d.label}
                      </span>
                      <span style={{ fontSize: "13px", color: "var(--text-muted)", flex: 1 }}>
                        {d.rule}
                      </span>
                      <span
                        style={{
                          fontFamily: "var(--font-mono)",
                          fontSize: "11px",
                          letterSpacing: "0.04em",
                          textTransform: "uppercase",
                          color: d.statusColor,
                        }}
                      >
                        {d.status}
                      </span>
                    </div>
                  ))}
                </div>
                <p style={{ margin: "16px 0 0", fontSize: "12.5px", lineHeight: 1.6, color: "var(--text-faint)" }}>
                  {isVi
                    ? "Mỗi hướng nêu rõ nhóm phân loại minh hoạ và mã quy tắc — không có điểm số \"tốt/xấu\" gộp chung, và không kèm gợi ý mua vật phẩm hoá giải cho hướng nào."
                    : "Each orientation lists its illustrative classification and rule code — no composite score, and zero suggestions to purchase remedies."}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 04 THUẬT NGỮ */}
        <section
          style={{ padding: "clamp(56px, 9vw, 104px) 0", borderTop: "1px solid var(--border-hairline)" }}
          data-screen-label="04-thuat-ngu"
        >
          <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "0 clamp(20px, 5vw, 32px)" }}>
            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "11.5px",
                letterSpacing: "0.16em",
                textTransform: "uppercase",
                color: "var(--stone, #7C8A6E)",
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
              {isVi ? "Đọc kết quả mà không bị ngợp thuật ngữ" : "Understanding results without jargon overload"}
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
                <div key={g.term} style={{ background: "var(--surface-panel)", padding: "28px" }}>
                  {renderSvgIcon(g.icon, 24, "var(--stone, #7C8A6E)")}
                  <div
                    style={{
                      marginTop: "16px",
                      fontFamily: "var(--font-display)",
                      fontSize: "18px",
                      lineHeight: 1.35,
                      color: "var(--text-heading)",
                    }}
                  >
                    {g.term}
                  </div>
                  <p style={{ margin: "10px 0 0", fontSize: "14px", lineHeight: 1.65, color: "var(--text-body)" }}>
                    {g.body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 05 CƠ SỞ TÍNH TOÁN */}
        <section
          id="cach-tinh"
          style={{
            padding: "clamp(56px, 9vw, 104px) 0",
            background: "var(--surface-deep)",
            borderTop: "1px solid var(--border-hairline)",
            borderBottom: "1px solid var(--border-hairline)",
          }}
          data-screen-label="05-cach-tinh"
        >
          <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "0 clamp(20px, 5vw, 32px)" }}>
            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "11.5px",
                letterSpacing: "0.16em",
                textTransform: "uppercase",
                color: "var(--stone, #7C8A6E)",
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
              {isVi ? "Phương pháp và giới hạn phạm vi" : "Methodology and scope boundaries"}
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
                ? "Founder đã chốt utility đầu tiên là hướng nhà (không gộp bàn làm việc, bếp hay màu sắc). Công thức Bát Trạch cụ thể và bộ dữ liệu vẫn cần một chuyên gia phong thuỷ độc lập rà soát trước khi công bố kết quả thật."
                : "The founder confirmed the initial utility is house orientation only (excluding desks, hearths, or color schemes). The specific formulas and dataset remain subject to independent review prior to official launch."}
            </p>

            <div style={{ marginTop: "40px", maxWidth: "760px" }}>
              {methodRows.map((m) => (
                <div
                  key={m.label}
                  style={{
                    display: "flex",
                    gap: "24px",
                    padding: "20px 0",
                    borderTop: "1px solid var(--border-hairline)",
                    alignItems: "baseline",
                  }}
                >
                  <span
                    style={{
                      flex: "none",
                      width: "200px",
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

            <p
              style={{
                margin: "32px 0 0",
                maxWidth: "760px",
                fontSize: "14px",
                lineHeight: 1.7,
                color: "var(--text-muted)",
                borderTop: "1px solid var(--border-hairline)",
                paddingTop: "24px",
              }}
            >
              {isVi
                ? "Giống các bộ môn khác, AI tại Lá Số Việt chỉ tổ chức và diễn giải kết quả đã tính theo bộ quy tắc đã duyệt — không tự suy luận hướng tốt/xấu."
                : "Consistent with other disciplines, AI at La So Viet solely formats and organizes results verified by approved rules — never improvising good or bad fortune."}
            </p>
          </div>
        </section>

        {/* 06 GIỚI HẠN */}
        <section style={{ padding: "clamp(56px, 9vw, 104px) 0" }} data-screen-label="06-gioi-han">
          <div
            style={{
              maxWidth: "1200px",
              margin: "0 auto",
              padding: "0 clamp(20px, 5vw, 32px)",
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: "48px",
              alignItems: "start",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
              {renderSvgIcon("shield-lock", 28, "var(--stone, #7C8A6E)")}
              <div>
                <div
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: "11.5px",
                    letterSpacing: "0.16em",
                    textTransform: "uppercase",
                    color: "var(--stone, #7C8A6E)",
                  }}
                >
                  {isVi ? "06 · Giới hạn" : "06 · Boundaries"}
                </div>
                <h2
                  style={{
                    margin: "8px 0 0",
                    fontFamily: "var(--font-display)",
                    fontWeight: 400,
                    fontSize: "clamp(24px, 3vw, 30px)",
                    color: "var(--text-heading)",
                  }}
                >
                  {isVi ? "Nội dung tham khảo, không bán vật phẩm hoá giải" : "Cultural reference only, no remedy merchandise"}
                </h2>
              </div>
            </div>
            <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "grid", gap: "16px" }}>
              {limitItems.map((li, idx) => (
                <li
                  key={idx}
                  style={{
                    display: "flex",
                    gap: "12px",
                    fontSize: "15px",
                    lineHeight: 1.65,
                    color: "var(--text-body)",
                    paddingBottom: "16px",
                    borderBottom: "1px solid var(--border-hairline)",
                  }}
                >
                  <span style={{ flex: "none", marginTop: "4px" }}>
                    {renderSvgIcon("chevron-right", 16, "var(--text-faint)")}
                  </span>
                  <span>{li}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* 07 KIẾN THỨC + FAQ + CTA */}
        <section
          style={{
            padding: "clamp(56px, 9vw, 104px) 0",
            background: "var(--surface-deep)",
            borderTop: "1px solid var(--border-hairline)",
          }}
          data-screen-label="07-kien-thuc-faq"
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
                return (
                  <div key={f.num} style={{ borderBottom: "1px solid var(--border-hairline)" }}>
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
                          {f.num}
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
                marginTop: "88px",
                padding: "56px",
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
                    fontSize: "clamp(24px, 2.8vw, 30px)",
                    color: "var(--text-heading)",
                  }}
                >
                  {isVi ? "Trong lúc chờ, xem lá số Tử Vi miễn phí" : "While waiting, create a free Zi Wei chart"}
                </h2>
                <p style={{ margin: "12px 0 0", fontSize: "15px", lineHeight: 1.6, color: "var(--text-muted)" }}>
                  {isVi ? "Miễn phí, không cần tài khoản." : "Free, no account required."}
                </p>
              </div>
              <Link
                href={tuviHref}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  minHeight: "48px",
                  padding: "0 28px",
                  borderRadius: "var(--radius-sm, 4px)",
                  background: "linear-gradient(103deg, #9A7730 0%, #F2DCA0 34%, #C9A44D 58%, #A8842F 100%)",
                  color: "#0F0D0A",
                  fontWeight: 600,
                  fontSize: "15px",
                  textDecoration: "none",
                }}
              >
                {isVi ? "Lập lá số Tử Vi miễn phí" : "Build free Zi Wei chart"}
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer
        style={{
          borderTop: "1px solid var(--border-hairline)",
          padding: "64px 0 40px",
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
              : "© 2026 La So Viet. Cultural reference content, not a substitute for professional counsel."}
          </span>
          <Link
            href={freeToolsHref}
            style={{ fontSize: "12.5px", color: "var(--text-faint)", textDecoration: "none" }}
          >
            {isVi ? "← Tất cả công cụ miễn phí" : "← All free tools"}
          </Link>
        </div>
      </footer>
    </div>
  );
}

export default FengShuiPreview;
