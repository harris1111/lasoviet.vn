"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";

import { FreeToolCrossSellBanner } from "./free-tool-cross-sell-banner";
import {
  evaluateLoveCompatibility,
  type LoveCompatibilityResult,
} from "./love-compatibility-engine";

export type LoveCompatibilityPreviewProps = {
  locale: "vi" | "en";
  className?: string;
};

export function LoveCompatibilityPreview({ locale, className }: LoveCompatibilityPreviewProps) {
  const isVi = locale === "vi";

  // Form input state
  const [nameA, setNameA] = useState<string>("Mẫu");
  const [yearA, setYearA] = useState<number>(1992);
  const [nameB, setNameB] = useState<string>("Quân");
  const [yearB, setYearB] = useState<number>(1990);

  // Computation
  const result: LoveCompatibilityResult = useMemo(() => {
    return evaluateLoveCompatibility(nameA, yearA, nameB, yearB, locale);
  }, [nameA, yearA, nameB, yearB, locale]);

  return (
    <div
      className={className}
      style={{
        background: "var(--surface-base, #15120E)",
        color: "var(--text-body, #DCD4C3)",
        fontFamily: "var(--font-ui, system-ui, -apple-system, sans-serif)",
      }}
    >
      <main style={{ maxWidth: "1200px", margin: "0 auto", padding: "clamp(32px, 6vw, 64px) clamp(20px, 5vw, 32px)" }}>
        {/* Breadcrumb */}
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
            marginBottom: "28px",
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
            {isVi ? "Bói Tình Yêu" : "Love Compatibility"}
          </span>
        </nav>

        {/* Hero */}
        <div style={{ display: "flex", alignItems: "center", gap: "20px", marginBottom: "36px", flexWrap: "wrap" }}>
          <div
            style={{
              width: "56px",
              height: "56px",
              borderRadius: "var(--radius-pill, 9999px)",
              background: "var(--teal-tint, rgba(85, 119, 115, 0.16))",
              border: "1px solid var(--teal-deep, #33504C)",
              display: "grid",
              placeItems: "center",
              color: "var(--teal, #6E9C97)",
              fontSize: "24px",
              flexShrink: 0,
            }}
          >
            ♥
          </div>
          <div>
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
                padding: "4px 12px",
                marginBottom: "8px",
                background: "var(--teal-tint, rgba(85, 119, 115, 0.16))",
              }}
            >
              {isVi ? "Đang hoạt động" : "Active tool"}
            </div>
            <h1
              style={{
                margin: "4px 0 6px",
                fontFamily: "var(--font-display, Georgia, serif)",
                fontWeight: 400,
                fontSize: "clamp(28px, 3.8vw, 40px)",
                lineHeight: 1.2,
                color: "var(--text-heading, #F6F1E6)",
              }}
            >
              {isVi ? "Bói Tình Yêu Theo Tuổi" : "Love Compatibility by Zodiac Age"}
            </h1>
            <p style={{ margin: 0, fontSize: "15px", color: "var(--text-muted, #A79E8B)" }}>
              {isVi
                ? "Xem hai người hòa hợp ở đâu, dễ va chạm ở đâu theo con giáp và ngũ hành năm sinh — không chấm điểm may rủi ảo."
                : "Analyze harmony and friction through traditional animal branches and five elements — zero arbitrary percentages."}
            </p>
          </div>
        </div>

        {/* Inputs card */}
        <section
          style={{
            background: "var(--surface-panel, #1C1813)",
            border: "1px solid var(--border-hairline, #3A3227)",
            borderRadius: "var(--radius-lg, 12px)",
            padding: "28px",
            marginBottom: "32px",
          }}
        >
          <h2 style={{ margin: "0 0 20px", fontFamily: "var(--font-display, Georgia, serif)", fontSize: "19px", color: "var(--text-heading, #F6F1E6)" }}>
            {isVi ? "Thông tin hai người" : "Partner Information"}
          </h2>

          <form
            onSubmit={(e) => e.preventDefault()}
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
              gap: "24px",
              alignItems: "end",
            }}
          >
            {/* Person A */}
            <div style={{ display: "grid", gap: "12px" }}>
              <label style={{ display: "grid", gap: "6px", fontSize: "14px", color: "var(--text-body, #DCD4C3)" }}>
                <span>{isVi ? "Tên người thứ nhất" : "Person 1 Name"}</span>
                <input
                  type="text"
                  value={nameA}
                  onChange={(e) => setNameA(e.target.value)}
                  style={{
                    height: "44px",
                    padding: "0 14px",
                    borderRadius: "var(--radius-sm, 4px)",
                    background: "var(--surface-deep, #0F0D0A)",
                    border: "1px solid var(--border-hairline, #3A3227)",
                    color: "var(--text-heading, #F6F1E6)",
                    fontSize: "15px",
                  }}
                />
              </label>
              <label style={{ display: "grid", gap: "6px", fontSize: "14px", color: "var(--text-body, #DCD4C3)" }}>
                <span>{isVi ? "Năm sinh dương lịch" : "Birth Year"}</span>
                <input
                  type="number"
                  min="1920"
                  max="2030"
                  value={yearA}
                  onChange={(e) => setYearA(Number(e.target.value) || 1990)}
                  style={{
                    height: "44px",
                    padding: "0 14px",
                    borderRadius: "var(--radius-sm, 4px)",
                    background: "var(--surface-deep, #0F0D0A)",
                    border: "1px solid var(--border-hairline, #3A3227)",
                    color: "var(--text-heading, #F6F1E6)",
                    fontSize: "15px",
                  }}
                />
              </label>
            </div>

            {/* Person B */}
            <div style={{ display: "grid", gap: "12px" }}>
              <label style={{ display: "grid", gap: "6px", fontSize: "14px", color: "var(--text-body, #DCD4C3)" }}>
                <span>{isVi ? "Tên người thứ hai" : "Person 2 Name"}</span>
                <input
                  type="text"
                  value={nameB}
                  onChange={(e) => setNameB(e.target.value)}
                  style={{
                    height: "44px",
                    padding: "0 14px",
                    borderRadius: "var(--radius-sm, 4px)",
                    background: "var(--surface-deep, #0F0D0A)",
                    border: "1px solid var(--border-hairline, #3A3227)",
                    color: "var(--text-heading, #F6F1E6)",
                    fontSize: "15px",
                  }}
                />
              </label>
              <label style={{ display: "grid", gap: "6px", fontSize: "14px", color: "var(--text-body, #DCD4C3)" }}>
                <span>{isVi ? "Năm sinh dương lịch" : "Birth Year"}</span>
                <input
                  type="number"
                  min="1920"
                  max="2030"
                  value={yearB}
                  onChange={(e) => setYearB(Number(e.target.value) || 1990)}
                  style={{
                    height: "44px",
                    padding: "0 14px",
                    borderRadius: "var(--radius-sm, 4px)",
                    background: "var(--surface-deep, #0F0D0A)",
                    border: "1px solid var(--border-hairline, #3A3227)",
                    color: "var(--text-heading, #F6F1E6)",
                    fontSize: "15px",
                  }}
                />
              </label>
            </div>
          </form>

          <p style={{ margin: "16px 0 0", fontSize: "13px", color: "var(--text-faint, #6E6656)" }}>
            {isVi
              ? "Lưu ý: Nếu sinh trước Tết Nguyên Đán, bạn có thể nhập năm âm lịch tương ứng để có kết quả chính xác nhất."
              : "Note: For births occurring before Lunar New Year, enter the corresponding Lunar year for exact Can Chi."}
          </p>

          {/* Partner Badges */}
          <div style={{ marginTop: "24px", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "16px" }}>
            <div style={{ background: "var(--surface-deep, #0F0D0A)", border: "1px solid var(--border-hairline, #3A3227)", borderRadius: "var(--radius-md, 8px)", padding: "16px" }}>
              <b style={{ display: "block", fontSize: "17px", color: "var(--text-heading, #F6F1E6)", marginBottom: "4px" }}>
                {result.personA.name}
              </b>
              <span style={{ fontSize: "14px", color: "var(--text-muted, #A79E8B)" }}>
                {isVi
                  ? `Năm ${result.personA.canName} ${result.personA.chiName} · Mệnh ${result.personA.napAmName} (${result.personA.element})`
                  : `Year of ${result.personA.canName} ${result.personA.chiName} · ${result.personA.napAmName} (${result.personA.element})`}
              </span>
            </div>

            <div style={{ background: "var(--surface-deep, #0F0D0A)", border: "1px solid var(--border-hairline, #3A3227)", borderRadius: "var(--radius-md, 8px)", padding: "16px" }}>
              <b style={{ display: "block", fontSize: "17px", color: "var(--text-heading, #F6F1E6)", marginBottom: "4px" }}>
                {result.personB.name}
              </b>
              <span style={{ fontSize: "14px", color: "var(--text-muted, #A79E8B)" }}>
                {isVi
                  ? `Năm ${result.personB.canName} ${result.personB.chiName} · Mệnh ${result.personB.napAmName} (${result.personB.element})`
                  : `Year of ${result.personB.canName} ${result.personB.chiName} · ${result.personB.napAmName} (${result.personB.element})`}
              </span>
            </div>
          </div>

          {/* Results: 2 layers */}
          <div style={{ marginTop: "24px", display: "grid", gap: "16px" }}>
            {/* Zodiac Layer */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "160px minmax(0, 1fr)",
                gap: "16px",
                alignItems: "start",
                padding: "18px 20px",
                borderRadius: "var(--radius-md, 8px)",
                background: "var(--surface-deep, #0F0D0A)",
                border: "1px solid var(--border-hairline, #3A3227)",
              }}
            >
              <div>
                <span style={{ fontWeight: 600, color: "var(--text-heading, #F6F1E6)", fontSize: "15px" }}>
                  {isVi ? "Về Con Giáp" : "Zodiac Branch"}
                </span>
                <div style={{ marginTop: "6px" }}>
                  <span
                    style={{
                      display: "inline-block",
                      fontSize: "12px",
                      padding: "3px 10px",
                      borderRadius: "var(--radius-pill, 9999px)",
                      fontWeight: 600,
                      background: result.zodiacRelation.tagClass === "tag-gold"
                        ? "rgba(201,164,77,0.2)"
                        : result.zodiacRelation.tagClass === "tag-seal"
                        ? "rgba(206,91,69,0.2)"
                        : "var(--surface-panel, #1C1813)",
                      color: result.zodiacRelation.tagClass === "tag-gold"
                        ? "var(--gold-400, #D4AF37)"
                        : result.zodiacRelation.tagClass === "tag-seal"
                        ? "#EC8A74"
                        : "var(--text-muted, #A79E8B)",
                      border: "1px solid currentColor",
                    }}
                  >
                    {result.zodiacRelation.title}
                  </span>
                </div>
              </div>
              <p style={{ margin: 0, fontSize: "14.5px", lineHeight: 1.6, color: "var(--text-body, #DCD4C3)" }}>
                {result.zodiacRelation.description}
              </p>
            </div>

            {/* Element Layer */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "160px minmax(0, 1fr)",
                gap: "16px",
                alignItems: "start",
                padding: "18px 20px",
                borderRadius: "var(--radius-md, 8px)",
                background: "var(--surface-deep, #0F0D0A)",
                border: "1px solid var(--border-hairline, #3A3227)",
              }}
            >
              <div>
                <span style={{ fontWeight: 600, color: "var(--text-heading, #F6F1E6)", fontSize: "15px" }}>
                  {isVi ? "Về Ngũ Hành" : "Five Elements"}
                </span>
                <div style={{ marginTop: "6px" }}>
                  <span
                    style={{
                      display: "inline-block",
                      fontSize: "12px",
                      padding: "3px 10px",
                      borderRadius: "var(--radius-pill, 9999px)",
                      fontWeight: 600,
                      background: result.elementRelation.tagClass === "tag-gold"
                        ? "rgba(201,164,77,0.2)"
                        : result.elementRelation.tagClass === "tag-seal"
                        ? "rgba(206,91,69,0.2)"
                        : "var(--surface-panel, #1C1813)",
                      color: result.elementRelation.tagClass === "tag-gold"
                        ? "var(--gold-400, #D4AF37)"
                        : result.elementRelation.tagClass === "tag-seal"
                        ? "#EC8A74"
                        : "var(--text-muted, #A79E8B)",
                      border: "1px solid currentColor",
                    }}
                  >
                    {result.elementRelation.title}
                  </span>
                </div>
              </div>
              <p style={{ margin: 0, fontSize: "14.5px", lineHeight: 1.6, color: "var(--text-body, #DCD4C3)" }}>
                {result.elementRelation.description}
              </p>
            </div>
          </div>
        </section>

        {/* Bridge Card to Zi Wei Phu The */}
        <aside
          style={{
            background: "linear-gradient(160deg, rgba(206,91,69,0.12), var(--surface-panel, #1C1813) 60%)",
            border: "1px solid rgba(206,91,69,0.45)",
            borderRadius: "var(--radius-lg, 12px)",
            padding: "28px",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: "24px",
            alignItems: "center",
            marginBottom: "40px",
          }}
        >
          <div>
            <span style={{ fontFamily: "var(--font-mono, monospace)", fontSize: "11.5px", letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--accent-seal, #CE5B45)" }}>
              {isVi ? "Còn tùy lá số của bạn" : "Depends on your personal chart"}
            </span>
            <h2 style={{ margin: "8px 0 10px", fontFamily: "var(--font-display, Georgia, serif)", fontSize: "22px", color: "var(--text-heading, #F6F1E6)", lineHeight: 1.3 }}>
              {isVi
                ? "Tuổi hợp chỉ là một lớp. Cung Phu Thê nói phần còn lại."
                : "Yearly age is only one layer. The Marriage Palace reveals personal dynamics."}
            </h2>
            <p style={{ margin: 0, fontSize: "14.5px", lineHeight: 1.6, color: "var(--text-body, #DCD4C3)" }}>
              {isVi
                ? "Tuổi và ngũ hành năm sinh giống nhau cho hàng triệu người sinh cùng năm. Cung Phu Thê trong lá số Tử Vi của bạn cho biết mẫu người gắn bó, cách tương tác và những giai đoạn nhạy cảm của riêng bạn."
                : "Birth years and elements are shared by millions. Your Zi Wei Marriage Palace reveals specific relational patterns, spouse traits, and sensitive timing."}
            </p>
          </div>

          <div style={{ textAlign: "center" }}>
            <Link
              href={
                isVi
                  ? `/tao-la-so/tu-vi?name=${encodeURIComponent(nameA)}&birthYear=${yearA}`
                  : `/en/tao-la-so/tu-vi?name=${encodeURIComponent(nameA)}&birthYear=${yearA}`
              }
              style={{
                display: "inline-block",
                padding: "12px 24px",
                borderRadius: "var(--radius-sm, 4px)",
                background: "linear-gradient(103deg, #9A7730 0%, #F2DCA0 34%, #C9A44D 58%, #A8842F 100%)",
                color: "#0F0D0A",
                fontWeight: 600,
                fontSize: "14.5px",
                textDecoration: "none",
              }}
            >
              {isVi ? "Xem cung Phu Thê của tôi" : "Examine My Marriage Palace"}
            </Link>
            <span style={{ display: "block", marginTop: "8px", fontSize: "12px", color: "var(--text-muted, #A79E8B)" }}>
              {isVi ? "Lập lá số miễn phí, tự động điền thông tin vừa nhập" : "Free chart creation, pre-filled with your inputs"}
            </span>
          </div>
        </aside>

        {/* Explain Article */}
        <article style={{ borderTop: "1px solid var(--border-hairline, #3A3227)", paddingTop: "32px", marginBottom: "40px" }}>
          <h2 style={{ fontFamily: "var(--font-display, Georgia, serif)", fontSize: "20px", color: "var(--text-heading, #F6F1E6)", marginBottom: "12px" }}>
            {isVi ? "Xem tuổi hợp dựa vào đâu?" : "Methodological Basis for Compatibility"}
          </h2>
          <p style={{ fontSize: "14.5px", lineHeight: 1.6, color: "var(--text-body, #DCD4C3)", margin: "0 0 12px" }}>
            {isVi
              ? "Công cụ phân tích dựa trên hai tiêu chuẩn văn hóa truyền thống: địa chi con giáp (tam hợp, lục hợp, lục xung, lục hại) và ngũ hành nạp âm theo vòng lục thập hoa giáp (tương sinh, tương khắc, bình hòa)."
              : "Calculations rely on two traditional foundations: animal branch cycles (triads, six harmonies, clashes, harms) and sexagenary cycle five elements."}
          </p>
          <p style={{ fontSize: "14.5px", lineHeight: 1.6, color: "var(--text-body, #DCD4C3)", margin: 0 }}>
            {isVi
              ? "Lá Số Việt không đưa ra điểm số may rủi tuyệt đối (FD-063) và không đưa ra lời phán mang tính áp đặt hôn nhân. Mối quan hệ bền vững luôn được vun đắp từ sự thấu hiểu, tôn trọng và sẻ chia giữa hai người."
              : "La So Viet avoids arbitrary percentage scores (FD-063). Long-lasting relationships are built on communication, mutual respect, and patience."}
          </p>
        </article>

        {/* Cross-sell banner */}
        <FreeToolCrossSellBanner locale={locale} tool="love-compatibility" />
      </main>
    </div>
  );
}
