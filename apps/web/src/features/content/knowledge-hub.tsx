import type { PublicContentV1, RouteDefinitionV1 } from "@lasoviet/contracts";
import Link from "next/link";

import { Breadcrumb } from "../../components/breadcrumb";
import { KnowledgeCard } from "./knowledge-card";
import {
  FEATURED_SPOTLIGHT_ARTICLE_ID,
  getArticleImage,
  KNOWLEDGE_CLUSTERS,
  SPOTLIGHT_LIST_ARTICLE_IDS,
} from "./knowledge-data";
import type { PublicContentRepository } from "./public-content-repository";

type KnowledgeHubProps = {
  content: PublicContentV1;
  locale: "en" | "vi";
  repository: PublicContentRepository;
  routes: readonly RouteDefinitionV1[];
  route?: RouteDefinitionV1;
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

export function KnowledgeHub({ content, locale, repository, routes, route }: KnowledgeHubProps) {
  const isTuViPillar = route?.id === "knowledge.tu-vi" || content.routeId === "knowledge.tu-vi";

  const breadcrumbs = [
    {
      label: locale === "vi" ? "Trang chủ" : "Home",
      href: locale === "en" ? "/en" : "/",
    },
    {
      label: locale === "vi" ? "Thư viện kiến thức" : "Knowledge Library",
      href: isTuViPillar ? localizedPath(locale, "/kien-thuc") : undefined,
    },
    ...(isTuViPillar
      ? [
          {
            label: locale === "vi" ? "Kiến thức Tử Vi" : "Tu Vi Knowledge",
          },
        ]
      : []),
  ];

  // Load Spotlight Featured Article
  const featuredRoute = routes.find((r) => r.id === FEATURED_SPOTLIGHT_ARTICLE_ID);
  const featuredArticle = featuredRoute ? repository.get(featuredRoute.id, locale) : null;

  // Load Spotlight List Articles
  const spotlightArticles = SPOTLIGHT_LIST_ARTICLE_IDS.map((id) => {
    const itemRoute = routes.find((r) => r.id === id);
    if (!itemRoute) return null;
    try {
      const itemContent = repository.get(itemRoute.id, locale);
      return { route: itemRoute, content: itemContent };
    } catch {
      return null;
    }
  }).filter((item): item is NonNullable<typeof item> => item !== null);

  const bylineLabel = locale === "vi" ? "Lá Số Việt biên tập" : "Edited by La So Viet";

  return (
    <main className="knowledge-hub container" data-light-ready>
      {/* Breadcrumb Navigation */}
      <Breadcrumb items={breadcrumbs} locale={locale} />

      {/* Hero Header */}
      <section className="knowledge-hub-hero" aria-labelledby="hub-heading">
        <p className="eyebrow">{locale === "vi" ? "Thư viện tri thức" : "Knowledge Library"}</p>
        <h1 id="hub-heading">{content.title}</h1>
        <p className="lead">{content.summary}</p>
      </section>

      {/* Featured Spotlight: 1 large card + 4 compact items */}
      {featuredArticle && featuredRoute && (
        <section
          className="knowledge-spotlight"
          aria-label={locale === "vi" ? "Bài viết nổi bật" : "Featured Articles"}
        >
          <KnowledgeCard
            variant="featured"
            href={localizedPath(locale, featuredRoute.path)}
            image={getArticleImage(featuredRoute.id)}
            title={featuredArticle.title}
            summary={featuredArticle.summary}
            category={locale === "vi" ? "Học đọc lá số" : "Learn to Read"}
            date={formatDate(featuredArticle.lastReviewed, locale)}
            byline={bylineLabel}
            priority={true}
            locale={locale}
          />

          <div
            className="knowledge-compact-list"
            aria-label={locale === "vi" ? "Chủ đề căn bản" : "Core Foundations"}
          >
            {spotlightArticles.map((item, index) => (
              <KnowledgeCard
                key={item.route.id}
                variant="compact"
                href={localizedPath(locale, item.route.path)}
                image={getArticleImage(item.route.id)}
                title={item.content.title}
                summary={item.content.summary}
                itemNumber={index + 1}
                byline={bylineLabel}
                locale={locale}
              />
            ))}
          </div>
        </section>
      )}

      {/* 5 Thematic Clusters */}
      <div className="knowledge-clusters">
        {KNOWLEDGE_CLUSTERS.map((cluster) => {
          const clusterArticles = cluster.articleRouteIds
            .map((routeId) => {
              const articleRoute = routes.find((r) => r.id === routeId);
              if (!articleRoute) return null;
              try {
                const articleContent = repository.get(articleRoute.id, locale);
                return { route: articleRoute, content: articleContent };
              } catch {
                return null;
              }
            })
            .filter((item): item is NonNullable<typeof item> => item !== null);

          if (clusterArticles.length === 0) return null;

          const clusterTitle = locale === "vi" ? cluster.titleVi : cluster.titleEn;
          const clusterDesc = locale === "vi" ? cluster.descriptionVi : cluster.descriptionEn;

          return (
            <section
              key={cluster.id}
              className="knowledge-cluster"
              aria-labelledby={`cluster-${cluster.id}`}
            >
              <div className="knowledge-cluster-header">
                <h2 id={`cluster-${cluster.id}`} className="knowledge-cluster-title">
                  {clusterTitle}
                </h2>
                <p className="knowledge-cluster-desc">{clusterDesc}</p>
              </div>

              <div className="knowledge-card-grid">
                {clusterArticles.map((item) => (
                  <KnowledgeCard
                    key={item.route.id}
                    variant="standard"
                    href={localizedPath(locale, item.route.path)}
                    image={getArticleImage(item.route.id)}
                    title={item.content.title}
                    summary={item.content.summary}
                    category={clusterTitle}
                    date={formatDate(item.content.lastReviewed, locale)}
                    byline={bylineLabel}
                    locale={locale}
                  />
                ))}
              </div>
            </section>
          );
        })}
      </div>

      {/* Bottom Bridge CTA into Free Zi Wei Chart */}
      <section className="knowledge-article-cta" aria-labelledby="knowledge-cta-heading">
        <h3 id="knowledge-cta-heading">
          {locale === "vi"
            ? "Đối chiếu kiến thức này trên lá số của bạn"
            : "Verify this knowledge on your own chart"}
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
    </main>
  );
}
