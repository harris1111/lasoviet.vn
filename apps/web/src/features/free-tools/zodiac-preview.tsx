"use client";

import React, { useState } from "react";
import Link from "next/link";

export type ZodiacPreviewProps = {
  locale: "vi" | "en";
  className?: string;
};

type ZodiacItem = {
  chi: string;
  animal: string;
  recentYear: string;
};

type GlossaryItem = {
  icon: string;
  term: string;
  body: string;
};

type FaqItemData = {
  q: string;
  a: string;
};

const PRESET_YEARS = [1972, 1984, 1990, 1996, 2000, 2008, 2012, 2020, 2024, 2026] as const;

const CHI_VI = ['Tý', 'Sửu', 'Dần', 'Mão', 'Thìn', 'Tỵ', 'Ngọ', 'Mùi', 'Thân', 'Dậu', 'Tuất', 'Hợi'] as const;
const ANIMAL_VI = ['Chuột', 'Trâu', 'Hổ', 'Mèo', 'Rồng', 'Rắn', 'Ngựa', 'Dê', 'Khỉ', 'Gà', 'Chó', 'Lợn'] as const;
const CAN_VI = ['Giáp', 'Ất', 'Bính', 'Đinh', 'Mậu', 'Kỷ', 'Canh', 'Tân', 'Nhâm', 'Quý'] as const;
const ELEMENT_VI = ['Mộc', 'Mộc', 'Hoả', 'Hoả', 'Thổ', 'Thổ', 'Kim', 'Kim', 'Thuỷ', 'Thuỷ'] as const;

const CHI_EN = ['Ty (Rat)', 'Suu (Ox)', 'Dan (Tiger)', 'Mao (Cat/Rabbit)', 'Thin (Dragon)', 'Ty (Snake)', 'Ngo (Horse)', 'Mui (Goat)', 'Than (Monkey)', 'Dau (Rooster)', 'Tuat (Dog)', 'Hoi (Pig)'] as const;
const ANIMAL_EN = ['Rat', 'Ox', 'Tiger', 'Cat / Rabbit', 'Dragon', 'Snake', 'Horse', 'Goat', 'Monkey', 'Rooster', 'Dog', 'Pig'] as const;
const CAN_EN = ['Giap', 'At', 'Binh', 'Dinh', 'Mau', 'Ky', 'Canh', 'Tan', 'Nham', 'Quy'] as const;
const ELEMENT_EN = ['Wood', 'Wood', 'Fire', 'Fire', 'Earth', 'Earth', 'Metal', 'Metal', 'Water', 'Water'] as const;

function computeZodiac(year: number, isVi: boolean) {
  const diff = year - 1984;
  const chiIdx = ((diff % 12) + 12) % 12;
  const canIdx = ((diff % 10) + 10) % 10;
  if (isVi) {
    return {
      year,
      chi: CHI_VI[chiIdx],
      animal: ANIMAL_VI[chiIdx],
      canchi: CAN_VI[canIdx] + ' ' + CHI_VI[chiIdx],
      element: ELEMENT_VI[canIdx],
    };
  }
  return {
    year,
    chi: CHI_EN[chiIdx],
    animal: ANIMAL_EN[chiIdx],
    canchi: CAN_EN[canIdx] + ' ' + CHI_VI[chiIdx],
    element: ELEMENT_EN[canIdx],
  };
}

const ZODIAC_TABLE_VI: readonly ZodiacItem[] = [
  { chi: 'Tý', animal: 'Chuột', recentYear: '2020, 2008, 1996' },
  { chi: 'Sửu', animal: 'Trâu', recentYear: '2021, 2009, 1997' },
  { chi: 'Dần', animal: 'Hổ', recentYear: '2022, 2010, 1998' },
  { chi: 'Mão', animal: 'Mèo', recentYear: '2023, 2011, 1999' },
  { chi: 'Thìn', animal: 'Rồng', recentYear: '2024, 2012, 2000' },
  { chi: 'Tỵ', animal: 'Rắn', recentYear: '2025, 2013, 2001' },
  { chi: 'Ngọ', animal: 'Ngựa', recentYear: '2026, 2014, 2002' },
  { chi: 'Mùi', animal: 'Dê', recentYear: '2027, 2015, 2003' },
  { chi: 'Thân', animal: 'Khỉ', recentYear: '2016, 2004, 1992' },
  { chi: 'Dậu', animal: 'Gà', recentYear: '2017, 2005, 1993' },
  { chi: 'Tuất', animal: 'Chó', recentYear: '2018, 2006, 1994' },
  { chi: 'Hợi', animal: 'Lợn', recentYear: '2019, 2007, 1995' }
];

const ZODIAC_TABLE_EN: readonly ZodiacItem[] = [
  { chi: 'Ty', animal: 'Rat', recentYear: '2020, 2008, 1996' },
  { chi: 'Suu', animal: 'Ox', recentYear: '2021, 2009, 1997' },
  { chi: 'Dan', animal: 'Tiger', recentYear: '2022, 2010, 1998' },
  { chi: 'Mao', animal: 'Cat / Rabbit', recentYear: '2023, 2011, 1999' },
  { chi: 'Thin', animal: 'Dragon', recentYear: '2024, 2012, 2000' },
  { chi: 'Ty', animal: 'Snake', recentYear: '2025, 2013, 2001' },
  { chi: 'Ngo', animal: 'Horse', recentYear: '2026, 2014, 2002' },
  { chi: 'Mui', animal: 'Goat', recentYear: '2027, 2015, 2003' },
  { chi: 'Than', animal: 'Monkey', recentYear: '2016, 2004, 1992' },
  { chi: 'Dau', animal: 'Rooster', recentYear: '2017, 2005, 1993' },
  { chi: 'Tuat', animal: 'Dog', recentYear: '2018, 2006, 1994' },
  { chi: 'Hoi', animal: 'Pig', recentYear: '2019, 2007, 1995' }
];

const GLOSSARY_ITEMS_VI: readonly GlossaryItem[] = [
  { icon: 'compass', term: 'Địa Chi', body: '12 Chi (Tý, Sửu, Dần...) lặp lại theo chu kỳ 12 năm — mỗi Chi ứng với một con giáp cố định, không đổi qua các chu kỳ.' },
  { icon: 'scroll', term: 'Thiên Can', body: '10 Can (Giáp, Ất, Bính...) lặp theo chu kỳ 10 năm. Kết hợp với Địa Chi tạo thành 60 tổ hợp Can Chi không lặp lại trong 60 năm — gọi là Lục Thập Hoa Giáp.' },
  { icon: 'calendar-day', term: 'Ranh giới Tết Nguyên Đán', body: 'Năm con giáp tính theo lịch âm, bắt đầu từ Tết Nguyên Đán chứ không phải ngày 1/1 dương lịch — nên người sinh tháng 1–2 cần đối chiếu ngày Tết cụ thể của năm đó.' }
];

const GLOSSARY_ITEMS_EN: readonly GlossaryItem[] = [
  { icon: 'compass', term: 'Earthly Branches (Dia Chi)', body: 'The 12 Branches (Rat, Ox, Tiger...) repeat in a 12-year cycle — each Branch corresponds to a fixed animal across all sexagenary cycles.' },
  { icon: 'scroll', term: 'Heavenly Stems (Thien Can)', body: 'The 10 Stems (Giap, At, Binh...) repeat in a 10-year cycle. Paired with Branches, they form the 60 unique combinations of the Sexagenary Cycle.' },
  { icon: 'calendar-day', term: 'Lunar New Year Boundary', body: 'The zodiac animal year begins on Lunar New Year (Tet), not January 1st — individuals born in January or February must cross-reference their exact Tet date.' }
];

const LIMIT_ITEMS_VI: readonly string[] = [
  'Con giáp và Can Chi là dữ kiện lịch pháp, không phải nhận định tính cách hay dự báo vận hạn cho năm đó.',
  'Với năm sinh vào tháng 1 hoặc tháng 2 dương lịch, hãy đối chiếu đúng ngày Tết Nguyên Đán của năm đó để biết chính xác con giáp — công cụ này tính theo năm dương lịch trọn năm.',
  '"Ngũ hành theo Can" ở trên là cách gọi phổ biến, đơn giản hoá — khác với bảng Nạp Âm 60 năm chi tiết hơn sẽ hiển thị trong Tử Vi/Bát Tự đầy đủ.'
];

const LIMIT_ITEMS_EN: readonly string[] = [
  'Zodiac animals and Stem-Branch pairs are calendrical astronomical facts, not character profiling or fortune-telling.',
  'For births in solar January or February, check the precise Lunar New Year date of that year — this tool indexes standard solar years.',
  '"Element by Stem" is a simplified grouping — distinct from the comprehensive 60-year Nap Am (Melodic Element) system provided in full Zi Wei / BaZi charts.'
];

const FAQ_DATA_VI: readonly FaqItemData[] = [
  { q: 'Vì sao người sinh tháng 1 có thể thuộc con giáp năm trước?', a: 'Vì năm con giáp tính theo lịch âm, bắt đầu từ Tết Nguyên Đán — thường rơi vào cuối tháng 1 hoặc trong tháng 2 dương lịch, không phải ngày 1/1. Nếu bạn sinh trước Tết của năm dương lịch đó, con giáp thật sẽ là năm liền trước.' },
  { q: '"Ngũ hành theo Can" có phải là "mệnh" đầy đủ không?', a: 'Chưa phải là bảng Nạp Âm 60 năm chi tiết (ví dụ "Bích Thượng Thổ") thường dùng để luận mệnh trong Tử Vi/Bát Tự. Đây chỉ là cách gọi đơn giản theo nhóm 2 Can — bảng Nạp Âm đầy đủ sẽ có trong lá số Tử Vi/Bát Tự.' },
  { q: 'Công cụ này có dự đoán vận hạn của năm con giáp đó không?', a: 'Không. Đây thuần tuý là công cụ tra cứu lịch pháp — không có nhận định tính cách hay dự báo vận hạn nào đi kèm.' },
  { q: 'Tôi có thể lưu kết quả vào hồ sơ của mình không?', a: 'Nếu bạn đã có hồ sơ sinh từ Tử Vi, con giáp và Can Chi năm sinh sẽ tự động khớp — không cần tra cứu riêng.' }
];

const FAQ_DATA_EN: readonly FaqItemData[] = [
  { q: 'Why might someone born in January belong to the previous zodiac animal?', a: 'Because the zodiac animal year follows the lunar calendar starting at Lunar New Year — usually late January or February. If you were born before Tet, your true zodiac animal belongs to the preceding year.' },
  { q: 'Is "Element by Stem" my full personal element (menh)?', a: 'No. It is not the comprehensive 60-year Nap Am element (such as "Bich Thuong Tho") used for deep destiny analysis. The complete Nap Am designation is computed in your full Zi Wei or BaZi chart.' },
  { q: 'Does this tool forecast annual fortunes for the animal signs?', a: 'No. This is purely a calendrical lookup reference — with zero horoscope fortune-telling or personality profiling.' },
  { q: 'Can I save this result to my birth profile?', a: 'If you already created a Zi Wei birth profile, your zodiac sign and Can Chi stem-branch are automatically linked.' }
];

function renderSvgIcon(name: string, size = 18, color = "currentColor") {
  switch (name) {
    case "chevron-right":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M9 5.5l6.5 6.5L9 18.5" />
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
    case "calendar-day":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="4" y="5.5" width="16" height="14.5" rx="2" />
          <path d="M8.5 3.5v4M15.5 3.5v4M4 10.5h16M11.4 14.8h1.4" />
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

export function ZodiacPreview({ locale, className }: ZodiacPreviewProps) {
  const isVi = locale === "vi";
  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [faqOpen, setFaqOpen] = useState<Record<number, boolean>>({ 0: true });

  const result = computeZodiac(selectedYear, isVi);
  const zodiacTable = isVi ? ZODIAC_TABLE_VI : ZODIAC_TABLE_EN;
  const glossaryItems = isVi ? GLOSSARY_ITEMS_VI : GLOSSARY_ITEMS_EN;
  const limitItems = isVi ? LIMIT_ITEMS_VI : LIMIT_ITEMS_EN;
  const faqs = isVi ? FAQ_DATA_VI : FAQ_DATA_EN;

  const toggleFaq = (idx: number) => {
    setFaqOpen((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  return (
    <div
      className={className}
      data-screen-label="12-con-giap"
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
                color: "var(--gold-400, #f2dca0)",
                textDecoration: "none",
                borderBottom: "1px solid var(--gold-500, #c9a44d)",
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
        {/* 01 HERO + TRA CỨU */}
        <section
          style={{ padding: "clamp(48px, 8vw, 88px) 0 clamp(48px, 7vw, 72px)" }}
          data-screen-label="01-hero-tra-cuu"
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
                {isVi ? "12 Con Giáp" : "12 Zodiac Signs"}
              </span>
            </nav>

            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "11.5px",
                letterSpacing: "0.16em",
                textTransform: "uppercase",
                color: "var(--gold-600, #a8842f)",
              }}
            >
              {isVi ? "Tra cứu miễn phí" : "Free lookup reference"}
            </div>

            <h1
              style={{
                margin: "16px 0 0",
                fontFamily: "var(--font-display)",
                fontWeight: 400,
                fontSize: "clamp(32px, 4.2vw, 44px)",
                lineHeight: 1.15,
                color: "var(--text-heading)",
              }}
            >
              {isVi ? "12 Con Giáp" : "12 Animal Zodiac Signs"}
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
                ? "Chọn một năm dương lịch để xem con giáp, Thiên Can – Địa Chi và chu kỳ tương ứng. Đây là dữ kiện lịch pháp, không phải nhận định tính cách hay vận hạn."
                : "Select a solar calendar year to look up the animal sign, Heavenly Stem – Earthly Branch pair, and element cycle. This is calendrical data, not personality analysis or fortune predictions."}
            </p>

            <div
              style={{
                marginTop: "40px",
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 320px), 1fr))",
                gap: "32px",
                alignItems: "start",
              }}
            >
              <div>
                <div style={{ fontSize: "13px", color: "var(--text-faint)", marginBottom: "12px" }}>
                  {isVi ? "Chọn nhanh một năm sinh:" : "Quickly select a birth year:"}
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
                  {PRESET_YEARS.map((y) => {
                    const isActive = y === selectedYear;
                    return (
                      <button
                        key={y}
                        type="button"
                        onClick={() => setSelectedYear(y)}
                        style={{
                          fontFamily: "var(--font-mono)",
                          fontSize: "13px",
                          padding: "8px 16px",
                          borderRadius: "var(--radius-pill, 9999px)",
                          border: isActive ? "1px solid var(--gold-500, #c9a44d)" : "1px solid var(--border-hairline)",
                          background: isActive ? "rgba(201, 164, 77, 0.12)" : "var(--surface-panel)",
                          color: isActive ? "var(--gold-400, #f2dca0)" : "var(--text-body)",
                          cursor: "pointer",
                          minHeight: "40px",
                        }}
                      >
                        {y}
                      </button>
                    );
                  })}
                </div>
                <p style={{ margin: "20px 0 0", fontSize: "12.5px", lineHeight: 1.6, color: "var(--text-faint)" }}>
                  {isVi
                    ? "Nếu bạn sinh vào tháng 1 hoặc tháng 2 dương lịch, con giáp thật của bạn có thể là năm liền trước — vì Tết Nguyên Đán (ranh giới năm con giáp) thường rơi vào cuối tháng 1 hoặc trong tháng 2, không phải ngày 1/1."
                    : "If you were born in January or February of the solar calendar, your true zodiac sign may belong to the preceding year — because Lunar New Year usually falls in late January or February, not January 1st."}
                </p>
              </div>

              <div
                style={{
                  background: "var(--surface-panel)",
                  border: "1px solid var(--border-hairline)",
                  borderRadius: "var(--radius-lg, 8px)",
                  padding: "32px",
                  textAlign: "center",
                }}
              >
                <div
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: "11px",
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    color: "var(--text-faint)",
                  }}
                >
                  {isVi ? `Năm ${result.year}` : `Year ${result.year}`}
                </div>
                <div
                  style={{
                    marginTop: "14px",
                    fontFamily: "var(--font-display)",
                    fontSize: "34px",
                    color: "var(--gold-400, #f2dca0)",
                  }}
                >
                  {result.animal}
                </div>
                <div
                  style={{
                    marginTop: "8px",
                    fontFamily: "var(--font-mono)",
                    fontSize: "15px",
                    color: "var(--text-heading)",
                  }}
                >
                  {result.canchi}
                </div>
                <div
                  style={{
                    marginTop: "16px",
                    display: "flex",
                    justifyContent: "center",
                    gap: "24px",
                    fontSize: "13px",
                    color: "var(--text-muted)",
                    flexWrap: "wrap",
                  }}
                >
                  <span>{isVi ? `Địa Chi: ${result.chi}` : `Earthly Branch: ${result.chi}`}</span>
                  <span>{isVi ? `Ngũ hành theo Can: ${result.element}` : `Element by Stem: ${result.element}`}</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 02 BẢNG 12 CON GIÁP */}
        <section
          style={{
            padding: "clamp(48px, 8vw, 88px) 0",
            background: "var(--surface-deep)",
            borderTop: "1px solid var(--border-hairline)",
            borderBottom: "1px solid var(--border-hairline)",
          }}
          data-screen-label="02-bang-12-con-giap"
        >
          <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "0 clamp(20px, 5vw, 32px)" }}>
            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "11.5px",
                letterSpacing: "0.16em",
                textTransform: "uppercase",
                color: "var(--gold-600, #a8842f)",
              }}
            >
              {isVi ? "02 · Bảng tham chiếu" : "02 · Reference table"}
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
              {isVi ? "Đầy đủ 12 con giáp" : "Complete 12 Zodiac signs"}
            </h2>

            <div style={{ marginTop: "36px", overflowX: "auto" }}>
              <table style={{ width: "100%", minWidth: "640px", borderCollapse: "collapse", fontSize: "13.5px" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border-hairline)" }}>
                    <th scope="col" style={{ textAlign: "left", padding: "10px 12px 10px 0", color: "var(--text-faint)", fontFamily: "var(--font-mono)", fontSize: "11px", letterSpacing: "0.06em", textTransform: "uppercase" }}>
                      {isVi ? "Địa Chi" : "Earthly Branch"}
                    </th>
                    <th scope="col" style={{ textAlign: "left", padding: "10px 12px", color: "var(--text-faint)", fontFamily: "var(--font-mono)", fontSize: "11px", letterSpacing: "0.06em", textTransform: "uppercase" }}>
                      {isVi ? "Con giáp" : "Animal Sign"}
                    </th>
                    <th scope="col" style={{ textAlign: "left", padding: "10px 0", color: "var(--text-faint)", fontFamily: "var(--font-mono)", fontSize: "11px", letterSpacing: "0.06em", textTransform: "uppercase" }}>
                      {isVi ? "Năm gần nhất" : "Recent Years"}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {zodiacTable.map((z) => (
                    <tr key={z.chi} style={{ borderBottom: "1px solid var(--border-hairline)" }}>
                      <td style={{ padding: "11px 12px 11px 0", color: "var(--text-heading)", whiteSpace: "nowrap" }}>{z.chi}</td>
                      <td style={{ padding: "11px 12px", color: "var(--text-body)" }}>{z.animal}</td>
                      <td style={{ padding: "11px 0", color: "var(--text-muted)" }}>{z.recentYear}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* 03 THUẬT NGỮ */}
        <section style={{ padding: "clamp(56px, 9vw, 96px) 0" }} data-screen-label="03-thuat-ngu">
          <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "0 clamp(20px, 5vw, 32px)" }}>
            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "11.5px",
                letterSpacing: "0.16em",
                textTransform: "uppercase",
                color: "var(--gold-600, #a8842f)",
              }}
            >
              {isVi ? "03 · Thuật ngữ cốt lõi" : "03 · Core terminology"}
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
              {isVi ? "Đọc bảng mà không bị ngợp thuật ngữ" : "Read the table without terminology overload"}
            </h2>

            <div
              style={{
                marginTop: "36px",
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                gap: "1px",
                background: "var(--border-hairline)",
                border: "1px solid var(--border-hairline)",
                borderRadius: "var(--radius-lg, 8px)",
                overflow: "hidden",
              }}
            >
              {glossaryItems.map((g) => (
                <div key={g.term} style={{ background: "var(--surface-panel)", padding: "26px" }}>
                  {renderSvgIcon(g.icon, 22, "var(--gold-500, #c9a44d)")}
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

        {/* 04 GIỚI HẠN + FAQ + CTA */}
        <section
          style={{
            padding: "clamp(48px, 8vw, 88px) 0",
            background: "var(--surface-deep)",
            borderTop: "1px solid var(--border-hairline)",
          }}
          data-screen-label="04-gioi-han-faq-cta"
        >
          <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "0 clamp(20px, 5vw, 32px)" }}>
            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "11.5px",
                letterSpacing: "0.16em",
                textTransform: "uppercase",
                color: "var(--gold-600, #a8842f)",
              }}
            >
              {isVi ? "04 · Giới hạn" : "04 · Limitations"}
            </div>
            <ul style={{ margin: "16px 0 0", padding: 0, listStyle: "none", display: "grid", gap: "12px", maxWidth: "760px" }}>
              {limitItems.map((li, idx) => (
                <li key={idx} style={{ display: "flex", gap: "12px", fontSize: "14.5px", lineHeight: 1.6, color: "var(--text-body)" }}>
                  <span style={{ flex: "none", marginTop: "3px" }}>
                    {renderSvgIcon("chevron-right", 16, "var(--text-faint)")}
                  </span>
                  <span>{li}</span>
                </li>
              ))}
            </ul>

            <h2
              style={{
                margin: "64px 0 0",
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
                  <div key={i} style={{ borderBottom: "1px solid var(--border-hairline)" }}>
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
                        <span style={{ fontFamily: "var(--font-mono)", fontSize: "12px", color: "var(--text-faint)" }}>
                          {num}
                        </span>
                        <span style={{ fontSize: "16px", color: "var(--text-heading)", fontWeight: 500 }}>
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
                      <div style={{ padding: "0 0 20px 32px", fontSize: "14.5px", lineHeight: 1.65, color: "var(--text-muted)" }}>
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
                  {isVi ? "Muốn xem đầy đủ lá số của mình?" : "Want to explore your complete chart?"}
                </h2>
                <p style={{ margin: "10px 0 0", fontSize: "14.5px", lineHeight: 1.6, color: "var(--text-muted)" }}>
                  {isVi
                    ? "Lập lá số Tử Vi miễn phí để xem cấu trúc 12 cung — không cần tài khoản."
                    : "Create a free Zi Wei chart to examine your 12 palaces — no account required."}
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

export default ZodiacPreview;
