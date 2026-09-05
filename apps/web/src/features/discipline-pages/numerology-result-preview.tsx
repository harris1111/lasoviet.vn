import React from "react";

export type NumerologyResultPreviewProps = {
  locale: "vi" | "en";
};

export function NumerologyResultPreview({ locale }: NumerologyResultPreviewProps) {
  const isVi = locale === "vi";

  const letterMap = [
    { n: "1", letters: "A J S" },
    { n: "2", letters: "B K T" },
    { n: "3", letters: "C L U" },
    { n: "4", letters: "D M V" },
    { n: "5", letters: "E N W" },
    { n: "6", letters: "F O X" },
    { n: "7", letters: "G P Y" },
    { n: "8", letters: "H Q Z" },
    { n: "9", letters: "I R" },
  ];

  const traceRows = isVi
    ? [
        { label: "Chuẩn hoá dấu: NGUYỄN → NGUYEN, VĂN → VAN, AN → AN", value: "" },
        { label: "NGUYEN = 5+7+3+7+5+5", value: "= 32" },
        { label: "VAN = 4+1+5  ·  AN = 1+5", value: "= 10 · 6" },
        { label: "32 + 10 + 6 = 48 → 4+8 = 12 → 1+2", value: "= Số Sứ Mệnh 3" },
      ]
    : [
        { label: "Diacritics normalization: NGUYỄN → NGUYEN, VĂN → VAN, AN → AN", value: "" },
        { label: "NGUYEN = 5+7+3+7+5+5", value: "= 32" },
        { label: "VAN = 4+1+5  ·  AN = 1+5", value: "= 10 · 6" },
        { label: "32 + 10 + 6 = 48 → 4+8 = 12 → 1+2", value: "= Destiny Number 3" },
      ];

  const gridCells = [
    { n: "3", marks: "" },
    { n: "6", marks: "" },
    { n: "9", marks: "● ●" },
    { n: "2", marks: "" },
    { n: "5", marks: "●" },
    { n: "8", marks: "" },
    { n: "1", marks: "● ●" },
    { n: "4", marks: "" },
    { n: "7", marks: "" },
  ];

  return (
    <div
      className="discipline-numerology-preview"
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
        gap: "48px",
        alignItems: "start",
      }}
    >
      <div>
        <h3 style={{ margin: "0 0 16px", fontFamily: "var(--font-display)", fontSize: "19px", color: "var(--text-heading)" }}>
          {isVi ? "Bảng chữ cái → số (Pythagorean)" : "Alphabet to number chart (Pythagorean)"}
        </h3>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(9, minmax(0, 1fr))",
            gap: "1px",
            background: "var(--border-hairline)",
            border: "1px solid var(--border-hairline)",
            borderRadius: "var(--radius-sm)",
            overflow: "hidden",
            fontFamily: "var(--font-mono)",
            fontSize: "12px",
            textAlign: "center",
          }}
        >
          {letterMap.map((col) => (
            <div key={col.n} style={{ background: "var(--surface-panel)", padding: "8px 4px" }}>
              <div style={{ color: "var(--ochre)" }}>{col.n}</div>
              <div style={{ marginTop: "4px", color: "var(--text-muted)" }}>{col.letters}</div>
            </div>
          ))}
        </div>

        <h3 style={{ margin: "32px 0 16px", fontFamily: "var(--font-display)", fontSize: "19px", color: "var(--text-heading)" }}>
          {isVi ? 'Chuẩn hoá và cộng dồn — "NGUYỄN VĂN AN"' : 'Normalization and reduction — "NGUYỄN VĂN AN"'}
        </h3>
        <div style={{ display: "grid", gap: "8px", fontFamily: "var(--font-mono)", fontSize: "13px", color: "var(--text-body)" }}>
          {traceRows.map((t, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "10px 14px",
                background: "var(--surface-panel)",
                border: "1px solid var(--border-hairline)",
                borderRadius: "var(--radius-sm)",
              }}
            >
              <span>{t.label}</span>
              <span style={{ color: "var(--indigo)" }}>{t.value}</span>
            </div>
          ))}
        </div>

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
            {isVi ? "Ghi chú bên lề · Số Sứ Mệnh" : "Margin note · Destiny Number"}
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
              ? "Với ví dụ trên, họ tên rút gọn về số 3 — chỉ minh hoạ cách cộng dồn, chưa phải kết quả thật."
              : "In the example above, full name reduces to 3 — illustrative addition path only, not a live result."}
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
              ? "Bản đầy đủ sẽ hiển thị từng bước chuẩn hoá dấu tiếng Việt trước khi quy đổi sang số, và giữ nguyên Số Chủ 11, 22, 33 nếu xuất hiện thay vì rút gọn tiếp."
              : "The complete calculation discloses every Vietnamese diacritic normalization step before letter lookup, preserving Master Numbers 11, 22, 33 without further reduction."}
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

      <div>
        <h3 style={{ margin: "0 0 16px", fontFamily: "var(--font-display)", fontSize: "19px", color: "var(--text-heading)" }}>
          {isVi ? "Bảng số 3×3 (từ ngày sinh 15/03/1990)" : "3×3 number grid (from birthdate 15/03/1990)"}
        </h3>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
            gap: "1px",
            background: "var(--border-hairline)",
            border: "1px solid var(--border-hairline)",
            borderRadius: "var(--radius-lg)",
            overflow: "hidden",
            aspectRatio: "1 / 1",
            maxWidth: "380px",
          }}
        >
          {gridCells.map((c, idx) => (
            <div
              key={idx}
              style={{
                background: "var(--surface-panel)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: "4px",
                minHeight: "90px",
              }}
            >
              <span style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: "var(--text-faint)" }}>
                {c.n}
              </span>
              <span
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: "20px",
                  color: c.marks ? "var(--ochre)" : "var(--text-faint)",
                }}
              >
                {c.marks}
              </span>
            </div>
          ))}
        </div>
        <p style={{ margin: "16px 0 0", fontSize: "12.5px", color: "var(--text-faint)", lineHeight: 1.6 }}>
          {isVi
            ? "Ô có dấu ● là chữ số xuất hiện trong ngày sinh; ô trống là chữ số vắng mặt — chỉ để minh hoạ cách đọc bảng, không phải nhận định tính cách."
            : "Cells with ● indicate digits present in birthdate; empty cells indicate absent digits — illustrative layout only, not personality claims."}
        </p>
      </div>
    </div>
  );
}