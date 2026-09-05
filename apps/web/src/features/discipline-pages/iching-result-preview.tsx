import React from "react";

export type IchingResultPreviewProps = {
  locale: "vi" | "en";
  className?: string;
};

type HexagramLine = {
  yang?: boolean;
  yin?: boolean;
  moving?: boolean;
  color: string;
};

const PRIMARY_LINES: readonly HexagramLine[] = [
  { yang: true, moving: false, color: "var(--pearl-200)" },
  { yang: true, moving: false, color: "var(--pearl-200)" },
  { yang: true, moving: false, color: "var(--pearl-200)" },
  { yang: true, moving: true, color: "var(--son, #ce5b45)" },
  { yang: true, moving: false, color: "var(--pearl-200)" },
  { yang: true, moving: false, color: "var(--pearl-200)" },
];

const CHANGED_LINES: readonly HexagramLine[] = [
  { yang: true, color: "var(--pearl-200)" },
  { yang: true, color: "var(--pearl-200)" },
  { yin: true, color: "var(--pearl-200)" },
  { yang: true, color: "var(--pearl-200)" },
  { yang: true, color: "var(--pearl-200)" },
  { yang: true, color: "var(--pearl-200)" },
];

export function IchingResultPreview({ locale, className }: IchingResultPreviewProps) {
  const isVi = locale === "vi";

  return (
    <div className={className} data-discipline-preview="kinh-dich">
      <div
        style={{
          marginTop: "48px",
          display: "grid",
          gridTemplateColumns: "minmax(0, 1fr) auto minmax(0, 1fr)",
          gap: "32px",
          alignItems: "center",
        }}
      >
        <div
          style={{
            background: "var(--surface-panel)",
            border: "1px solid var(--border-hairline)",
            borderRadius: "var(--radius-lg)",
            padding: "28px",
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
            {isVi ? "Quẻ chủ" : "Primary hexagram"}
          </div>
          <div
            style={{
              marginTop: "6px",
              fontFamily: "var(--font-display)",
              fontSize: "19px",
              color: "var(--text-heading)",
            }}
          >
            {isVi ? "01 · Thuần Càn" : "01 · Qian (The Creative)"}
          </div>
          <div
            style={{
              marginTop: "20px",
              display: "flex",
              flexDirection: "column-reverse",
              gap: "10px",
            }}
          >
            {PRIMARY_LINES.map((ln, idx) => (
              <div
                key={idx}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                }}
              >
                {ln.yin && (
                  <div style={{ flex: 1, display: "flex", gap: "16%" }}>
                    <span
                      style={{
                        flex: 1,
                        height: "12px",
                        borderRadius: "2px",
                        background: ln.color,
                      }}
                    />
                    <span
                      style={{
                        flex: 1,
                        height: "12px",
                        borderRadius: "2px",
                        background: ln.color,
                      }}
                    />
                  </div>
                )}
                {ln.yang && (
                  <div
                    style={{
                      flex: 1,
                      height: "12px",
                      borderRadius: "2px",
                      background: ln.color,
                    }}
                  />
                )}
                {ln.moving && (
                  <span
                    style={{
                      flex: "none",
                      fontFamily: "var(--font-mono)",
                      fontSize: "9.5px",
                      color: "var(--son, #ce5b45)",
                    }}
                  >
                    {isVi ? "HÀO ĐỘNG" : "CHANGING LINE"}
                  </span>
                )}
              </div>
            ))}
          </div>
          <div
            style={{
              marginTop: "16px",
              fontSize: "12.5px",
              color: "var(--text-faint)",
            }}
          >
            {isVi
              ? "Thượng quái: Càn (☰) · Hạ quái: Càn (☰)"
              : "Upper trigram: Qian (☰) · Lower trigram: Qian (☰)"}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "8px",
            color: "var(--text-faint)",
          }}
        >
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--son, #ce5b45)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <polyline points="9 18 15 12 9 6" />
          </svg>
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "10.5px",
              letterSpacing: "0.06em",
              textTransform: "uppercase",
            }}
          >
            {isVi ? "1 hào động" : "1 changing line"}
          </span>
        </div>

        <div
          style={{
            background: "var(--surface-panel)",
            border: "1px solid var(--border-hairline)",
            borderRadius: "var(--radius-lg)",
            padding: "28px",
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
            {isVi ? "Quẻ biến" : "Changed hexagram"}
          </div>
          <div
            style={{
              marginTop: "6px",
              fontFamily: "var(--font-display)",
              fontSize: "19px",
              color: "var(--text-heading)",
            }}
          >
            {isVi ? "10 · Thiên Trạch Lý" : "10 · Li (Treading)"}
          </div>
          <div
            style={{
              marginTop: "20px",
              display: "flex",
              flexDirection: "column-reverse",
              gap: "10px",
            }}
          >
            {CHANGED_LINES.map((ln, idx) => (
              <div key={idx}>
                {ln.yin && (
                  <div style={{ display: "flex", gap: "16%" }}>
                    <span
                      style={{
                        flex: 1,
                        height: "12px",
                        borderRadius: "2px",
                        background: ln.color,
                      }}
                    />
                    <span
                      style={{
                        flex: 1,
                        height: "12px",
                        borderRadius: "2px",
                        background: ln.color,
                      }}
                    />
                  </div>
                )}
                {ln.yang && (
                  <div
                    style={{
                      height: "12px",
                      borderRadius: "2px",
                      background: ln.color,
                    }}
                  />
                )}
              </div>
            ))}
          </div>
          <div
            style={{
              marginTop: "16px",
              fontSize: "12.5px",
              color: "var(--text-faint)",
            }}
          >
            {isVi
              ? "Thượng quái: Càn (☰) · Hạ quái: Đoài (☱)"
              : "Upper trigram: Qian (☰) · Lower trigram: Dui (☱)"}
          </div>
        </div>
      </div>

      <div style={{ marginTop: "40px", maxWidth: "680px" }}>
        <div
          style={{
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
              top: "24px",
              left: "-1px",
              width: "2px",
              height: "34px",
              background: "var(--accent-gold)",
            }}
          />
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "10.5px",
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              color: "var(--text-faint)",
            }}
          >
            {isVi ? "Ghi chú bên lề · Hào 3" : "Margin note · Line 3"}
          </div>
          <p
            style={{
              margin: "12px 0 0",
              fontFamily: "var(--font-display)",
              fontSize: "19px",
              lineHeight: 1.45,
              color: "var(--text-heading)",
            }}
          >
            {isVi
              ? "Hào động nằm ở vị trí thứ ba (từ dưới lên) — nơi quẻ chủ chuyển thành quẻ biến."
              : "The changing line is at the third position (from the bottom) — where the primary hexagram transforms into the changed hexagram."}
          </p>
          <p
            style={{
              margin: "8px 0 0",
              fontSize: "14px",
              lineHeight: 1.6,
              color: "var(--text-muted)",
            }}
          >
            {isVi
              ? "Bản diễn giải đầy đủ sẽ tách rõ ý nghĩa quẻ chủ, ý nghĩa riêng của hào động và ý nghĩa quẻ biến — không gộp thành một đoạn văn chung."
              : "The full interpretation will distinctly separate the meaning of the primary hexagram, the individual changing line, and the changed hexagram — without collapsing them into a single blended paragraph."}
          </p>
        </div>
      </div>
    </div>
  );
}

export default IchingResultPreview;
