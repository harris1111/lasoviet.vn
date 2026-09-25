import { useTranslations } from "next-intl";

import { KnowledgeCard } from "../content/knowledge-card";
import { imagePath, localizedPath } from "./homepage-utilities";

type HomepageKnowledgeProps = {
  locale: "en" | "vi";
};

export function HomepageKnowledge({ locale }: HomepageKnowledgeProps) {
  const t = useTranslations("common");

  const featured = {
    key: "chart",
    image: imagePath("cau-truc-la-so-tu-vi-12-cung-la-gi-homepage.webp"),
    href: localizedPath(locale, "/kien-thuc/tu-vi/la-so-tu-vi-la-gi"),
    title: t("home.knowledge.chart.title"),
    copy: t("home.knowledge.chart.copy"),
    category: t("home.knowledge.featuredCategory"),
    byline: t("home.knowledge.byline"),
  };

  const compactList = [
    {
      key: "create",
      href: localizedPath(locale, "/kien-thuc/tu-vi/cach-lap-la-so-tu-vi"),
      title: t("home.knowledge.create.title"),
      copy: t("home.knowledge.create.copy"),
      category: t("home.knowledge.createCategory"),
    },
    {
      key: "read",
      href: localizedPath(locale, "/kien-thuc/tu-vi/cach-doc-la-so-tu-vi"),
      title: t("home.knowledge.read.title"),
      copy: t("home.knowledge.read.copy"),
      category: t("home.knowledge.readCategory"),
    },
    {
      key: "evidence",
      href: localizedPath(locale, "/phuong-phap/ai-va-can-cu"),
      title: t("home.knowledge.evidenceTitle"),
      copy: t("home.knowledge.evidenceCopy"),
      category: t("home.knowledge.evidenceCategory"),
    },
    {
      key: "hub",
      href: localizedPath(locale, "/kien-thuc"),
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

      <div className="knowledge-spotlight">
        {/* 1 Featured Article Card */}
        <KnowledgeCard
          variant="featured"
          href={featured.href}
          image={featured.image}
          title={featured.title}
          summary={featured.copy}
          category={featured.category}
          byline={featured.byline}
          priority={false}
          locale={locale}
        />

        {/* 4 Compact List Items */}
        <div className="knowledge-compact-list">
          {compactList.map((item, index) => (
            <KnowledgeCard
              key={item.key}
              variant="compact"
              href={item.href}
              image=""
              title={item.title}
              summary={item.copy}
              category={item.category}
              itemNumber={index + 1}
              byline={featured.byline}
              locale={locale}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
