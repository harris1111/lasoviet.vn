"use client";

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
  thapThanLabel: string;
  thapThanColor: string;
  note: string;
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
    thapThanLabel: "Thất Sát",
    thapThanColor: "var(--text-body)",
    note: "Trụ Năm — Canh (Dương Kim) / Ngọ (Dương Hoả), tàng can Đinh và Kỷ. Thập Thần Thất Sát: Kim khắc Mộc (Nhật Chủ), cùng cực Dương.",
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
    thapThanLabel: "Chính Tài",
    thapThanColor: "var(--text-body)",
    note: "Trụ Tháng — Kỷ (Âm Thổ) / Mão (Âm Mộc), tàng can Ất. Thập Thần Chính Tài: Nhật Chủ (Mộc) khắc Thổ, khác cực Âm/Dương.",
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
    thapThanLabel: "— (Nhật Chủ)",
    thapThanColor: "var(--jade)",
    note: "Trụ Ngày — Giáp (Dương Mộc) / Tý (Dương Thuỷ), tàng can Quý. Đây là Nhật Chủ: điểm quy chiếu để luận toàn bộ lá số, không tính Thập Thần cho chính nó.",
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
    thapThanLabel: "Thực Thần",
    thapThanColor: "var(--text-body)",
    note: "Trụ Giờ — Bính (Dương Hoả) / Dần (Dương Mộc), tàng can Giáp, Bính, Mậu. Thập Thần Thực Thần: Nhật Chủ (Mộc) sinh Hoả, cùng cực Dương.",
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
    thapThanLabel: "Seven Killings",
    thapThanColor: "var(--text-body)",
    note: "Year Pillar — Canh (Yang Metal) / Ngọ (Yang Fire), hidden stems Đinh and Kỷ. Seven Killings (Thất Sát): Metal controls Wood (Day Master), same polarity (Yang).",
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
    thapThanLabel: "Direct Wealth",
    thapThanColor: "var(--text-body)",
    note: "Month Pillar — Kỷ (Yin Earth) / Mão (Yin Wood), hidden stem Ất. Direct Wealth (Chính Tài): Day Master (Wood) controls Earth, opposite polarity (Yin/Yang).",
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
    thapThanLabel: "— (Day Master)",
    thapThanColor: "var(--jade)",
    note: "Day Pillar — Giáp (Yang Wood) / Tý (Yang Water), hidden stem Quý. This is the Day Master: foundational reference point for the entire chart, no Ten Gods assigned to itself.",
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
    thapThanLabel: "Eating God",
    thapThanColor: "var(--text-body)",
    note: "Hour Pillar — Bính (Yang Fire) / Dần (Yang Wood), hidden stems Giáp, Bính, Mậu. Eating God (Thực Thần): Day Master (Wood) engenders Fire, same polarity (Yang).",
  },
];

const ELEMENT_COUNTS_VI = [
  { label: "Mộc", count: 1, color: "#5C8A5A" },
  { label: "Hoả", count: 1, color: "#B5533C" },
  { label: "Thổ", count: 1, color: "#A8842F" },
  { label: "Kim", count: 1, color: "#8C8C94" },
  { label: "Thuỷ", count: 0, color: "#4A7A9C" },
];

const ELEMENT_COUNTS_EN = [
  { label: "Wood", count: 1, color: "#5C8A5A" },
  { label: "Fire", count: 1, color: "#B5533C" },
  { label: "Earth", count: 1, color: "#A8842F" },
  { label: "Metal", count: 1, color: "#8C8C94" },
  { label: "Water", count: 0, color: "#4A7A9C" },
];

export function BaziResultPreview({ locale, className }: BaziResultPreviewProps) {
  const isVi = locale === "vi";
  const pillars = isVi ? PILLARS_VI : PILLARS_EN;
  const elementCounts = isVi ? ELEMENT_COUNTS_VI : ELEMENT_COUNTS_EN;
  const [selectedPillarIndex, setSelectedPillarIndex] = React.useState(2);
  const selectedPillar: PillarItem = pillars[selectedPillarIndex] ?? (PILLARS_VI[2] as PillarItem);

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
        {pillars.map((p, idx) => {
          const isSelected = idx === selectedPillarIndex;
          return (
            <button
              key={p.label}
              type="button"
              aria-pressed={isSelected}
              onClick={() => setSelectedPillarIndex(idx)}
              style={{
                background: "var(--surface-panel)",
                padding: "24px 16px",
                display: "flex",
                flexDirection: "column",
                gap: "14px",
                textAlign: "left",
                fontFamily: "inherit",
                cursor: "pointer",
                border: "none",
                borderBottom: isSelected ? "3px solid var(--jade, #4F7A68)" : "3px solid transparent",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  justifyContent: "space-between",
                  width: "100%",
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
                  width: "100%",
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
              <div
                style={{
                  textAlign: "left",
                  width: "100%",
                }}
              >
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
              <div
                style={{
                  textAlign: "left",
                  borderTop: "1px solid var(--border-hairline)",
                  paddingTop: "12px",
                  width: "100%",
                }}
              >
                <div
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: "9.5px",
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                    color: "var(--text-faint)",
                  }}
                >
                  {isVi ? "Thập Thần" : "Ten Gods"}
                </div>
                <div
                  style={{
                    marginTop: "6px",
                    fontSize: "13px",
                    lineHeight: 1.5,
                    color: p.thapThanColor,
                  }}
                >
                  {p.thapThanLabel}
                </div>
              </div>
            </button>
          );
        })}
      </div>

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
            color: "var(--jade, #4F7A68)",
          }}
        >
          {isVi ? "Đang xem: " + selectedPillar.label : "Inspecting: " + selectedPillar.label}
        </div>
        <p
          style={{
            margin: "8px 0 0",
            fontSize: "14.5px",
            lineHeight: 1.65,
            color: "var(--text-body)",
          }}
        >
          {selectedPillar.note}
        </p>
      </div>

      <p
        style={{
          margin: "16px 0 0",
          fontSize: "12.5px",
          color: "var(--text-faint)",
        }}
      >
        {isVi
          ? "Bảng quan hệ hình – xung – hợp – hại đầy đủ sẽ hiển thị khi tính năng luận giải ra mắt."
          : "Comprehensive interaction tables (clash, harmony, harm, penalty) will be displayed once interpretive analysis launches."}
      </p>

      <div
        className="discipline-bazi-elements-grid"
        style={{
          marginTop: "48px",
          display: "grid",
          gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)",
          gap: "40px",
          alignItems: "start",
        }}
      >
        <div>
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "11px",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "var(--text-faint)",
            }}
          >
            {isVi ? "Ngũ hành (can lộ)" : "Five Elements (exposed stems)"}
          </div>
          <div style={{ marginTop: "16px", display: "grid", gap: "10px" }}>
            {elementCounts.map((e) => (
              <div key={e.label} style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <span style={{ flex: "none", width: "56px", fontSize: "13px", color: "var(--text-body)" }}>
                  {e.label}
                </span>
                <div
                  style={{
                    flex: 1,
                    height: "10px",
                    background: "var(--border-hairline)",
                    borderRadius: "var(--radius-pill)",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      width: Math.round((e.count / 4) * 100) + "%",
                      background: e.color,
                    }}
                  />
                </div>
                <span
                  style={{
                    flex: "none",
                    width: "18px",
                    textAlign: "right",
                    fontFamily: "var(--font-mono)",
                    fontSize: "12px",
                    color: "var(--text-faint)",
                  }}
                >
                  {e.count}
                </span>
              </div>
            ))}
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
              ? "Chỉ đếm can lộ (Thiên Can) của 4 trụ trong hồ sơ mẫu — chưa cộng tàng can hay áp trọng số theo phương pháp. Đây là bảng đếm thành phần, không phải điểm số hay xếp hạng."
              : "Counts only exposed stems (Heavenly Stems) of the 4 pillars in the sample profile — excluding hidden stems and methodological weighting. This is a component count, not a score or ranking."}
          </p>
        </div>

        <div
          style={{
            background: "var(--surface-panel)",
            border: "1px dashed var(--border-hairline)",
            borderRadius: "var(--radius-md)",
            padding: "24px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--text-faint)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "11px",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "var(--text-faint)",
              }}
            >
              {isVi ? "Đại vận (Luck Pillars)" : "Major Luck Pillars"}
            </span>
          </div>
          <p
            style={{
              margin: "12px 0 0",
              fontSize: "13.5px",
              lineHeight: 1.65,
              color: "var(--text-muted)",
            }}
          >
            {isVi
              ? "Dòng thời gian đại vận cần tuổi khởi vận và chiều thuận/nghịch tính từ engine thật. Chưa hiển thị ở bản minh hoạ này để tránh suy diễn sai — sẽ mở khi engine được duyệt."
              : "Luck pillar timeline requires starting age and forward/reverse direction computed by the engine. Excluded from this preview to prevent false inference — will activate once the engine is approved."}
          </p>
        </div>
      </div>
    </div>
  );
}

export default BaziResultPreview;
