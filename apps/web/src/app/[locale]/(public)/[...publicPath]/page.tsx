import { routeRegistry } from "@lasoviet/config";
import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";

import { PublicContentPage } from "../../../../features/content/public-content-page";
import { loadPublicContentRepository } from "../../../../features/content/public-content-repository";
import { resolvePublicRoute } from "../../../../features/content/public-route-resolver";
import { buildPublicMetadata } from "../../../../seo/public-metadata";

type PageProps = {
  params: Promise<{ locale: "en" | "vi"; publicPath: string[] }>;
};

function resolve(locale: "en" | "vi", publicPath: string[]) {
  const path = `/${publicPath.join("/")}`;
  return resolvePublicRoute(locale === "en" ? `/en${path}` : path, {
    routes: routeRegistry,
    contentRepository: loadPublicContentRepository(routeRegistry),
  });
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale, publicPath } = await params;
  const result = resolve(locale, publicPath);
  if (result.kind !== "render") return { robots: { index: false, follow: false } };
  return buildPublicMetadata(result.route, result.content);
}

export default async function PublicRoutePage({ params }: PageProps) {
  const { locale, publicPath } = await params;
  const result = resolve(locale, publicPath);

  if (result.kind === "redirect") permanentRedirect(result.target);
  if (result.kind !== "render") notFound();

  return (
    <PublicContentPage
      content={result.content}
      locale={result.locale}
      repository={loadPublicContentRepository(routeRegistry)}
      route={result.route}
      routes={routeRegistry}
    />
  );
}
