import React from "react";

export type BaziResultPreviewProps = {
  locale: "vi" | "en";
  className?: string;
};

type PillarItem = {
  label: string;
  stem: string;
  stemElement: string;
  branch: string;
  branchElement: string;
  hidden: string;
  isDay: boolean;
  stemColor: string;
};

const PILLARS_VI: readonly PillarItem[] = [
  {
    label: "Trụ Năm",
    stem: "Canh",
    stemElement: "Dương Kim",
    branch: "Ngọ",
    branchElement: "Dương Hoả",
    hidden: "Đinh, Kỷ",
    isDay: false,
    stemColor: "var(--text-heading)",
  },
  {
    label: "Trụ Tháng",
    stem: "Kỷ",
    stemElement: "Âm Thổ",
    branch: "Mão",
    branchElement: "Âm Mộc",
    hidden: "Ất",
    isDay: false,
    stemColor: "var(--text-heading)",
  },
  {
    label: "Trụ Ngày",
    stem: "Giáp",
    stemElement: "Dương Mộc",
    branch: "Tý",
    branchElement: "Dương Thuỷ",
    hidden: "Quý",
    isDay: true,
    stemColor: "var(--jade)",
  },
  {
    label: "Trụ Giờ",
    stem: "Bính",
    stemElement: "Dương Hoả",
    branch: "Dần",
    branchElement: "Dương Mộc",
    hidden: "Giáp, Bính, Mậu",
    isDay: false,
    stemColor: "var(--text-heading)",
  },
];

const PILLARS_EN: readonly PillarItem[] = [
  {
    label: "Year Pillar",
    stem: "Canh",
    stemElement: "Yang Metal",
    branch: "Ngọ",
    branchElement: "Yang Fire",
    hidden: "Đinh, Kỷ",
    isDay: false,
    stemColor: "var(--text-heading)",
  },
  {
    label: "Month Pillar",
    stem: "Kỷ",
    stemElement: "Yin Earth",
    branch: "Mão",
    branchElement: "Yin Wood",
    hidden: "Ất",
    isDay: false,
    stemColor: "var(--text-heading)",
  },
  {
    label: "Day Pillar",
    stem: "Giáp",
    stemElement: "Yang Wood",
    branch: "Tý",
    branchElement: "Yang Water",
    hidden: "Quý",
    isDay: true,
    stemColor: "var(--jade)",
  },
  {
    label: "Hour Pillar",
    stem: "Bính",
    stemElement: "Yang Fire",
    branch: "Dần",
    branchElement: "Yang Wood",
    hidden: "Giáp, Bính, Mậu",
    isDay: false,
    stemColor: "var(--text-heading)",
  },
];

export function BaziResultPreview({ locale, className }: BaziResultPreviewProps) {
  const isVi = locale === "vi";
  const pillars = isVi ? PILLARS_VI : PILLARS_EN;

  return (
    <div className={className} data-discipline-preview="bat-tu">
      <div
        style={{
          marginTop: "48px",
          display: "grid",
          gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
          gap: "1px",
          background: "var(--border-hairline)",
          border: "1px solid var(--border-hairline)",
          borderRadius: "var(--radius-lg)",
          overflow: "hidden",
        }}
      >
        {pillars.map((p) => (
          <div
            key={p.label}
            style={{
              background: "var(--surface-panel)",
              padding: "24px 16px",
              display: "flex",
              flexDirection: "column",
              gap: "14px",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "baseline",
                justifyContent: "space-between",
              }}
            >
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "10.5px",
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: "var(--text-faint)",
                }}
              >
                {p.label}
              </span>
              {p.isDay && (
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: "9px",
                    letterSpacing: "0.06em",
                    color: "var(--jade)",
                    border: "1px solid var(--jade-deep)",
                    borderRadius: "var(--radius-pill)",
                    padding: "1px 6px",
                  }}
                >
                  {isVi ? "NHẬT CHỦ" : "DAY MASTER"}
                </span>
              )}
            </div>
            <div
              style={{
                textAlign: "center",
                padding: "16px 0",
                borderTop: "1px solid var(--border-hairline)",
                borderBottom: "1px solid var(--border-hairline)",
              }}
            >
              <div
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: "26px",
                  color: p.stemColor,
                }}
              >
                {p.stem}
              </div>
              <div
                style={{
                  marginTop: "4px",
                  fontFamily: "var(--font-mono)",
                  fontSize: "11px",
                  color: "var(--text-faint)",
                }}
              >
                {p.stemElement}
              </div>
              <div
                style={{
                  marginTop: "14px",
                  fontFamily: "var(--font-display)",
                  fontSize: "26px",
                  color: "var(--text-heading)",
                }}
              >
                {p.branch}
              </div>
              <div
                style={{
                  marginTop: "4px",
                  fontFamily: "var(--font-mono)",
                  fontSize: "11px",
                  color: "var(--text-faint)",
                }}
              >
                {p.branchElement}
              </div>
            </div>
            <div>
              <div
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "9.5px",
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  color: "var(--text-faint)",
                }}
              >
                {isVi ? "Tàng can" : "Hidden stems"}
              </div>
              <div
                style={{
                  marginTop: "6px",
                  fontSize: "13px",
                  lineHeight: 1.5,
                  color: "var(--text-body)",
                }}
              >
                {p.hidden}
              </div>
            </div>
          </div>
        ))}
      </div>

      <p
        style={{
          margin: "16px 0 0",
          fontSize: "12.5px",
          color: "var(--text-faint)",
        }}
      >
        {isVi
          ? "Thập Thần (Ten Gods) và bảng quan hệ hình – xung – hợp – hại sẽ hiển thị cạnh bốn trụ khi tính năng luận giải ra mắt."
          : "Ten Gods and interaction tables (clash, harmony, harm, penalty) will be displayed alongside the four pillars when interpretive analysis launches."}
      </p>

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
            {isVi ? "Ghi chú bên lề · Ngũ hành" : "Margin note · Five Elements"}
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
              ? "Bốn can lộ trong hồ sơ mẫu: 1 Mộc, 1 Thổ, 1 Kim, 1 Hoả — chưa tính tàng can và trọng số."
              : "Four exposed stems in sample profile: 1 Wood, 1 Earth, 1 Metal, 1 Fire — excluding hidden stems and weights."}
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
              ? "Bản đầy đủ sẽ cộng thêm tàng can và áp trọng số theo phương pháp, không chỉ đếm số lượng can lộ."
              : "The full version incorporates hidden stems and applies methodological weighting, not merely counting exposed stems."}
          </p>
        </div>
      </div>
    </div>
  );
}

export default BaziResultPreview;
