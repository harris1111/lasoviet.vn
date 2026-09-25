import type { PublicContentV1, RouteDefinitionV1 } from "@lasoviet/contracts";
import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

import { Breadcrumb } from "../../components/breadcrumb";
import { KnowledgeCard } from "./knowledge-card";
import { getArticleImage, KNOWLEDGE_CLUSTERS } from "./knowledge-data";
import type { PublicContentRepository } from "./public-content-repository";

export type KnowledgeArticleProps = {
  content: PublicContentV1;
  locale: "en" | "vi";
  repository?: PublicContentRepository;
  route?: RouteDefinitionV1;
  routes?: readonly RouteDefinitionV1[];
  contentBlocksRenderer?: (body: string, locale: "en" | "vi", routes: readonly RouteDefinitionV1[]) => ReactNode[];
};

function localizedPath(locale: "en" | "vi", path: string) {
  return locale === "en" ? `/en${path}` : path;
}

function formatDate(dateStr: string, locale: "en" | "vi"): string {
  if (!dateStr) return "";
  try {
    const [year, month, day] = dateStr.split("-");
    if (!year || !month || !day) return dateStr;
    return locale === "vi" ? `${day}/${month}/${year}` : `${month}/${day}/${year}`;
  } catch {
    return dateStr;
  }
}

export function KnowledgeArticle({
  content,
  locale,
  repository,
  route,
  routes = [],
  contentBlocksRenderer,
}: KnowledgeArticleProps) {
  const currentRouteId = route?.id ?? content.routeId;
  const image = getArticleImage(currentRouteId);
  const bylineLabel = locale === "vi" ? "Lá Số Việt biên tập" : "Edited by La So Viet";
  const dateFormatted = formatDate(content.lastReviewed, locale);

  const breadcrumbs = [
    {
      label: locale === "vi" ? "Trang chủ" : "Home",
      href: locale === "en" ? "/en" : "/",
    },
    {
      label: locale === "vi" ? "Thư viện kiến thức" : "Knowledge Library",
      href: localizedPath(locale, "/kien-thuc"),
    },
    {
      label: locale === "vi" ? "Kiến thức Tử Vi" : "Tu Vi Knowledge",
      href: localizedPath(locale, "/kien-thuc/tu-vi"),
    },
    {
      label: content.title,
    },
  ];

  // Find related articles (from the same cluster or other articles)
  const currentCluster = KNOWLEDGE_CLUSTERS.find((c) =>
    c.articleRouteIds.includes(currentRouteId),
  );

  let relatedRouteIds = currentCluster?.articleRouteIds.filter((id) => id !== currentRouteId) ?? [];
  if (relatedRouteIds.length < 2) {
    const fallbackIds = ["knowledge.tu-vi.definition", "knowledge.tu-vi.reading", "knowledge.tu-vi.calculation"]
      .filter((id) => id !== currentRouteId && !relatedRouteIds.includes(id));
    relatedRouteIds = [...relatedRouteIds, ...fallbackIds].slice(0, 3);
  }

  const relatedArticles = repository
    ? relatedRouteIds
        .map((id) => {
          const itemRoute = routes.find((r) => r.id === id);
          if (!itemRoute) return null;
          try {
            const itemContent = repository.get(itemRoute.id, locale);
            return { route: itemRoute, content: itemContent };
          } catch {
            return null;
          }
        })
        .filter((item): item is NonNullable<typeof item> => item !== null)
    : [];

  return (
    <main className="content-page">
      <article className="knowledge-article-page container">
        {/* Breadcrumb Navigation */}
        <Breadcrumb items={breadcrumbs} locale={locale} />

        {/* Article Header */}
        <header className="knowledge-article-header">
          <span className="knowledge-article-eyebrow">
            {locale === "vi" ? "Kiến thức Tử Vi" : "Tu Vi Knowledge"}
          </span>
          <h1 className="knowledge-article-title">{content.title}</h1>
          <div className="knowledge-article-meta-bar">
            <span>
              {locale === "vi" ? "Biên tập:" : "Byline:"} <b>{bylineLabel}</b>
            </span>
            {dateFormatted && (
              <span>
                {locale === "vi" ? "Cập nhật:" : "Updated:"} <time>{dateFormatted}</time>
              </span>
            )}
            <span>
              {locale === "vi" ? "Thời gian đọc: ~4 phút" : "Reading time: ~4 min"}
            </span>
          </div>
          <p className="knowledge-article-summary">{content.summary}</p>
        </header>

        {/* 16:9 Featured Image */}
        <figure className="knowledge-article-figure">
          <Image
            src={image}
            alt={content.title}
            width={760}
            height={428}
            priority
            className="knowledge-article-image"
            sizes="(max-width: 800px) 100vw, 760px"
          />
        </figure>

        {/* Article Body */}
        <div className="knowledge-article-body">
          {content.body && contentBlocksRenderer ? (
            contentBlocksRenderer(content.body, locale, routes)
          ) : content.body ? (
            <div className="content-raw-body">
              {content.body.split("\n\n").map((para, i) => (
                <p key={i}>{para}</p>
              ))}
            </div>
          ) : (
            <section>
              <h2>{locale === "vi" ? "Phạm vi bài viết" : "What this article covers"}</h2>
              <p>
                {locale === "vi"
                  ? "Nội dung được biên tập để làm rõ thuật ngữ, dữ liệu và giới hạn diễn giải. Đây không phải là kết luận tuyệt đối về một cá nhân."
                  : "This material clarifies terms, data, and interpretation limits. It is not an absolute conclusion about an individual."}
              </p>
            </section>
          )}
        </div>

        {/* Bridge Cross-sell CTA into Free Zi Wei Chart */}
        <section className="knowledge-article-cta" aria-labelledby="cta-title">
          <h3 id="cta-title">
            {locale === "vi"
              ? "Đối chiếu bài viết trên lá số của bạn"
              : "Verify this article on your own chart"}
          </h3>
          <p>
            {locale === "vi"
              ? "Lập lá số Tử Vi miễn phí trong 30 giây để xác định 12 cung, Mệnh Thân và vị trí các vì sao của riêng bạn."
              : "Generate your free Zi Wei chart in 30 seconds to inspect your 12 palaces, core configurations, and star placements."}
          </p>
          <Link
            href={localizedPath(locale, "/tao-la-so/tu-vi")}
            className="btn"
          >
            {locale === "vi" ? "Lập lá số miễn phí" : "Build free chart"}
          </Link>
        </section>

        {/* Related Articles Section */}
        {relatedArticles.length > 0 && (
          <section
            className="knowledge-related"
            aria-labelledby="related-heading"
          >
            <h3 id="related-heading">
              {locale === "vi" ? "Bài viết cùng chuyên đề" : "Related Articles"}
            </h3>
            <div className="knowledge-card-grid">
              {relatedArticles.map((item) => (
                <KnowledgeCard
                  key={item.route.id}
                  variant="standard"
                  href={localizedPath(locale, item.route.path)}
                  image={getArticleImage(item.route.id)}
                  title={item.content.title}
                  summary={item.content.summary}
                  date={formatDate(item.content.lastReviewed, locale)}
                  byline={bylineLabel}
                  locale={locale}
                />
              ))}
            </div>
          </section>
        )}
      </article>
    </main>
  );
}
