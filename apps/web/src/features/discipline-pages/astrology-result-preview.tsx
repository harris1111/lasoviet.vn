import React from "react";

export type AstrologyResultPreviewProps = {
  locale: "vi" | "en";
};

export function AstrologyResultPreview({ locale }: AstrologyResultPreviewProps) {
  const isVi = locale === "vi";

  const planetRows = isVi
    ? [
        { point: "Mặt Trời ☉", sign: "Sư Tử", house: "Nhà 11" },
        { point: "Mặt Trăng ☽", sign: "Bọ Cạp", house: "Nhà 4" },
        { point: "Cung Mọc (ASC)", sign: "Xử Nữ", house: "Nhà 1" },
        { point: "Thiên Đỉnh (MC)", sign: "Song Tử", house: "Nhà 10" },
        { point: "Kim Tinh", sign: "Xử Nữ", house: "Nhà 1" },
        { point: "Thuỷ Tinh", sign: "Sư Tử", house: "Nhà 12" },
      ]
    : [
        { point: "Sun ☉", sign: "Leo", house: "House 11" },
        { point: "Moon ☽", sign: "Scorpio", house: "House 4" },
        { point: "Ascendant (ASC)", sign: "Virgo", house: "House 1" },
        { point: "Midheaven (MC)", sign: "Gemini", house: "House 10" },
        { point: "Venus", sign: "Virgo", house: "House 1" },
        { point: "Mercury", sign: "Leo", house: "House 12" },
      ];

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
          <text x="26" y="140" fontSize="10.5" fill="var(--mineral)" fontFamily="var(--font-mono)">ASC</text>
          <text x="140" y="24" fontSize="10.5" fill="var(--mineral)" fontFamily="var(--font-mono)">MC</text>
          <circle cx="203" cy="203" r="9" fill="var(--surface-deep)" stroke="var(--mineral)" strokeWidth="1.5" />
          <text x="203" y="204" textAnchor="middle" dominantBaseline="middle" fontSize="12" fill="var(--text-heading)">☉</text>
          <circle cx="97" cy="97" r="9" fill="var(--surface-deep)" stroke="var(--mineral)" strokeWidth="1.5" />
          <text x="97" y="98" textAnchor="middle" dominantBaseline="middle" fontSize="12" fill="var(--text-heading)">☽</text>
        </svg>
      </div>

      <div>
        <h3 style={{ margin: "0 0 16px", fontFamily: "var(--font-display)", fontSize: "19px", color: "var(--text-heading)" }}>
          {isVi ? "Bảng hành tinh (dạng đọc)" : "Planetary table (readable format)"}
        </h3>
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
            {planetRows.map((row, idx) => (
              <tr key={idx} style={{ borderBottom: "1px solid var(--border-hairline)" }}>
                <td style={{ padding: "9px 8px 9px 0", color: "var(--text-heading)", whiteSpace: "nowrap" }}>{row.point}</td>
                <td style={{ padding: "9px 8px 9px 0", color: "var(--text-body)" }}>{row.sign}</td>
                <td style={{ padding: "9px 0", color: "var(--text-body)" }}>{row.house}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div
          style={{
            marginTop: "28px",
            position: "relative",
            background: "var(--surface-panel)",
            border: "1px solid var(--border-hairline)",
            borderRadius: "var(--radius-md)",
            padding: "24px 26px",
            boxShadow: "0 24px 60px rgba(0,0,0,0.55)",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: 24,
              left: -1,
              width: 2,
              height: 34,
              background: "var(--accent-gold)",
            }}
          />
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 10.5,
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              color: "var(--text-faint)",
            }}
          >
            {isVi ? "Ghi chú bên lề · Mặt Trời" : "Margin note · Sun"}
          </div>
          <p
            style={{
              margin: "12px 0 0",
              fontFamily: "var(--font-display)",
              fontSize: 19,
              lineHeight: 1.45,
              color: "var(--text-heading)",
            }}
          >
            {isVi
              ? "Trong hồ sơ mẫu, Mặt Trời ở cung Sư Tử, nhà 11 — chỉ mang tính minh hoạ cấu trúc bảng."
              : "In the sample profile, Sun is in Leo, House 11 — illustrative table structure only."}
          </p>
          <p
            style={{
              margin: "10px 0 0",
              fontFamily: "var(--font-display)",
              fontStyle: "italic",
              fontSize: 15.5,
              lineHeight: 1.6,
              color: "var(--text-muted)",
            }}
          >
            {isVi
              ? "Bản tính thật sẽ dùng đúng ngày, giờ, nơi sinh và một hệ nhà (house system) được công bố rõ, không phải số liệu cố định như trên."
              : "Actual calculations will use exact date, time, birth location and a transparently disclosed house system, not static values as shown above."}
          </p>
          <div
            style={{
              marginTop: 18,
              display: "inline-flex",
              alignItems: "center",
              gap: 10,
              fontSize: 13.5,
              color: "var(--text-body)",
            }}
          >
            <span
              style={{
                position: "relative",
                width: 22,
                height: 22,
                display: "inline-block",
                flex: "none",
                border: "1.5px solid var(--accent-seal, #CE5B45)",
                borderRadius: "var(--radius-sm)",
              }}
            >
              <span
                style={{
                  position: "absolute",
                  inset: 3,
                  border: "1px solid var(--accent-seal, #CE5B45)",
                  borderRadius: 2,
                  display: "block",
                }}
              />
            </span>
            <span>{isVi ? "Vì sao có nhận định này?" : "Why this assessment?"}</span>
          </div>
        </div>
      </div>
    </div>
  );
}