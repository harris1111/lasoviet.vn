import Link from "next/link";
import { useTranslations } from "next-intl";

import { ArtifactImage } from "../../components/artifact-image";
import { imagePath, localizedPath } from "./homepage-utilities";

type HomepageKnowledgeProps = {
  locale: "en" | "vi";
};

export function HomepageKnowledge({ locale }: HomepageKnowledgeProps) {
  const t = useTranslations("common");

  const featured = {
    key: "chart",
    image: "cau-truc-la-so-tu-vi-12-cung-la-gi-homepage.webp",
    href: "/kien-thuc/tu-vi/la-so-tu-vi-la-gi",
    title: t("home.knowledge.chart.title"),
    copy: t("home.knowledge.chart.copy"),
    category: t("home.knowledge.featuredCategory"),
    byline: t("home.knowledge.byline"),
  };

  const compactList = [
    {
      key: "create",
      href: "/kien-thuc/tu-vi/cach-lap-la-so-tu-vi",
      title: t("home.knowledge.create.title"),
      copy: t("home.knowledge.create.copy"),
      category: t("home.knowledge.createCategory"),
    },
    {
      key: "read",
      href: "/kien-thuc/tu-vi/cach-doc-la-so-tu-vi",
      title: t("home.knowledge.read.title"),
      copy: t("home.knowledge.read.copy"),
      category: t("home.knowledge.readCategory"),
    },
    {
      key: "evidence",
      href: "/phuong-phap/ai-va-can-cu",
      title: t("home.knowledge.evidenceTitle"),
      copy: t("home.knowledge.evidenceCopy"),
      category: t("home.knowledge.evidenceCategory"),
    },
    {
      key: "hub",
      href: "/kien-thuc",
      title: t("home.knowledge.libraryTitle"),
      copy: t("home.knowledge.libraryCopy"),
      category: t("home.knowledge.libraryCategory"),
    },
  ];

  return (
    <div className="container knowledge-section-wrap">
      <div className="section-heading text-center">
        <p className="eyebrow">{t("home.knowledge.eyebrow")}</p>
        <h2>{t("home.knowledge.title")}</h2>
        <p className="section-lead">{t("home.knowledge.lead")}</p>
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
                  {t("home.knowledge.readArticle")}
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
