"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";

import { FreeToolCrossSellBanner } from "./free-tool-cross-sell-banner";
import {
  calculateNumerology,
  type NumerologyResult,
} from "./numerology-engine";

export type NumerologyPreviewProps = {
  locale: "vi" | "en";
  className?: string;
};

export function NumerologyPreview({ locale, className }: NumerologyPreviewProps) {
  const isVi = locale === "vi";

  // Form input state
  const [fullName, setFullName] = useState<string>("Trần Thị Mẫu");
  const [birthDate, setBirthDate] = useState<string>("1992-06-15");

  // Computation
  const result: NumerologyResult = useMemo(() => {
    return calculateNumerology(birthDate, fullName, locale);
  }, [birthDate, fullName, locale]);

  // Extract day, month, year for bridge link
  const dateParts = useMemo(() => {
    const parts = birthDate.split("-");
    return {
      year: parts[0] ?? "1992",
      month: parts[1] ? String(Number(parts[1])) : "6",
      day: parts[2] ? String(Number(parts[2])) : "15",
    };
  }, [birthDate]);

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
            {isVi ? "Thần Số Học" : "Numerology"}
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
            #
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
              {isVi ? "Tra cứu Thần Số Học" : "Pythagorean Numerology Lookup"}
            </h1>
            <p style={{ margin: 0, fontSize: "15px", color: "var(--text-muted, #A79E8B)" }}>
              {isVi
                ? "Tính số chủ đạo, số sứ mệnh, số linh hồn, số nhân cách và biểu đồ ngày sinh theo hệ Pythagoras."
                : "Calculate Life Path, Destiny, Soul Urge, Personality, and 3x3 Birth Chart Grid."}
            </p>
          </div>
        </div>

        {/* Inputs and Results Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "24px", marginBottom: "40px" }}>
          {/* Main Input & Core Numbers */}
          <section
            style={{
              background: "var(--surface-panel, #1C1813)",
              border: "1px solid var(--border-hairline, #3A3227)",
              borderRadius: "var(--radius-lg, 12px)",
              padding: "24px",
            }}
          >
            <h2 style={{ margin: "0 0 16px", fontFamily: "var(--font-display, Georgia, serif)", fontSize: "19px", color: "var(--text-heading, #F6F1E6)" }}>
              {isVi ? "Nhập thông tin" : "Enter Information"}
            </h2>

            <form onSubmit={(e) => e.preventDefault()} style={{ display: "grid", gap: "16px" }}>
              <label style={{ display: "grid", gap: "6px", fontSize: "14px", color: "var(--text-body, #DCD4C3)" }}>
                <span>{isVi ? "Họ và tên khai sinh" : "Full Birth Name"}</span>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder={isVi ? "Ví dụ: Trần Thị Mẫu" : "e.g. Jane Doe"}
                  style={{
                    height: "44px",
                    padding: "0 14px",
                    borderRadius: "var(--radius-sm, 4px)",
                    background: "var(--surface-deep, #0F0D0A)",
                    border: "1px solid var(--border-hairline, #3A3227)",
                    color: "var(--text-heading, #F6F1E6)",
                    fontSize: "15px",
                    fontFamily: "inherit",
                  }}
                />
              </label>

              <label style={{ display: "grid", gap: "6px", fontSize: "14px", color: "var(--text-body, #DCD4C3)" }}>
                <span>{isVi ? "Ngày sinh dương lịch" : "Solar Birth Date"}</span>
                <input
                  type="date"
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                  style={{
                    height: "44px",
                    padding: "0 14px",
                    borderRadius: "var(--radius-sm, 4px)",
                    background: "var(--surface-deep, #0F0D0A)",
                    border: "1px solid var(--border-hairline, #3A3227)",
                    color: "var(--text-heading, #F6F1E6)",
                    fontSize: "15px",
                    fontFamily: "inherit",
                  }}
                />
              </label>
            </form>

            {/* Life Path Big Display */}
            <div
              style={{
                marginTop: "24px",
                padding: "20px",
                background: "var(--surface-deep, #0F0D0A)",
                border: "1px solid var(--border-hairline, #3A3227)",
                borderRadius: "var(--radius-md, 8px)",
                display: "flex",
                gap: "20px",
                alignItems: "center",
                flexWrap: "wrap",
              }}
            >
              <div
                style={{
                  width: "90px",
                  height: "90px",
                  borderRadius: "var(--radius-pill, 9999px)",
                  display: "grid",
                  placeItems: "center",
                  fontSize: "36px",
                  fontFamily: "var(--font-display, Georgia, serif)",
                  fontWeight: 600,
                  color: "var(--gold-400, #D4AF37)",
                  background: "radial-gradient(circle at 35% 30%, #2E271E, #15120E 70%)",
                  boxShadow: "inset 0 0 0 2px rgba(201,164,77,.7), inset 0 0 0 6px rgba(15,13,10,.9)",
                  flexShrink: 0,
                }}
              >
                {result.lifePathDisplay}
              </div>
              <div style={{ flex: 1, minWidth: "200px" }}>
                <span style={{ fontFamily: "var(--font-mono, monospace)", fontSize: "11.5px", letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--teal, #6E9C97)" }}>
                  {isVi ? "Con số chủ đạo" : "Life Path Number"}
                </span>
                <h3 style={{ margin: "4px 0 6px", fontFamily: "var(--font-display, Georgia, serif)", fontSize: "20px", color: "var(--text-heading, #F6F1E6)" }}>
                  {result.lifePathTitle}
                </h3>
                <p style={{ margin: 0, fontSize: "14px", lineHeight: 1.6, color: "var(--text-body, #DCD4C3)" }}>
                  {result.lifePathMeaning}
                </p>
              </div>
            </div>

            {/* Other 3 numbers */}
            <div style={{ marginTop: "20px", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: "12px" }}>
              <div style={{ background: "var(--surface-deep, #0F0D0A)", border: "1px solid var(--border-hairline, #3A3227)", borderRadius: "var(--radius-sm, 6px)", padding: "14px" }}>
                <span style={{ fontSize: "12.5px", color: "var(--text-muted, #A79E8B)", fontFamily: "var(--font-mono, monospace)" }}>
                  {isVi ? "Số sứ mệnh" : "Destiny Number"}
                </span>
                <div style={{ fontSize: "26px", fontFamily: "var(--font-display, Georgia, serif)", color: "var(--gold-400, #D4AF37)", margin: "4px 0" }}>
                  {result.destinyNumber}
                </div>
                <p style={{ margin: 0, fontSize: "12.5px", lineHeight: 1.5, color: "var(--text-body, #DCD4C3)" }}>
                  {result.destinyMeaning}
                </p>
              </div>

              <div style={{ background: "var(--surface-deep, #0F0D0A)", border: "1px solid var(--border-hairline, #3A3227)", borderRadius: "var(--radius-sm, 6px)", padding: "14px" }}>
                <span style={{ fontSize: "12.5px", color: "var(--text-muted, #A79E8B)", fontFamily: "var(--font-mono, monospace)" }}>
                  {isVi ? "Số linh hồn" : "Soul Urge"}
                </span>
                <div style={{ fontSize: "26px", fontFamily: "var(--font-display, Georgia, serif)", color: "var(--gold-400, #D4AF37)", margin: "4px 0" }}>
                  {result.soulNumber}
                </div>
                <p style={{ margin: 0, fontSize: "12.5px", lineHeight: 1.5, color: "var(--text-body, #DCD4C3)" }}>
                  {result.soulMeaning}
                </p>
              </div>

              <div style={{ background: "var(--surface-deep, #0F0D0A)", border: "1px solid var(--border-hairline, #3A3227)", borderRadius: "var(--radius-sm, 6px)", padding: "14px" }}>
                <span style={{ fontSize: "12.5px", color: "var(--text-muted, #A79E8B)", fontFamily: "var(--font-mono, monospace)" }}>
                  {isVi ? "Số nhân cách" : "Personality"}
                </span>
                <div style={{ fontSize: "26px", fontFamily: "var(--font-display, Georgia, serif)", color: "var(--gold-400, #D4AF37)", margin: "4px 0" }}>
                  {result.personalityNumber}
                </div>
                <p style={{ margin: 0, fontSize: "12.5px", lineHeight: 1.5, color: "var(--text-body, #DCD4C3)" }}>
                  {result.personalityMeaning}
                </p>
              </div>
            </div>
          </section>

          {/* 3x3 Birth Chart Grid */}
          <section
            style={{
              background: "var(--surface-panel, #1C1813)",
              border: "1px solid var(--border-hairline, #3A3227)",
              borderRadius: "var(--radius-lg, 12px)",
              padding: "24px",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <h2 style={{ margin: "0 0 6px", fontFamily: "var(--font-display, Georgia, serif)", fontSize: "19px", color: "var(--text-heading, #F6F1E6)" }}>
              {isVi ? "Biểu đồ ngày sinh" : "3×3 Birth Chart Grid"}
            </h2>
            <p style={{ margin: "0 0 20px", fontSize: "13.5px", color: "var(--text-muted, #A79E8B)", lineHeight: 1.5 }}>
              {isVi
                ? "Mỗi chữ số trong ngày sinh được điền vào ô tương ứng theo hệ Pythagoras. Ô có số thể hiện tiềm năng tự nhiên; ô trống là bài học cần rèn luyện bổ sung."
                : "Each digit in your birth date occupies its corresponding cell. Present numbers indicate active innate energies; empty cells represent growth areas."}
            </p>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 72px)",
                gap: "8px",
                justifyContent: "center",
                margin: "12px 0 20px",
              }}
            >
              {result.gridOrder.map((n) => {
                const count = result.gridCounts[n] ?? 0;
                const isHit = count > 0;
                return (
                  <div
                    key={n}
                    aria-label={`Số ${n}: ${count ? `${count} lần` : "trống"}`}
                    style={{
                      height: "64px",
                      borderRadius: "var(--radius-sm, 6px)",
                      border: isHit ? "1px solid var(--gold-400, #D4AF37)" : "1px solid var(--border-hairline, #3A3227)",
                      background: isHit ? "rgba(201,164,77,0.15)" : "var(--surface-deep, #0F0D0A)",
                      color: isHit ? "var(--gold-400, #D4AF37)" : "var(--text-faint, #6E6656)",
                      display: "grid",
                      placeItems: "center",
                      fontFamily: "var(--font-ui, sans-serif)",
                      fontWeight: isHit ? 600 : 400,
                      fontSize: "17px",
                      letterSpacing: count > 1 ? "2px" : "normal",
                    }}
                  >
                    {isHit ? String(n).repeat(count) : n}
                  </div>
                );
              })}
            </div>

            <div style={{ marginTop: "auto", borderTop: "1px solid var(--border-hairline, #3A3227)", paddingTop: "16px" }}>
              <div style={{ fontSize: "13.5px", color: "var(--text-muted, #A79E8B)" }}>
                <b>{isVi ? "Các ô còn trống:" : "Empty numbers:"}</b>{" "}
                {result.emptyNumbers.length > 0 ? result.emptyNumbers.join(", ") : isVi ? "Không có" : "None"}
              </div>
              <p style={{ margin: "6px 0 0", fontSize: "12.5px", color: "var(--text-faint, #6E6656)", lineHeight: 1.5 }}>
                {isVi
                  ? "Hệ trục: 3-6-9 (Trí não) · 2-5-8 (Tâm hồn & Cảm xúc) · 1-4-7 (Thể chất & Hành động)."
                  : "Planes: 3-6-9 (Mind) · 2-5-8 (Soul/Emotion) · 1-4-7 (Physical/Action)."}
              </p>
            </div>
          </section>
        </div>

        {/* Bridge Card to Zi Wei Chart */}
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
                ? "Con số nói về tính cách. Lá số cho biết năm nào bạn thuận."
                : "Numbers illuminate personality. Your chart reveals temporal timing."}
            </h2>
            <p style={{ margin: 0, fontSize: "14.5px", lineHeight: 1.6, color: "var(--text-body, #DCD4C3)" }}>
              {isVi
                ? "Thần số học dùng ngày sinh và họ tên. Lá số Tử Vi dùng thêm giờ sinh, nên cho biết từng giai đoạn mười năm và các tháng hạn của riêng bạn."
                : "Numerology utilizes birth date and name. A Zi Wei chart incorporates birth hour to reveal ten-year cycles and specific annual periods."}
            </p>
          </div>

          <div style={{ textAlign: "center" }}>
            <Link
              href={
                isVi
                  ? `/tao-la-so/tu-vi?name=${encodeURIComponent(fullName)}&birthDay=${dateParts.day}&birthMonth=${dateParts.month}&birthYear=${dateParts.year}`
                  : `/en/tao-la-so/tu-vi?name=${encodeURIComponent(fullName)}&birthDay=${dateParts.day}&birthMonth=${dateParts.month}&birthYear=${dateParts.year}`
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
              {isVi ? "Lập lá số với ngày sinh này" : "Create chart with this date"}
            </Link>
            <span style={{ display: "block", marginTop: "8px", fontSize: "12px", color: "var(--text-muted, #A79E8B)" }}>
              {isVi ? "Lập lá số miễn phí, tự động điền thông tin vừa nhập" : "Free chart creation, pre-filled with your inputs"}
            </span>
          </div>
        </aside>

        {/* Explain article */}
        <article style={{ borderTop: "1px solid var(--border-hairline, #3A3227)", paddingTop: "32px", marginBottom: "40px" }}>
          <h2 style={{ fontFamily: "var(--font-display, Georgia, serif)", fontSize: "20px", color: "var(--text-heading, #F6F1E6)", marginBottom: "12px" }}>
            {isVi ? "Số chủ đạo được tính thế nào?" : "How is the Life Path Number calculated?"}
          </h2>
          <p style={{ fontSize: "14.5px", lineHeight: 1.6, color: "var(--text-body, #DCD4C3)", margin: "0 0 12px" }}>
            {isVi
              ? "Cộng tất cả chữ số của ngày, tháng, năm sinh dương lịch, rồi tiếp tục cộng rút gọn cho tới khi còn một chữ số duy nhất (từ 1 đến 9). Nếu tổng là 11, 22 hoặc 33 thì giữ nguyên, gọi là các số bậc thầy (Master Numbers)."
              : "All digits of the birth date are summed and reduced until reaching a single digit (1 to 9). If the sum reaches 11, 22, or 33, it is preserved as a Master Number."}
          </p>
          <p style={{ fontSize: "14.5px", lineHeight: 1.6, color: "var(--text-body, #DCD4C3)", margin: 0 }}>
            {isVi
              ? "Số sứ mệnh được tính từ toàn bộ chữ cái trong họ và tên; số linh hồn tính từ các nguyên âm (A, E, I, O, U, Y); số nhân cách tính từ các phụ âm theo bảng gán trị số Pythagoras từ A=1 đến I=9 lặp lại."
              : "The Destiny number derives from all letters in the name; Soul Urge from vowels (A, E, I, O, U, Y); Personality from consonants using the standard Pythagorean letter chart."}
          </p>
        </article>

        {/* Cross-sell banner */}
        <FreeToolCrossSellBanner locale={locale} tool="numerology" />
      </main>
    </div>
  );
}
