"use client";

import React, { useState } from "react";
import Link from "next/link";

export type DreamSymbolPreviewProps = {
  locale: "vi" | "en";
  className?: string;
};

type CategoryItem = {
  key: string;
  label: string;
};

type DreamSymbol = {
  key: string;
  category: string;
  title: string;
  folk: string;
  symbolic: string;
};

type FaqItemData = {
  q: string;
  a: string;
};

const CATEGORIES_VI: readonly CategoryItem[] = [
  { key: 'all', label: 'Tất cả' },
  { key: 'animal', label: 'Con vật' },
  { key: 'nature', label: 'Hiện tượng tự nhiên' },
  { key: 'people', label: 'Con người & mối quan hệ' },
  { key: 'event', label: 'Sự kiện đời sống' }
];

const CATEGORIES_EN: readonly CategoryItem[] = [
  { key: 'all', label: 'All' },
  { key: 'animal', label: 'Animals' },
  { key: 'nature', label: 'Natural Phenomena' },
  { key: 'people', label: 'People & Relationships' },
  { key: 'event', label: 'Life Events' }
];

const SYMBOLS_VI: readonly DreamSymbol[] = [
  {
    key: 'animal',
    category: 'Con vật',
    title: 'Mơ thấy rắn',
    folk: 'Dân gian Việt Nam thường gắn hình ảnh con rắn với sự thay đổi hoặc một điều bất ngờ sắp đến, tuỳ vùng miền có cách kể khác nhau.',
    symbolic: 'Trong nhiều truyền thống biểu tượng, rắn gắn với sự lột xác, chuyển tiếp hoặc một nỗi lo chưa gọi tên được.'
  },
  {
    key: 'nature',
    category: 'Hiện tượng tự nhiên',
    title: 'Mơ thấy nước, lũ lụt',
    folk: 'Nước lớn trong giấc mơ dân gian thường được kể là dấu hiệu của cảm xúc dâng trào hoặc một biến động sắp tới.',
    symbolic: 'Nước thường được xem là biểu tượng của cảm xúc và tiềm thức — lũ lụt có thể phản ánh cảm giác quá tải trong đời sống thực.'
  },
  {
    key: 'people',
    category: 'Con người & mối quan hệ',
    title: 'Mơ thấy răng rụng',
    folk: 'Đây là một trong những giấc mơ được kể lại nhiều nhất trong dân gian, thường gắn với lo lắng về sức khoẻ hoặc người thân.',
    symbolic: 'Về mặt tâm lý, mơ răng rụng thường liên quan đến cảm giác mất kiểm soát, lo âu về ngoại hình hoặc một giai đoạn nhiều áp lực.'
  },
  {
    key: 'event',
    category: 'Sự kiện đời sống',
    title: 'Mơ thấy bay',
    folk: 'Giấc mơ bay lên thường được dân gian kể như một dấu hiệu của sự nhẹ nhõm hoặc một giai đoạn thuận lợi sắp tới.',
    symbolic: 'Bay trong giấc mơ thường gắn với cảm giác tự do, thoát khỏi giới hạn hoặc mong muốn kiểm soát một tình huống.'
  },
  {
    key: 'people',
    category: 'Con người & mối quan hệ',
    title: 'Mơ thấy người đã mất',
    folk: 'Nhiều gia đình Việt kể lại đây là dấu hiệu người thân "về thăm", thường đi kèm cảm giác bình yên hơn là sợ hãi.',
    symbolic: 'Đây là một chủ đề giấc mơ phổ biến khi đang xử lý nỗi nhớ hoặc chưa hoàn tất cảm xúc với người đã khuất.'
  },
  {
    key: 'event',
    category: 'Sự kiện đời sống',
    title: 'Mơ thấy đám cưới',
    folk: 'Dân gian thường kể giấc mơ đám cưới gắn với một khởi đầu mới, không nhất thiết liên quan đến chuyện tình cảm thật.',
    symbolic: 'Đám cưới trong giấc mơ thường tượng trưng cho sự kết hợp, cam kết hoặc một quyết định quan trọng đang đến gần.'
  }
];

const SYMBOLS_EN: readonly DreamSymbol[] = [
  {
    key: 'animal',
    category: 'Animals',
    title: 'Dreaming of snakes',
    folk: 'Vietnamese folklore often associates snakes with impending change or unexpected encounters, with regional variations.',
    symbolic: 'Across psychological traditions, snakes represent shedding skins, transition, or an unnamed unconscious fear.'
  },
  {
    key: 'nature',
    category: 'Natural Phenomena',
    title: 'Dreaming of water, floods',
    folk: 'Rising waters in folklore symbolize overflowing emotional states or incoming upheaval.',
    symbolic: 'Water universally mirrors the unconscious mind — floods often reflect overwhelm in waking life obligations.'
  },
  {
    key: 'people',
    category: 'People & Relationships',
    title: 'Dreaming of teeth falling out',
    folk: 'One of the most widespread folk motifs, traditionally linked to concerns over personal vitality or elder relatives.',
    symbolic: 'Psychologically, tooth loss reflects anxiety over loss of control, aging, or profound periods of stress.'
  },
  {
    key: 'event',
    category: 'Life Events',
    title: 'Dreaming of flying',
    folk: 'Flying dreams in folk culture represent lightness, relief, or an auspicious unburdened phase ahead.',
    symbolic: 'Flight symbolizes liberation, breaking past perceived limits, or a conscious desire for broad perspective.'
  },
  {
    key: 'people',
    category: 'People & Relationships',
    title: 'Dreaming of deceased loved ones',
    folk: 'Families commonly describe this as a comforting visitation, bringing peace rather than apprehension.',
    symbolic: 'A natural psychological bridge when processing grief, enduring love, or unfinished emotional reconciliation.'
  },
  {
    key: 'event',
    category: 'Life Events',
    title: 'Dreaming of a wedding',
    folk: 'Folk narratives tie weddings to new beginnings, not necessarily romantic matters.',
    symbolic: 'Weddings symbolize integration, binding commitment, or an impending life-altering crossroad.'
  }
];

const LIMIT_ITEMS_VI: readonly string[] = [
  'Nội dung mang tính tham khảo văn hoá và biểu tượng, không phải chẩn đoán tâm lý hay dự đoán sự kiện cụ thể.',
  'Không có "điểm số giấc mơ" hay xếp hạng may rủi nào đi kèm với bất kỳ biểu tượng nào.',
  'Nội dung không gợi ý, liên kết hay nhắc tới số lô đề dưới bất kỳ hình thức nào — đây là ranh giới an toàn bắt buộc, không có ngoại lệ.',
  'Nếu giấc mơ gây lo lắng kéo dài, hãy trao đổi với người bạn tin cậy hoặc chuyên gia sức khoẻ tâm thần phù hợp.'
];

const LIMIT_ITEMS_EN: readonly string[] = [
  'This content serves cultural and symbolic self-reflection, not psychological diagnosis or fortune prediction.',
  'No "dream score" or lucky/unlucky rating is ever assigned to any symbol.',
  'This tool never suggests, links, or references lottery numbers in any form — a mandatory safety boundary with zero exceptions.',
  'If recurrent dreams cause persistent distress, consider discussing them with a trusted professional.'
];

const FAQ_DATA_VI: readonly FaqItemData[] = [
  { q: 'Giải Mã Giấc Mơ có liên quan đến số đề hay lô đề không?', a: 'Không, và sẽ không bao giờ có. Đây là ranh giới an toàn bắt buộc tại Lá Số Việt — nội dung không gợi ý, liên kết hay nhắc tới bất kỳ con số xổ số/lô đề nào.' },
  { q: 'Vì sao mỗi biểu tượng có hai cách giải thích?', a: 'Để tách rõ điều dân gian vẫn kể (một phần văn hoá) khỏi một góc nhìn biểu tượng/tâm lý trung lập hơn — bạn tự đối chiếu, không bị áp một kết luận duy nhất.' },
  { q: 'Tôi có thể gửi thêm biểu tượng muốn tra cứu không?', a: 'Thư viện biểu tượng sẽ tiếp tục mở rộng. Hiện tại trang chỉ hiển thị một số biểu tượng phổ biến nhất.' },
  { q: 'Nội dung này có thay thế tư vấn tâm lý không?', a: 'Không. Đây là nội dung tham khảo văn hoá và tự chiêm nghiệm, không thay thế chẩn đoán hoặc điều trị từ chuyên gia sức khoẻ tâm thần.' }
];

const FAQ_DATA_EN: readonly FaqItemData[] = [
  { q: 'Does Dream Symbol Decoder relate to lottery numbers or gambling?', a: 'No, and it never will. This is a strict non-negotiable safety policy at La So Viet — no lottery numbers or gambling references are ever included.' },
  { q: 'Why does each symbol show two separate perspectives?', a: 'To cleanly delineate cultural folklore from neutral psychological/symbolic archetypes — empowering you to reflect without rigid dogmatic conclusions.' },
  { q: 'Can I suggest additional symbols for the library?', a: 'The symbol library will continually expand over time. The current preview highlights six representative symbols.' },
  { q: 'Does this replace professional therapy?', a: 'No. This is cultural self-reflection material, never a diagnostic clinical assessment.' }
];

function renderSvgIcon(name: string, size = 18, color = "currentColor") {
  switch (name) {
    case "chevron-right":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M9 5.5l6.5 6.5L9 18.5" />
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

export function DreamSymbolPreview({ locale, className }: DreamSymbolPreviewProps) {
  const isVi = locale === "vi";
  const [category, setCategory] = useState<string>("all");
  const [faqOpen, setFaqOpen] = useState<Record<number, boolean>>({ 0: true });

  const categories = isVi ? CATEGORIES_VI : CATEGORIES_EN;
  const allSymbols = isVi ? SYMBOLS_VI : SYMBOLS_EN;
  const visibleSymbols = category === "all" ? allSymbols : allSymbols.filter((s) => s.key === category);
  const limitItems = isVi ? LIMIT_ITEMS_VI : LIMIT_ITEMS_EN;
  const faqs = isVi ? FAQ_DATA_VI : FAQ_DATA_EN;

  const toggleFaq = (idx: number) => {
    setFaqOpen((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  return (
    <div
      className={className}
      data-screen-label="giai-ma-giac-mo"
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
                {isVi ? "Giải Mã Giấc Mơ" : "Dream Symbol Decoder"}
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
              {isVi ? "Thư viện biểu tượng" : "Symbol library"}
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
              {isVi ? "Giải Mã Giấc Mơ" : "Dream Symbol Decoder"}
            </h1>

            <p
              style={{
                margin: "20px 0 0",
                maxWidth: "620px",
                fontSize: "18px",
                lineHeight: 1.6,
                color: "var(--text-body)",
              }}
            >
              {isVi
                ? "Tra cứu một biểu tượng giấc mơ để xem hai góc nhìn song song: cách dân gian Việt Nam vẫn kể, và một góc nhìn biểu tượng/tâm lý trung lập hơn — không phải dự đoán số hay chẩn đoán."
                : "Look up dream symbols to compare two parallel viewpoints: traditional Vietnamese folk interpretations, and neutral psychological/symbolic archetypes — not fortune-telling or psychological diagnosis."}
            </p>

            <div
              style={{
                marginTop: "24px",
                padding: "14px 20px",
                background: "var(--surface-panel)",
                border: "1px solid var(--border-hairline)",
                borderRadius: "var(--radius-md, 8px)",
                display: "inline-flex",
                alignItems: "center",
                gap: "10px",
                maxWidth: "620px",
              }}
            >
              {renderSvgIcon("shield-lock", 18, "var(--son, #ce5b45)")}
              <span style={{ fontSize: "13.5px", lineHeight: 1.5, color: "var(--text-body)" }}>
                {isVi
                  ? "Nội dung không gợi ý, liên kết hay nhắc tới số lô đề dưới bất kỳ hình thức nào."
                  : "Content does not suggest, link, or reference lottery numbers in any form."}
              </span>
            </div>
          </div>
        </section>

        {/* 02 LƯỚI BIỂU TƯỢNG */}
        <section style={{ padding: "0 0 clamp(56px, 9vw, 88px)" }} data-screen-label="02-luoi-bieu-tuong">
          <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "0 clamp(20px, 5vw, 32px)" }}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", marginBottom: "32px" }}>
              {categories.map((c) => {
                const isActive = c.key === category;
                return (
                  <button
                    key={c.key}
                    type="button"
                    onClick={() => setCategory(c.key)}
                    style={{
                      fontFamily: "var(--font-ui)",
                      fontSize: "13.5px",
                      padding: "8px 16px",
                      borderRadius: "var(--radius-pill, 9999px)",
                      border: isActive ? "1px solid var(--gold-500, #c9a44d)" : "1px solid var(--border-hairline)",
                      background: isActive ? "rgba(201, 164, 77, 0.12)" : "var(--surface-panel)",
                      color: isActive ? "var(--gold-400, #f2dca0)" : "var(--text-body)",
                      cursor: "pointer",
                      minHeight: "40px",
                    }}
                  >
                    {c.label}
                  </button>
                );
              })}
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
                gap: "20px",
              }}
            >
              {visibleSymbols.map((s) => (
                <div
                  key={s.title}
                  style={{
                    background: "var(--surface-panel)",
                    border: "1px solid var(--border-hairline)",
                    borderRadius: "var(--radius-lg, 8px)",
                    padding: "24px",
                  }}
                >
                  <div
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: "10.5px",
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      color: "var(--text-faint)",
                    }}
                  >
                    {s.category}
                  </div>
                  <div
                    style={{
                      marginTop: "10px",
                      fontFamily: "var(--font-display)",
                      fontSize: "19px",
                      color: "var(--text-heading)",
                    }}
                  >
                    {s.title}
                  </div>
                  <p style={{ margin: "10px 0 0", fontSize: "13.5px", lineHeight: 1.6, color: "var(--text-muted)" }}>
                    <strong style={{ color: "var(--text-body)" }}>{isVi ? "Dân gian:" : "Folklore:"}</strong> {s.folk}
                  </p>
                  <p style={{ margin: "8px 0 0", fontSize: "13.5px", lineHeight: 1.6, color: "var(--text-muted)" }}>
                    <strong style={{ color: "var(--text-body)" }}>
                      {isVi ? "Biểu tượng/tâm lý:" : "Symbolic/Psychology:"}
                    </strong>{" "}
                    {s.symbolic}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 03 AN TOÀN */}
        <section
          style={{
            padding: "clamp(48px, 8vw, 80px) 0",
            background: "var(--surface-deep)",
            borderTop: "1px solid var(--border-hairline)",
            borderBottom: "1px solid var(--border-hairline)",
          }}
          data-screen-label="03-an-toan"
        >
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
              {renderSvgIcon("shield-lock", 28, "var(--gold-500, #c9a44d)")}
              <h2
                style={{
                  margin: 0,
                  fontFamily: "var(--font-display)",
                  fontWeight: 400,
                  fontSize: "clamp(22px, 2.6vw, 26px)",
                  color: "var(--text-heading)",
                }}
              >
                {isVi ? "Giới hạn của nội dung này" : "Boundaries of this content"}
              </h2>
            </div>
            <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "grid", gap: "14px" }}>
              {limitItems.map((li, idx) => (
                <li key={idx} style={{ display: "flex", gap: "12px", fontSize: "15px", lineHeight: 1.6, color: "var(--text-body)" }}>
                  <span style={{ flex: "none", marginTop: "3px" }}>
                    {renderSvgIcon("chevron-right", 16, "var(--text-faint)")}
                  </span>
                  <span>{li}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* 04 FAQ + CTA */}
        <section style={{ padding: "clamp(56px, 9vw, 96px) 0" }} data-screen-label="04-faq-cta">
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
                  {isVi ? "Muốn hiểu bản thân sâu hơn?" : "Want to understand yourself more deeply?"}
                </h2>
                <p style={{ margin: "10px 0 0", fontSize: "14.5px", lineHeight: 1.6, color: "var(--text-muted)" }}>
                  {isVi
                    ? "Lập lá số Tử Vi miễn phí để xem cấu trúc 12 cung — không cần tài khoản."
                    : "Create a free Zi Wei chart to explore your 12 palaces — no account required."}
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

export default DreamSymbolPreview;
