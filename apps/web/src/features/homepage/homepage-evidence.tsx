"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { localizedPath } from "./homepage-utilities";

type HomepageEvidenceProps = {
  locale?: "en" | "vi";
};

export function HomepageEvidence({ locale = "vi" }: HomepageEvidenceProps) {
  const t = useTranslations("common");

  const cards = [
    {
      id: "chart-structure",
      badgeVi: "Đồ hình chuẩn xác",
      badgeEn: "Accurate chart structure",
      titleVi: "Cấu trúc 12 cung an sao",
      titleEn: "12-palace astrological chart",
      descVi: "Phân bổ chính tinh, phụ tinh và ngũ hành nạp âm trực tiếp trên đồ hình truyền thống.",
      descEn: "Major stars, auxiliary stars, and elements arranged on the classical 12-palace grid.",
      metaVi: "12 cung vị · 108 sao",
      metaEn: "12 palaces · 108 stars",
    },
    {
      id: "palace-relations",
      badgeVi: "Tương tác cung vị",
      badgeEn: "Palace interaction network",
      titleVi: "Mối liên hệ xung chiếu & tam hợp",
      titleEn: "Opposing and trine relations",
      descVi: "Đối chiếu thế đứng giữa Mệnh, Tài, Quan và các cung xung hợp để làm rõ thế vượng suy.",
      descEn: "Examines life, wealth, career, and opposing palaces to assess strength and alignment.",
      metaVi: "Tam hợp · Xung chiếu · Nhị hợp",
      metaEn: "Trine · Opposing · Hexagram harmony",
    },
    {
      id: "evidence-source",
      badgeVi: "Quy tắc minh bạch",
      badgeEn: "Verifiable rules",
      titleVi: "Căn cứ an định & cổ thư đối chiếu",
      titleEn: "Star calculation rules and sources",
      descVi: "Mỗi luận điểm đều có thể mở xem căn cứ tính toán, vị trí sao và quy tắc luận giải minh bạch.",
      descEn: "Every insight lets you inspect underlying star placements and documented rules.",
      metaVi: "Không phán đoán trừu tượng",
      metaEn: "Zero abstract speculation",
    },
    {
      id: "reading-progress",
      badgeVi: "Lộ trình đọc hiểu",
      badgeEn: "Reading trajectory",
      titleVi: "Tiến trình luận giải theo chủ đề",
      titleEn: "Topic-by-topic interpretation",
      descVi: "Từ tổng quan bản mệnh đến chi tiết từng đại vận, đánh dấu phần đã đọc và lưu giữ lâu dài.",
      descEn: "From lifetime overview to detailed 10-year periods, tracking reading progress.",
      metaVi: "Lưu giữ an toàn trong thư viện",
      metaEn: "Safely preserved in your library",
    },
  ];

  function handleScrollToForm() {
    const form = document.getElementById("hero-form");
    if (form) {
      form.scrollIntoView({ behavior: "smooth", block: "center" });
      form.querySelector<HTMLElement>("input, select, button")?.focus();
    }
  }

  return (
    <div className="container evidence-carousel-wrap">
      <div className="section-heading text-center">
        <p className="eyebrow">{t("home.evidence.eyebrow")}</p>
        <h2>{t("home.evidence.title")}</h2>
        <p className="section-lead">{t("home.evidence.copy")}</p>
      </div>

      <div
        className="evidence-carousel"
        role="region"
        aria-label={locale === "en" ? "Evidence sample carousel" : "Bản chứng thực đồ hình và căn cứ"}
        tabIndex={0}
      >
        {cards.map((card) => (
          <article className="evidence-slide-card" key={card.id}>
            <div className="evidence-card-badge">
              {locale === "en" ? card.badgeEn : card.badgeVi}
            </div>
            <h3 className="evidence-card-title">
              {locale === "en" ? card.titleEn : card.titleVi}
            </h3>
            <p className="evidence-card-desc">
              {locale === "en" ? card.descEn : card.descVi}
            </p>
            <div className="evidence-card-meta">
              <span className="evidence-meta-pill">
                {locale === "en" ? card.metaEn : card.metaVi}
              </span>
            </div>
          </article>
        ))}
      </div>

      <div className="evidence-carousel-action text-center">
        <button
          type="button"
          className="button button-pill"
          onClick={handleScrollToForm}
        >
          {locale === "en" ? "Build your chart" : "Xem lá số của bạn"}
        </button>
      </div>
    </div>
  );
}
