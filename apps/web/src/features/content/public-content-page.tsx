import { productCatalog } from "@lasoviet/config";
import type { PublicContentV1, RouteDefinitionV1 } from "@lasoviet/contracts";
import type { ReactNode } from "react";
import { SiteFooter } from "../../components/site-footer";
import { SiteHeader } from "../../components/site-header";
import { buildStructuredData, StructuredDataError } from "../../seo/structured-data";
import { getDisciplinePageProvider } from "../discipline-pages/discipline-page-provider";
import { DisciplinePageShell } from "../discipline-pages/discipline-page-shell";
import { DreamSymbolPreview } from "../free-tools/dream-symbol-preview";
import { FengShuiPreview } from "../free-tools/feng-shui-preview";
import { FreeToolsHub } from "../free-tools/free-tools-hub";
import type { FreeToolKey } from "../free-tools/free-tools-page-model";
import { getFreeToolsPageProvider } from "../free-tools/free-tools-page-provider";
import { GatedToolPreview, type GatedToolKind } from "../free-tools/gated-tool-preview";
import { GoodDaysPreview } from "../free-tools/good-days-preview";
import { LunarCalendarPreview } from "../free-tools/lunar-calendar-preview";
import { TarotPreview } from "../free-tools/tarot-preview";
import { ZodiacPreview } from "../free-tools/zodiac-preview";
import { CommercialTopicPage } from "./commercial-topic-page";
import { SampleReportPage } from "./sample-report-page";
import { KnowledgeArticle } from "./knowledge-article";
import { KnowledgeHub } from "./knowledge-hub";
import type { PublicContentRepository } from "./public-content-repository";

type PublicContentPageProps = {
  content: PublicContentV1;
  locale: "en" | "vi";
  repository: PublicContentRepository;
  route: RouteDefinitionV1;
  routes: readonly RouteDefinitionV1[];
};

function GenericContentPage({ content, locale }: Pick<PublicContentPageProps, "content" | "locale">) {
  return (
    <main className="content-page">
      <article className="content-article container">
        <p className="eyebrow">{locale === "vi" ? "Lá Số Việt" : "La So Viet"}</p>
        <h1>{content.title}</h1>
        <p className="content-summary">{content.summary}</p>
        <footer>
          <p>{locale === "vi" ? "Lá Số Việt biên tập" : "Edited by La So Viet"}</p>
        </footer>
      </article>
    </main>
  );
}

const ROUTE_LINK_PATTERN = /\[([^\]]+)\]\(route:([a-zA-Z0-9_.-]+)\)/g;

function resolveRouteHref(
  routeId: string,
  locale: "en" | "vi",
  routes: readonly RouteDefinitionV1[],
): string | null {
  const route = routes.find((candidate) => candidate.id === routeId);
  if (!route) return null;
  return locale === "en" ? `/en${route.path}` : route.path;
}

function renderInlineText(
  text: string,
  locale: "en" | "vi",
  routes: readonly RouteDefinitionV1[],
): ReactNode[] {
  const nodes: ReactNode[] = [];
  let lastIndex = 0;
  let key = 0;
  for (const match of text.matchAll(ROUTE_LINK_PATTERN)) {
    const index = match.index ?? 0;
    if (index > lastIndex) nodes.push(text.slice(lastIndex, index));
    const label = match[1] ?? match[0];
    const targetRouteId = match[2] ?? "";
    const href = resolveRouteHref(targetRouteId, locale, routes);
    nodes.push(
      href ? <a href={href} key={`link-${key++}`}>{label}</a> : label,
    );
    lastIndex = index + match[0].length;
  }
  if (lastIndex < text.length) nodes.push(text.slice(lastIndex));
  return nodes;
}

function PolicyPage({
  content,
  locale,
  routes,
}: Pick<PublicContentPageProps, "content" | "locale" | "routes">) {
  const blocks = (content.body ?? "")
    .split(/\n\n+/)
    .map((block) => block.trim())
    .filter((block) => block.length > 0);

  return (
    <main className="content-page">
      <article className="content-article container">
        <p className="eyebrow">{locale === "vi" ? "Lá Số Việt" : "La So Viet"}</p>
        <h1>{content.title}</h1>
        <p className="content-summary">{content.summary}</p>
        {blocks.map((block, index) =>
          block.startsWith("## ") ? (
            <h2 key={`policy-heading-${index}`}>{block.slice(3).trim()}</h2>
          ) : (
            <p key={`policy-paragraph-${index}`}>{renderInlineText(block, locale, routes)}</p>
          ),
        )}
        <footer>
          <p>{locale === "vi" ? "Lá Số Việt biên tập" : "Edited by La So Viet"}</p>
        </footer>
      </article>
    </main>
  );
}

function CalculatorLanding({ content, locale }: Pick<PublicContentPageProps, "content" | "locale">) {
  return (
    <main className="content-page">
      <section className="content-hero container">
        <p className="eyebrow">{locale === "vi" ? "Công cụ Tử Vi" : "Tu Vi tool"}</p>
        <h1>{content.title}</h1>
        <p>{content.summary}</p>
        <a className="button" href={locale === "en" ? "/en/tao-la-so/tu-vi" : "/tao-la-so/tu-vi"}>
          {locale === "vi" ? "Lập lá số miễn phí" : "Build your chart"}
        </a>
      </section>
    </main>
  );
}

function UtilityToolDispatcher({
  toolKey,
  locale,
}: {
  toolKey: FreeToolKey;
  locale: "vi" | "en";
}) {
  switch (toolKey) {
    case "good-days":
      return <GoodDaysPreview locale={locale} />;
    case "zodiac":
      return <ZodiacPreview locale={locale} />;
    case "dream-symbols":
      return <DreamSymbolPreview locale={locale} />;
    case "tarot":
      return <TarotPreview locale={locale} />;
    case "lunar-calendar":
      return <LunarCalendarPreview locale={locale} />;
    default:
      return null;
  }
}

function StructuredData({ content, route }: Pick<PublicContentPageProps, "content" | "route">) {
  try {
    return buildStructuredData(route, content, productCatalog).map((node, index) => (
      <script
        dangerouslySetInnerHTML={{ __html: JSON.stringify(node) }}
        key={`${route.id}-${index}`}
        type="application/ld+json"
      />
    ));
  } catch (error) {
    if (error instanceof StructuredDataError) return null;
    throw error;
  }
}

export function PublicContentPage(props: PublicContentPageProps) {
  if (props.route.template === "discipline-flagship") {
    const disciplineModel = getDisciplinePageProvider().resolve({
      route: props.route,
      locale: props.locale,
    });
    if (disciplineModel) {
      return (
        <div className="public-content">
          <DisciplinePageShell model={disciplineModel} />
          <StructuredData content={props.content} route={props.route} />
        </div>
      );
    }
  }

  if (props.route.template === "free-tools-hub") {
    const freeToolsModel = getFreeToolsPageProvider().resolve({
      route: props.route,
      locale: props.locale,
    });
    if (freeToolsModel && freeToolsModel.kind === "hub") {
      return (
        <div className="public-content">
          <FreeToolsHub model={freeToolsModel} />
          <StructuredData content={props.content} route={props.route} />
        </div>
      );
    }
  }

  if (props.route.template === "utility-preview") {
    const freeToolsModel = getFreeToolsPageProvider().resolve({
      route: props.route,
      locale: props.locale,
    });
    if (freeToolsModel && freeToolsModel.kind === "utility-preview") {
      return (
        <div className="public-content">
          <UtilityToolDispatcher toolKey={freeToolsModel.toolKey} locale={props.locale} />
          <StructuredData content={props.content} route={props.route} />
        </div>
      );
    }
  }

  if (props.route.template === "gated-preview") {
    const freeToolsModel = getFreeToolsPageProvider().resolve({
      route: props.route,
      locale: props.locale,
    });
    if (freeToolsModel) {
      if (freeToolsModel.kind === "flagship-preview") {
        return (
          <div className="public-content">
            <FengShuiPreview locale={props.locale} />
            <StructuredData content={props.content} route={props.route} />
          </div>
        );
      }
      if (freeToolsModel.kind === "gated-preview") {
        return (
          <div className="public-content">
            <GatedToolPreview kind="xem-chi-tay" locale={props.locale} />
            <StructuredData content={props.content} route={props.route} />
          </div>
        );
      }
    }
  }

  const template = (() => {
    switch (props.route.template) {
      case "sample-report":
        return <SampleReportPage content={props.content} locale={props.locale} route={props.route} />;
      case "calculator-landing":
        return <CalculatorLanding content={props.content} locale={props.locale} />;
      case "commercial-hub":
      case "commercial-page":
        return <CommercialTopicPage content={props.content} locale={props.locale} route={props.route} />;
      case "knowledge-root":
      case "knowledge-hub":
        return <KnowledgeHub {...props} />;
      case "knowledge-article":
        return <KnowledgeArticle content={props.content} locale={props.locale} />;
      case "policy-page":
        return <PolicyPage content={props.content} locale={props.locale} routes={props.routes} />;
      default:
        return <GenericContentPage content={props.content} locale={props.locale} />;
    }
  })();

  const currentPath = props.locale === "en" ? `/en${props.route.path}` : props.route.path;

  return (
    <div className="public-content">
      <SiteHeader locale={props.locale} currentPath={currentPath} />
      {template}
      <SiteFooter locale={props.locale} />
      <StructuredData content={props.content} route={props.route} />
    </div>
  );
}
