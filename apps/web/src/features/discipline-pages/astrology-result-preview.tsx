"use client";

import React from "react";

export type AstrologyResultPreviewProps = {
  locale: "vi" | "en";
};

type PlanetRow = {
  key: "sun" | "moon" | "asc" | "mc" | "venus" | "mercury";
  point: string;
  sign: string;
  house: string;
  note: string;
};

const PLANET_ROWS_VI: readonly PlanetRow[] = [
  { key: "sun", point: "Mặt Trời ☉", sign: "Sư Tử", house: "Nhà 11", note: "Mặt Trời ☉ — Sư Tử, Nhà 11 (minh hoạ). Điểm khởi đầu để đọc bản đồ sao, thường gắn với năng lượng cốt lõi và cách thể hiện bản thân." },
  { key: "moon", point: "Mặt Trăng ☽", sign: "Bọ Cạp", house: "Nhà 4", note: "Mặt Trăng ☽ — Bọ Cạp, Nhà 4 (minh hoạ). Thường gắn với đời sống cảm xúc, nhu cầu an toàn và phản ứng bản năng." },
  { key: "asc", point: "Cung Mọc (ASC)", sign: "Xử Nữ", house: "Nhà 1", note: "Cung Mọc (ASC) — Xử Nữ, Nhà 1 (minh hoạ). Phụ thuộc trực tiếp vào giờ và nơi sinh chính xác — sai giờ sinh vài phút có thể đổi cung này." },
  { key: "mc", point: "Thiên Đỉnh (MC)", sign: "Song Tử", house: "Nhà 10", note: "Thiên Đỉnh (MC) — Song Tử, Nhà 10 (minh hoạ). Thường gắn với hình ảnh nghề nghiệp và vị trí xã hội." },
  { key: "venus", point: "Kim Tinh", sign: "Xử Nữ", house: "Nhà 1", note: "Kim Tinh ♀ — Xử Nữ, Nhà 1 (minh hoạ). Thường gắn với giá trị quan hệ, gu thẩm mỹ và cách thể hiện tình cảm." },
  { key: "mercury", point: "Thuỷ Tinh", sign: "Sư Tử", house: "Nhà 12", note: "Thuỷ Tinh ☿ — Sư Tử, Nhà 12 (minh hoạ). Thường gắn với cách tư duy, giao tiếp và xử lý thông tin." },
];

const PLANET_ROWS_EN: readonly PlanetRow[] = [
  { key: "sun", point: "Sun ☉", sign: "Leo", house: "House 11", note: "Sun ☉ — Leo, House 11 (illustrative). Starting anchor for reading a natal chart, centered on core vitality and self-expression." },
  { key: "moon", point: "Moon ☽", sign: "Scorpio", house: "House 4", note: "Moon ☽ — Scorpio, House 4 (illustrative). Governs emotional architecture, instinctual reactions, and internal security needs." },
  { key: "asc", point: "Ascendant (ASC)", sign: "Virgo", house: "House 1", note: "Ascendant (ASC) — Virgo, House 1 (illustrative). Directly depends on exact birth time and location — a variance of minutes can shift this sign." },
  { key: "mc", point: "Midheaven (MC)", sign: "Gemini", house: "House 10", note: "Midheaven (MC) — Gemini, House 10 (illustrative). Associated with vocational trajectory and public social standing." },
  { key: "venus", point: "Venus", sign: "Virgo", house: "House 1", note: "Venus ♀ — Virgo, House 1 (illustrative). Associated with relational values, aesthetic preferences, and emotional expression." },
  { key: "mercury", point: "Mercury", sign: "Leo", house: "House 12", note: "Mercury ☿ — Leo, House 12 (illustrative). Associated with cognitive style, communication, and information processing." },
];

export function AstrologyResultPreview({ locale }: AstrologyResultPreviewProps) {
  const isVi = locale === "vi";
  const planetRows = isVi ? PLANET_ROWS_VI : PLANET_ROWS_EN;
  const [selectedPointIndex, setSelectedPointIndex] = React.useState(0);
  const selectedPoint: PlanetRow = planetRows[selectedPointIndex] ?? (PLANET_ROWS_VI[0] as PlanetRow);
  const selectedKey = selectedPoint.key;

  return (
    <div
      className="discipline-astrology-preview"
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
        gap: "48px",
        alignItems: "center",
      }}
    >
      <div
        style={{
          background: "var(--surface-panel)",
          border: "1px solid var(--border-hairline)",
          borderRadius: "var(--radius-lg)",
          padding: "32px",
          textAlign: "center",
        }}
      >
        <svg
          viewBox="0 0 300 300"
          role="img"
          aria-label={
            isVi
              ? "Bản đồ sao mẫu hình tròn với 12 cung hoàng đạo, vị trí Mặt Trời, Mặt Trăng, Cung Mọc và Thiên Đỉnh"
              : "Sample circular natal chart with 12 zodiac signs, positions of Sun, Moon, Ascendant and Midheaven"
          }
          style={{ width: "100%", maxWidth: "320px", margin: "0 auto", display: "block" }}
        >
          <circle cx="150" cy="150" r="140" fill="none" stroke="var(--border-hairline)" strokeWidth="1.5" />
          <circle cx="150" cy="150" r="95" fill="none" stroke="var(--border-hairline)" strokeWidth="1" />
          <circle cx="150" cy="150" r="4" fill="var(--gold-500)" />
          <g stroke="var(--border-hairline)" strokeWidth="1">
            <line x1="150" y1="55" x2="150" y2="10" />
            <line x1="197.5" y1="67.7" x2="220" y2="28.8" />
            <line x1="232.3" y1="102.5" x2="271.2" y2="80" />
            <line x1="245" y1="150" x2="290" y2="150" />
            <line x1="232.3" y1="197.5" x2="271.2" y2="220" />
            <line x1="197.5" y1="232.3" x2="220" y2="271.2" />
            <line x1="150" y1="245" x2="150" y2="290" />
            <line x1="102.5" y1="232.3" x2="80" y2="271.2" />
            <line x1="67.7" y1="197.5" x2="28.8" y2="220" />
            <line x1="55" y1="150" x2="10" y2="150" />
            <line x1="67.7" y1="102.5" x2="28.8" y2="80" />
            <line x1="102.5" y1="67.7" x2="80" y2="28.8" />
          </g>
          <g textAnchor="middle" dominantBaseline="middle" fontSize="16" fill="var(--gold-500)">
            <text x="180" y="36">♈</text>
            <text x="233" y="67">♉</text>
            <text x="264" y="120">♊</text>
            <text x="264" y="181">♋</text>
            <text x="233" y="233">♌</text>
            <text x="181" y="264">♍</text>
            <text x="120" y="264">♎</text>
            <text x="67" y="233">♏</text>
            <text x="36" y="181">♐</text>
            <text x="36" y="120">♑</text>
            <text x="67" y="67">♒</text>
            <text x="120" y="36">♓</text>
          </g>
          <line x1="10" y1="150" x2="272" y2="150" stroke="var(--mineral)" strokeWidth="1.5" strokeDasharray="2 4" />
          <line x1="150" y1="10" x2="150" y2="290" stroke="var(--mineral)" strokeWidth="1.5" strokeDasharray="2 4" />
          <line x1="203" y1="203" x2="97" y2="97" stroke="var(--gold-500)" strokeWidth="1" strokeDasharray="1 3" opacity="0.55" />
          <text x="26" y="140" fontSize="10.5" fontFamily="var(--font-mono)" style={{ fill: selectedKey === "asc" ? "var(--gold-500)" : "var(--mineral)" }}>ASC</text>
          <text x="140" y="24" fontSize="10.5" fontFamily="var(--font-mono)" style={{ fill: selectedKey === "mc" ? "var(--gold-500)" : "var(--mineral)" }}>MC</text>

          {/* Sun */}
          <circle cx="203" cy="203" r="14" fill="none" stroke="var(--gold-500)" strokeWidth="2" style={{ opacity: selectedKey === "sun" ? 1 : 0 }} />
          <circle cx="203" cy="203" r="9" fill="var(--surface-deep)" stroke="var(--mineral)" strokeWidth="1.5" />
          <text x="203" y="204" textAnchor="middle" dominantBaseline="middle" fontSize="12" fill="var(--text-heading)">☉</text>

          {/* Moon */}
          <circle cx="97" cy="97" r="14" fill="none" stroke="var(--gold-500)" strokeWidth="2" style={{ opacity: selectedKey === "moon" ? 1 : 0 }} />
          <circle cx="97" cy="97" r="9" fill="var(--surface-deep)" stroke="var(--mineral)" strokeWidth="1.5" />
          <text x="97" y="98" textAnchor="middle" dominantBaseline="middle" fontSize="12" fill="var(--text-heading)">☽</text>

          {/* Venus */}
          <circle cx="65" cy="128" r="12" fill="none" stroke="var(--gold-500)" strokeWidth="2" style={{ opacity: selectedKey === "venus" ? 1 : 0 }} />
          <circle cx="65" cy="128" r="8" fill="var(--surface-deep)" stroke="var(--mineral)" strokeWidth="1.5" />
          <text x="65" y="129" textAnchor="middle" dominantBaseline="middle" fontSize="11" fill="var(--text-heading)">♀</text>

          {/* Mercury */}
          <circle cx="228" cy="122" r="12" fill="none" stroke="var(--gold-500)" strokeWidth="2" style={{ opacity: selectedKey === "mercury" ? 1 : 0 }} />
          <circle cx="228" cy="122" r="8" fill="var(--surface-deep)" stroke="var(--mineral)" strokeWidth="1.5" />
          <text x="228" y="123" textAnchor="middle" dominantBaseline="middle" fontSize="11" fill="var(--text-heading)">☿</text>
        </svg>
        <p style={{ margin: "16px 0 0", fontSize: "12px", lineHeight: 1.6, color: "var(--text-faint)" }}>
          {isVi
            ? "☉ Mặt Trời · ☽ Mặt Trăng · ♀ Kim Tinh · ☿ Thuỷ Tinh · ASC Cung Mọc · MC Thiên Đỉnh. Đường chấm vàng nối Mặt Trời–Mặt Trăng minh hoạ một góc chiếu (aspect), không phải góc thật."
            : "☉ Sun · ☽ Moon · ♀ Venus · ☿ Mercury · ASC Ascendant · MC Midheaven. Dotted gold line connecting Sun–Moon illustrates an aspect, not a calculated geometric aspect."}
        </p>
      </div>

      <div>
        <h3 style={{ margin: "0 0 16px", fontFamily: "var(--font-display)", fontSize: "19px", color: "var(--text-heading)" }}>
          {isVi ? "Bảng hành tinh (dạng đọc)" : "Planetary table (readable format)"}
        </h3>
        <p style={{ margin: "0 0 16px", fontSize: "13px", color: "var(--text-faint)" }}>
          {isVi
            ? "Bấm hoặc dùng phím Tab + Enter trên một dòng để đồng bộ với bản đồ sao bên trái."
            : "Click or use Tab + Enter on a row to synchronize with the natal chart on the left."}
        </p>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13.5px" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border-hairline)" }}>
              <th scope="col" style={{ textAlign: "left", padding: "8px 8px 8px 0", color: "var(--text-faint)", fontFamily: "var(--font-mono)", fontSize: "11px", letterSpacing: "0.08em", textTransform: "uppercase" }}>
                {isVi ? "Điểm" : "Point"}
              </th>
              <th scope="col" style={{ textAlign: "left", padding: "8px 8px 8px 0", color: "var(--text-faint)", fontFamily: "var(--font-mono)", fontSize: "11px", letterSpacing: "0.08em", textTransform: "uppercase" }}>
                {isVi ? "Cung" : "Sign"}
              </th>
              <th scope="col" style={{ textAlign: "left", padding: "8px 0", color: "var(--text-faint)", fontFamily: "var(--font-mono)", fontSize: "11px", letterSpacing: "0.08em", textTransform: "uppercase" }}>
                {isVi ? "Nhà" : "House"}
              </th>
            </tr>
          </thead>
          <tbody>
            {planetRows.map((row, idx) => {
              const isSelected = idx === selectedPointIndex;
              return (
                <tr
                  key={row.key}
                  style={{
                    borderBottom: "1px solid var(--border-hairline)",
                    background: isSelected ? "var(--mineral-tint, rgba(79, 112, 138, 0.18))" : "transparent",
                  }}
                >
                  <td style={{ padding: "0 8px 0 0", color: "var(--text-heading)", whiteSpace: "nowrap" }}>
                    <button
                      type="button"
                      aria-pressed={isSelected}
                      onClick={() => setSelectedPointIndex(idx)}
                      style={{
                        width: "100%",
                        textAlign: "left",
                        background: "none",
                        border: "none",
                        color: "inherit",
                        font: "inherit",
                        padding: "9px 0",
                        cursor: "pointer",
                      }}
                    >
                      {row.point}
                    </button>
                  </td>
                  <td style={{ padding: "9px 8px 9px 0", color: "var(--text-body)" }}>{row.sign}</td>
                  <td style={{ padding: "9px 0", color: "var(--text-body)" }}>{row.house}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <div
          style={{
            marginTop: "24px",
            background: "var(--surface-panel)",
            border: "1px solid var(--border-hairline)",
            borderRadius: "var(--radius-md)",
            padding: "20px 24px",
          }}
          aria-live="polite"
        >
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "10px",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "var(--mineral, #6E93AC)",
            }}
          >
            {isVi ? "Đang xem: " + selectedPoint.point : "Inspecting: " + selectedPoint.point}
          </div>
          <p
            style={{
              margin: "8px 0 0",
              fontSize: "14.5px",
              lineHeight: 1.65,
              color: "var(--text-body)",
            }}
          >
            {selectedPoint.note}
          </p>
        </div>
        <p
          style={{
            margin: "14px 0 0",
            fontSize: "12.5px",
            lineHeight: 1.6,
            color: "var(--text-faint)",
          }}
        >
          {isVi
            ? "Bản tính thật sẽ dùng đúng ngày, giờ, nơi sinh và một hệ nhà (house system) được công bố rõ, không phải số liệu cố định như trên."
            : "Actual calculations will use exact date, time, birth location and a transparently disclosed house system, not static numbers as shown above."}
        </p>
      </div>
    </div>
  );
}

export default AstrologyResultPreview;
