"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { Solar } from "lunar-typescript";

import { FreeToolCrossSellBanner } from "./free-tool-cross-sell-banner";
import {
  translateGanZhi,
  translateJieQi,
} from "./lunar-calendar-engine";

export type DailyHoroscopePreviewProps = {
  locale: "vi" | "en";
  className?: string;
};

const ZODIAC_ANIMALS_VI: readonly [string, string][] = [
  ["Tý", "Chuột"],
  ["Sửu", "Trâu"],
  ["Dần", "Hổ"],
  ["Mão", "Mèo"],
  ["Thìn", "Rồng"],
  ["Tỵ", "Rắn"],
  ["Ngọ", "Ngựa"],
  ["Mùi", "Dê"],
  ["Thân", "Khỉ"],
  ["Dậu", "Gà"],
  ["Tuất", "Chó"],
  ["Hợi", "Heo"],
];

const ZODIAC_ANIMALS_EN: readonly [string, string][] = [
  ["Rat", "Tý"],
  ["Ox", "Sửu"],
  ["Tiger", "Dần"],
  ["Cat", "Mão"],
  ["Dragon", "Thìn"],
  ["Snake", "Tỵ"],
  ["Horse", "Ngọ"],
  ["Goat", "Mùi"],
  ["Monkey", "Thân"],
  ["Rooster", "Dậu"],
  ["Dog", "Tuất"],
  ["Pig", "Hợi"],
];

export function DailyHoroscopePreview({ locale, className }: DailyHoroscopePreviewProps) {
  const isVi = locale === "vi";
  const [selectedZodiac, setSelectedZodiac] = useState<string>("Thân");

  // Compute live today metadata UTC+7
  const todayMeta = useMemo(() => {
    const now = new Date();
    // UTC+7 adjustment
    const utcTime = now.getTime() + now.getTimezoneOffset() * 60000;
    const vnTime = new Date(utcTime + 7 * 3600000);

    const solar = Solar.fromYmd(vnTime.getFullYear(), vnTime.getMonth() + 1, vnTime.getDate());
    const lunar = solar.getLunar();

    const dowNames = isVi
      ? ["Chủ Nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"]
      : ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

    const dowName = dowNames[solar.getWeek()] ?? "";
    const solarStr = `${dowName}, ${solar.getDay()}/${solar.getMonth()}/${solar.getYear()}`;
    const lunarStr = `${lunar.getDay()}/${lunar.getMonth()} ${translateGanZhi(lunar.getYearInGanZhi())}`;
    const dayCanChi = translateGanZhi(lunar.getDayInGanZhi());
    const solarTerm = translateJieQi(lunar.getJieQi());

    return {
      solarStr,
      lunarStr,
      dayCanChi,
      solarTerm,
    };
  }, [isVi]);

  const zodiacList = isVi ? ZODIAC_ANIMALS_VI : ZODIAC_ANIMALS_EN;

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
            {isVi ? "Tử Vi Hôm Nay" : "Daily Horoscope"}
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
            ☀️
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
                color: "#E2907A",
                border: "1px solid rgba(226, 144, 122, 0.4)",
                borderRadius: "var(--radius-pill, 9999px)",
                padding: "4px 12px",
                marginBottom: "8px",
                background: "rgba(226, 144, 122, 0.12)",
              }}
            >
              {isVi ? "Sắp ra mắt" : "Coming Soon"}
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
              {isVi ? "Tử Vi Hôm Nay 12 Con Giáp" : "Daily Horoscope 12 Zodiacs"}
            </h1>
            <p style={{ margin: 0, fontSize: "15px", color: "var(--text-muted, #A79E8B)" }}>
              {isVi
                ? "Dự báo định hướng công việc, tài chính, tình cảm cho 12 con giáp theo can chi ngày. Bản sâu sắc nhất nằm ở cung số riêng trên lá số của bạn."
                : "General temporal tendencies across work, finances, and relationships. Deep personalized insights require your individual natal chart."}
            </p>
          </div>
        </div>

        {/* Content Layout */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "28px", marginBottom: "40px" }}>
          {/* Main Forecast Card */}
          <div style={{ display: "grid", gap: "20px" }}>
            {/* Zodiac selector & Dayline */}
            <section
              style={{
                background: "var(--surface-panel, #1C1813)",
                border: "1px solid var(--border-hairline, #3A3227)",
                borderRadius: "var(--radius-lg, 12px)",
                padding: "24px",
              }}
            >
              <h2 style={{ margin: "0 0 16px", fontSize: "14px", fontFamily: "var(--font-mono, monospace)", color: "var(--text-faint, #6E6656)", textTransform: "uppercase" }}>
                {isVi ? "Chọn con giáp của bạn" : "Select your zodiac branch"}
              </h2>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(6, minmax(0, 1fr))", gap: "8px" }}>
                {zodiacList.map(([name, sub]) => {
                  const isActive = name === selectedZodiac;
                  return (
                    <button
                      key={name}
                      type="button"
                      aria-pressed={isActive}
                      onClick={() => setSelectedZodiac(name)}
                      style={{
                        height: "56px",
                        borderRadius: "var(--radius-sm, 6px)",
                        border: isActive ? "1px solid var(--gold-400, #D4AF37)" : "1px solid var(--border-hairline, #3A3227)",
                        background: isActive ? "rgba(201,164,77,0.18)" : "var(--surface-deep, #0F0D0A)",
                        color: isActive ? "var(--gold-400, #D4AF37)" : "var(--text-body, #DCD4C3)",
                        cursor: "pointer",
                        display: "grid",
                        placeContent: "center",
                        gap: "2px",
                        fontFamily: "var(--font-ui, sans-serif)",
                        fontWeight: isActive ? 600 : 400,
                        fontSize: "14px",
                        transition: "all 0.15s ease",
                      }}
                    >
                      <span>{name}</span>
                      <small style={{ fontSize: "11px", color: isActive ? "var(--gold-400, #D4AF37)" : "var(--text-faint, #6E6656)" }}>{sub}</small>
                    </button>
                  );
                })}
              </div>

              {/* Dayline */}
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "12px 20px",
                  fontSize: "13.5px",
                  color: "var(--text-muted, #A79E8B)",
                  marginTop: "20px",
                  paddingTop: "16px",
                  borderTop: "1px solid var(--border-hairline, #3A3227)",
                }}
              >
                <span>{isVi ? "Hôm nay:" : "Today:"} <b style={{ color: "var(--text-heading, #F6F1E6)" }}>{todayMeta.solarStr}</b></span>
                <span>{isVi ? "Âm lịch:" : "Lunar:"} <b style={{ color: "var(--text-heading, #F6F1E6)" }}>{todayMeta.lunarStr}</b></span>
                <span>{isVi ? "Ngày:" : "Day stem/branch:"} <b style={{ color: "var(--gold-400, #D4AF37)" }}>{todayMeta.dayCanChi}</b></span>
                {todayMeta.solarTerm && <span>{isVi ? "Tiết khí:" : "Solar term:"} <b style={{ color: "var(--text-heading, #F6F1E6)" }}>{todayMeta.solarTerm}</b></span>}
              </div>
            </section>

            {/* Reading details */}
            <section
              style={{
                background: "var(--surface-panel, #1C1813)",
                border: "1px solid var(--border-hairline, #3A3227)",
                borderRadius: "var(--radius-lg, 12px)",
                padding: "24px",
              }}
            >
              <div style={{ display: "inline-block", padding: "3px 10px", borderRadius: "var(--radius-pill, 9999px)", background: "rgba(201,164,77,0.12)", color: "var(--gold-400, #D4AF37)", fontSize: "12px", marginBottom: "12px", fontFamily: "var(--font-mono, monospace)" }}>
                {isVi ? "Minh hoạ cấu trúc luận giải" : "Forecast structure preview"}
              </div>

              <h2 style={{ margin: "0 0 12px", fontFamily: "var(--font-display, Georgia, serif)", fontSize: "24px", color: "var(--text-heading, #F6F1E6)" }}>
                {isVi ? `Tuổi ${selectedZodiac} hôm nay` : `Year of the ${selectedZodiac} Today`}
              </h2>

              <p style={{ fontSize: "15px", lineHeight: 1.7, color: "var(--text-body, #DCD4C3)", margin: "0 0 20px" }}>
                {isVi
                  ? `Ngày ${todayMeta.dayCanChi}, đối chiếu với tuổi ${selectedZodiac}: thời điểm cần lưu ý giữ nhịp độ ổn định. Buổi sáng thuận lợi cho các trao đổi rõ ràng bằng văn bản; buổi chiều nên rà soát lại các khoản chi hoặc giấy tờ trước khi ký duyệt.`
                  : `In the day of ${todayMeta.dayCanChi}, aligning with ${selectedZodiac}: maintain a steady, disciplined rhythm. The morning favors clear written alignments; review financial details before afternoon commitments.`}
              </p>

              {/* 3 Aspects */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "12px", marginBottom: "20px" }}>
                <div style={{ background: "var(--surface-deep, #0F0D0A)", border: "1px solid var(--border-hairline, #3A3227)", borderRadius: "var(--radius-sm, 6px)", padding: "14px" }}>
                  <h3 style={{ margin: "0 0 6px", fontSize: "14px", color: "var(--gold-400, #D4AF37)", fontFamily: "var(--font-ui, sans-serif)" }}>
                    {isVi ? "Công việc" : "Work"}
                  </h3>
                  <p style={{ margin: 0, fontSize: "13px", lineHeight: 1.5, color: "var(--text-body, #DCD4C3)" }}>
                    {isVi ? "Rõ ràng trong từng thỏa thuận để tránh hiểu nhầm." : "Ensure documented clarity to prevent misunderstandings."}
                  </p>
                </div>

                <div style={{ background: "var(--surface-deep, #0F0D0A)", border: "1px solid var(--border-hairline, #3A3227)", borderRadius: "var(--radius-sm, 6px)", padding: "14px" }}>
                  <h3 style={{ margin: "0 0 6px", fontSize: "14px", color: "var(--gold-400, #D4AF37)", fontFamily: "var(--font-ui, sans-serif)" }}>
                    {isVi ? "Tài chính" : "Finances"}
                  </h3>
                  <p style={{ margin: 0, fontSize: "13px", lineHeight: 1.5, color: "var(--text-body, #DCD4C3)" }}>
                    {isVi ? "Ưu tiên giữ an toàn, hoãn các khoản chi ngoài kế hoạch." : "Prioritize security; delay discretionary outlays."}
                  </p>
                </div>

                <div style={{ background: "var(--surface-deep, #0F0D0A)", border: "1px solid var(--border-hairline, #3A3227)", borderRadius: "var(--radius-sm, 6px)", padding: "14px" }}>
                  <h3 style={{ margin: "0 0 6px", fontSize: "14px", color: "var(--gold-400, #D4AF37)", fontFamily: "var(--font-ui, sans-serif)" }}>
                    {isVi ? "Tình cảm" : "Relationships"}
                  </h3>
                  <p style={{ margin: 0, fontSize: "13px", lineHeight: 1.5, color: "var(--text-body, #DCD4C3)" }}>
                    {isVi ? "Lắng nghe đối phương, tránh tranh luận khi căng thẳng." : "Listen attentively and preserve emotional space."}
                  </p>
                </div>
              </div>

              {/* Do / Don't */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div style={{ background: "var(--surface-deep, #0F0D0A)", border: "1px solid var(--border-hairline, #3A3227)", borderRadius: "var(--radius-sm, 6px)", padding: "14px" }}>
                  <h4 style={{ margin: "0 0 8px", fontSize: "13.5px", color: "#7FB39C", fontFamily: "var(--font-ui, sans-serif)" }}>
                    {isVi ? "✓ Nên làm" : "✓ Recommended"}
                  </h4>
                  <ul style={{ margin: 0, paddingLeft: "18px", fontSize: "13px", color: "var(--text-body, #DCD4C3)", lineHeight: 1.6 }}>
                    <li>{isVi ? "Hoàn tất việc cũ tồn đọng" : "Wrap up pending tasks"}</li>
                    <li>{isVi ? "Gặp gỡ người đi trước" : "Consult experienced peers"}</li>
                  </ul>
                </div>

                <div style={{ background: "var(--surface-deep, #0F0D0A)", border: "1px solid var(--border-hairline, #3A3227)", borderRadius: "var(--radius-sm, 6px)", padding: "14px" }}>
                  <h4 style={{ margin: "0 0 8px", fontSize: "13.5px", color: "#EC8A74", fontFamily: "var(--font-ui, sans-serif)" }}>
                    {isVi ? "✕ Nên kiêng" : "✕ Avoid"}
                  </h4>
                  <ul style={{ margin: 0, paddingLeft: "18px", fontSize: "13px", color: "var(--text-body, #DCD4C3)", lineHeight: 1.6 }}>
                    <li>{isVi ? "Ký kết vội vàng" : "Rushed agreements"}</li>
                    <li>{isVi ? "Cho vay thiếu bảo đảm" : "Unsecured lending"}</li>
                  </ul>
                </div>
              </div>
            </section>
          </div>

          {/* Bridge Sidebar to Personal Chart */}
          <aside
            style={{
              background: "linear-gradient(160deg, rgba(206,91,69,0.12), var(--surface-panel, #1C1813) 60%)",
              border: "1px solid rgba(206,91,69,0.45)",
              borderRadius: "var(--radius-lg, 12px)",
              padding: "24px",
              height: "fit-content",
            }}
          >
            <span style={{ fontFamily: "var(--font-mono, monospace)", fontSize: "11.5px", letterSpacing: "0.12em", textTransform: "uppercase", color: "#EC8A74" }}>
              {isVi ? "Còn tùy lá số của bạn" : "Depends on your personal chart"}
            </span>
            <h2 style={{ margin: "8px 0 10px", fontFamily: "var(--font-display, Georgia, serif)", fontSize: "20px", color: "var(--text-heading, #F6F1E6)", lineHeight: 1.3 }}>
              {isVi
                ? `Đây là tử vi chung cho mọi người tuổi ${selectedZodiac}`
                : `General forecast for all people born in the year of the ${selectedZodiac}`}
            </h2>
            <p style={{ margin: "0 0 16px", fontSize: "14px", lineHeight: 1.6, color: "var(--text-body, #DCD4C3)" }}>
              {isVi
                ? "Hôm nay với lá số riêng của bạn có thể khác hẳn. Một lá số đầy đủ ngày giờ sinh cho biết chính xác cung nào đang bị lưu nhật động tới: Tài Bạch, Quan Lộc hay Phu Thê."
                : "Your personal day can differ completely. A full chart with birth hour reveals which exact palace is activated by daily movements."}
            </p>

            {/* Locked Preview Card */}
            <div
              style={{
                position: "relative",
                border: "1px dashed var(--border-hairline, #3A3227)",
                borderRadius: "var(--radius-md, 8px)",
                padding: "16px",
                marginBottom: "20px",
                background: "var(--surface-deep, #0F0D0A)",
                overflow: "hidden",
              }}
            >
              <div style={{ filter: "blur(5px)", userSelect: "none", color: "var(--text-faint, #6E6656)", fontSize: "13.5px" }}>
                Hôm nay cung Tài Bạch của bạn gặp sao lưu nhật, khoản chi buổi chiều cần xem lại kỹ lưỡng trước khi xác nhận chuyển tiền.
              </div>
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  display: "grid",
                  placeItems: "center",
                  background: "rgba(15,13,10,0.65)",
                }}
              >
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    background: "var(--surface-panel, #1C1813)",
                    border: "1px solid var(--border-hairline, #3A3227)",
                    borderRadius: "var(--radius-pill, 9999px)",
                    padding: "6px 14px",
                    fontSize: "12.5px",
                    color: "var(--gold-400, #D4AF37)",
                  }}
                >
                  🔒 {isVi ? "Hôm nay của bạn · Hội viên" : "Your Day · Member"}
                </span>
              </div>
            </div>

            <Link
              href={isVi ? "/tao-la-so/tu-vi" : "/en/tao-la-so/tu-vi"}
              style={{
                display: "block",
                textAlign: "center",
                padding: "12px 20px",
                borderRadius: "var(--radius-sm, 4px)",
                background: "linear-gradient(103deg, #9A7730 0%, #F2DCA0 34%, #C9A44D 58%, #A8842F 100%)",
                color: "#0F0D0A",
                fontWeight: 600,
                fontSize: "14px",
                textDecoration: "none",
              }}
            >
              {isVi ? "Lập lá số Tử Vi của bạn" : "Create your Zi Wei chart"}
            </Link>
            <span style={{ display: "block", textAlign: "center", marginTop: "8px", fontSize: "12px", color: "var(--text-muted, #A79E8B)" }}>
              {isVi ? "Lập lá số miễn phí · Không cần tài khoản" : "Free chart creation · No account required"}
            </span>
          </aside>
        </div>

        {/* Explain Article */}
        <article style={{ borderTop: "1px solid var(--border-hairline, #3A3227)", paddingTop: "32px", marginBottom: "40px" }}>
          <h2 style={{ fontFamily: "var(--font-display, Georgia, serif)", fontSize: "20px", color: "var(--text-heading, #F6F1E6)", marginBottom: "12px" }}>
            {isVi ? "Tử vi hôm nay được tính thế nào?" : "How is the Daily Horoscope evaluated?"}
          </h2>
          <p style={{ fontSize: "14.5px", lineHeight: 1.6, color: "var(--text-body, #DCD4C3)", margin: "0 0 12px" }}>
            {isVi
              ? "Mỗi ngày mang một cặp Can Chi cụ thể. Dự báo theo con giáp đối chiếu địa chi của ngày với địa chi năm sinh: hợp, xung, hình hay hại. Vì chỉ dùng năm sinh, kết quả mang tính chất thiên thời chung cho hàng triệu người cùng tuổi."
              : "Each calendar day carries a specific Stem and Branch. General forecasts compare the day's branch with your birth year's animal sign."}
          </p>
          <p style={{ fontSize: "14.5px", lineHeight: 1.6, color: "var(--text-body, #DCD4C3)", margin: 0 }}>
            {isVi
              ? "Lá số Tử Vi cá nhân dùng đầy đủ năm, tháng, ngày và giờ sinh để an 12 cung và các sao lưu nhật, phản ánh sát sao nhịp sống và vận khí của từng người."
              : "A personal Zi Wei chart uses complete birth coordinates to map the 12 palaces and daily circulating stars for tailored clarity."}
          </p>
        </article>

        {/* Cross-sell banner */}
        <FreeToolCrossSellBanner locale={locale} tool="daily-horoscope" />
      </main>
    </div>
  );
}
