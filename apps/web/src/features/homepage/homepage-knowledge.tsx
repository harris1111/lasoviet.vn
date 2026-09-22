import Link from "next/link";
import { useTranslations } from "next-intl";

import { ArtifactImage } from "../../components/artifact-image";
import { imagePath, localizedPath } from "./homepage-utilities";

type HomepageKnowledgeProps = {
  locale: "en" | "vi";
};

export function HomepageKnowledge({ locale }: HomepageKnowledgeProps) {
  const t = useTranslations("common");
  const isEn = locale === "en";

  const featured = {
    key: "chart",
    image: "cau-truc-la-so-tu-vi-12-cung-la-gi-homepage.webp",
    href: "/kien-thuc/tu-vi/la-so-tu-vi-la-gi",
    title: t("home.knowledge.chart.title"),
    copy: t("home.knowledge.chart.copy"),
    category: isEn ? "Core Knowledge" : "Kiến thức nền tảng",
    byline: isEn ? "Edited by Lá Số Việt" : "Lá Số Việt biên tập",
  };

  const compactList = [
    {
      key: "create",
      href: "/kien-thuc/tu-vi/cach-lap-la-so-tu-vi",
      title: t("home.knowledge.create.title"),
      copy: t("home.knowledge.create.copy"),
      category: isEn ? "Methodology" : "Phương pháp lập",
    },
    {
      key: "read",
      href: "/kien-thuc/tu-vi/cach-doc-la-so-tu-vi",
      title: t("home.knowledge.read.title"),
      copy: t("home.knowledge.read.copy"),
      category: isEn ? "Reading Guide" : "Hướng dẫn đọc",
    },
    {
      key: "evidence",
      href: "/phuong-phap/can-cu-ai",
      title: isEn ? "Evidence & Calculation Rules" : "Căn cứ khoa học và quy tắc an sao",
      copy: isEn
        ? "How calculations remain strictly grounded in verified classical rules without arbitrary drift."
        : "Nguyên tắc tính toán minh bạch dựa trên cổ thư và quy tắc an sao hệ thống.",
      category: isEn ? "Evidence" : "Căn cứ",
    },
    {
      key: "hub",
      href: "/kien-thuc",
      title: isEn ? "Knowledge Library Overview" : "Thư viện kiến thức Tử Vi Đẩu Số",
      copy: isEn
        ? "Explore complete articles, star meanings, palace dynamics, and foundational concepts."
        : "Tra cứu toàn bộ chuyên đề sao, cung vị và các phương pháp giải đoán cổ điển.",
      category: isEn ? "Library" : "Thư viện",
    },
  ];

  return (
    <div className="container knowledge-section-wrap">
      <div className="section-heading text-center">
        <p className="eyebrow">{t("home.knowledge.eyebrow")}</p>
        <h2>{t("home.knowledge.title")}</h2>
        <p className="section-lead">
          {isEn
            ? "Essential foundations, calculation methods, and transparent rules edited by Lá Số Việt."
            : "Nền tảng cốt lõi, phương pháp an sao và các nguyên tắc đối chiếu do Lá Số Việt biên tập."}
        </p>
      </div>

      <div className="knowledge-layout-grid">
        {/* 1 Featured Article Card */}
        <article className="knowledge-featured-card">
          <Link href={localizedPath(locale, featured.href)} className="featured-card-link">
            <figure className="featured-card-figure">
              <ArtifactImage
                alt={featured.title}
                desktop={imagePath(featured.image)}
              />
            </figure>
            <div className="featured-card-body">
              <span className="knowledge-category-tag">{featured.category}</span>
              <h3 className="featured-card-title">{featured.title}</h3>
              <p className="featured-card-copy">{featured.copy}</p>
              <div className="featured-card-meta">
                <span className="featured-byline">{featured.byline}</span>
                <span className="featured-read-link">
                  {isEn ? "Read article →" : "Đọc bài viết →"}
                </span>
              </div>
            </div>
          </Link>
        </article>

        {/* 4 Compact List Items */}
        <div className="knowledge-compact-list">
          {compactList.map((item, index) => (
            <article className="knowledge-compact-item" key={item.key}>
              <Link href={localizedPath(locale, item.href)} className="compact-item-link">
                <div className="compact-item-num">{String(index + 1).padStart(2, "0")}</div>
                <div className="compact-item-content">
                  <span className="knowledge-compact-tag">{item.category}</span>
                  <h4 className="compact-item-title">{item.title}</h4>
                  <p className="compact-item-copy">{item.copy}</p>
                </div>
              </Link>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}
