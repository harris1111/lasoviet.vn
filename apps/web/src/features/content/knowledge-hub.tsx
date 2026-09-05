import type { PublicContentV1, RouteDefinitionV1 } from "@lasoviet/contracts";
import Link from "next/link";

import type { PublicContentRepository } from "./public-content-repository";

type KnowledgeHubProps = {
  content: PublicContentV1;
  locale: "en" | "vi";
  repository: PublicContentRepository;
  routes: readonly RouteDefinitionV1[];
};

function localizedPath(locale: "en" | "vi", path: string) {
  return locale === "en" ? `/en${path}` : path;
}

export function KnowledgeHub({ content, locale, repository, routes }: KnowledgeHubProps) {
  const currentRoute = routes.find((route) => route.id === content.routeId);
  const routePrefix = currentRoute?.path ?? "/kien-thuc";
  const articles = routes.filter((route) =>
    route.status === "live_indexable"
    && route.template === "knowledge-article"
    && route.path.startsWith(`${routePrefix}/`),
  );

  return (
    <main className="content-page">
      <section className="content-hero container">
        <p className="eyebrow">{locale === "vi" ? "Thư viện tri thức" : "Knowledge library"}</p>
        <h1>{content.title}</h1>
        <p>{content.summary}</p>
      </section>
      <section className="content-section container" aria-label={content.title}>
        <div className="content-list">
          {articles.map((route) => {
            const article = repository.get(route.id, locale);
            return (
              <article key={route.id}>
                <p className="eyebrow">{locale === "vi" ? "Bài viết" : "Article"}</p>
                <h2><Link href={localizedPath(locale, route.path)}>{article.title}</Link></h2>
                <p>{article.summary}</p>
              </article>
            );
          })}
        </div>
      </section>
    </main>
  );
}
