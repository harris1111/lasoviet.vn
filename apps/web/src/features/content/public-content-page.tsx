import { productCatalog } from "@lasoviet/config";
import type { PublicContentV1, RouteDefinitionV1 } from "@lasoviet/contracts";
import { SiteFooter } from "../../components/site-footer";
import { SiteHeader } from "../../components/site-header";
import { buildStructuredData, StructuredDataError } from "../../seo/structured-data";
import { getDisciplinePageProvider } from "../discipline-pages/discipline-page-provider";
import { DisciplinePageShell } from "../discipline-pages/discipline-page-shell";
import { CommercialTopicPage } from "./commercial-topic-page";
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
          <p>{locale === "vi" ? "Nội dung đã được xem xét." : "Reviewed content."}</p>
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

  const template = (() => {
    switch (props.route.template) {
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
      default:
        return <GenericContentPage content={props.content} locale={props.locale} />;
    }
  })();

  return (
    <div className="public-content">
      <SiteHeader locale={props.locale} />
      {template}
      <SiteFooter locale={props.locale} />
      <StructuredData content={props.content} route={props.route} />
    </div>
  );
}
