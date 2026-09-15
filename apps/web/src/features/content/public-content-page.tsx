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

const INLINE_PATTERN = /\*\*([^*]+)\*\*|`([^`]+)`|\[([^\]]+)\]\(route:([a-zA-Z0-9_.-]+)\)/g;

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
  for (const match of text.matchAll(INLINE_PATTERN)) {
    const index = match.index ?? 0;
    if (index > lastIndex) nodes.push(text.slice(lastIndex, index));
    if (match[1] !== undefined) {
      nodes.push(<strong key={`b-${key++}`}>{match[1]}</strong>);
    } else if (match[2] !== undefined) {
      nodes.push(<code key={`c-${key++}`}>{match[2]}</code>);
    } else {
      const label = match[3] ?? match[0];
      const href = resolveRouteHref(match[4] ?? "", locale, routes);
      nodes.push(href ? <a href={href} key={`l-${key++}`}>{label}</a> : label);
    }
    lastIndex = index + match[0].length;
  }
  if (lastIndex < text.length) nodes.push(text.slice(lastIndex));
  return nodes;
}

type ContentBlock =
  | { kind: "heading"; text: string }
  | { kind: "paragraph"; text: string }
  | { kind: "bullet-list"; items: string[] }
  | { kind: "ordered-list"; items: string[] }
  | { kind: "table"; headers: string[]; rows: string[][] };

const BULLET_PATTERN = /^-\s+/;
const ORDERED_PATTERN = /^\d+\.\s+/;

function parseTableRow(row: string): string[] {
  const trimmed = row.trim().replace(/^\|/, "").replace(/\|$/, "");
  return trimmed.split("|").map((cell) => cell.trim());
}

function isTableSeparatorRow(row: string): boolean {
  return /^\|?[\s:|-]+\|?$/.test(row.trim());
}

function parseBodyBlocks(body: string): ContentBlock[] {
  const lines = body.split("\n");
  const blocks: ContentBlock[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i]?.trim() ?? "";
    if (line.length === 0) {
      i += 1;
      continue;
    }
    if (line.startsWith("## ")) {
      blocks.push({ kind: "heading", text: line.slice(3).trim() });
      i += 1;
      continue;
    }
    if (line.startsWith("|")) {
      const tableLines: string[] = [];
      while (i < lines.length && (lines[i]?.trim() ?? "").startsWith("|")) {
        tableLines.push(lines[i]?.trim() ?? "");
        i += 1;
      }
      const [headerRow, separatorRow, ...bodyRows] = tableLines;
      if (headerRow !== undefined && separatorRow !== undefined && isTableSeparatorRow(separatorRow)) {
        blocks.push({
          kind: "table",
          headers: parseTableRow(headerRow),
          rows: bodyRows.map(parseTableRow),
        });
      }
      continue;
    }
    if (BULLET_PATTERN.test(line)) {
      const items: string[] = [];
      while (i < lines.length && BULLET_PATTERN.test(lines[i]?.trim() ?? "")) {
        items.push((lines[i]?.trim() ?? "").replace(BULLET_PATTERN, ""));
        i += 1;
      }
      blocks.push({ kind: "bullet-list", items });
      continue;
    }
    if (ORDERED_PATTERN.test(line)) {
      const items: string[] = [];
      while (i < lines.length && ORDERED_PATTERN.test(lines[i]?.trim() ?? "")) {
        items.push((lines[i]?.trim() ?? "").replace(ORDERED_PATTERN, ""));
        i += 1;
      }
      blocks.push({ kind: "ordered-list", items });
      continue;
    }
    const paragraphLines: string[] = [];
    while (
      i < lines.length &&
      (lines[i]?.trim() ?? "").length > 0 &&
      !(lines[i]?.trim() ?? "").startsWith("## ") &&
      !(lines[i]?.trim() ?? "").startsWith("|") &&
      !BULLET_PATTERN.test(lines[i]?.trim() ?? "") &&
      !ORDERED_PATTERN.test(lines[i]?.trim() ?? "")
    ) {
      paragraphLines.push(lines[i]?.trim() ?? "");
      i += 1;
    }
    blocks.push({ kind: "paragraph", text: paragraphLines.join(" ") });
  }
  return blocks;
}

function renderContentBlocks(
  body: string,
  locale: "en" | "vi",
  routes: readonly RouteDefinitionV1[],
): ReactNode[] {
  return parseBodyBlocks(body).map((block, index) => {
    switch (block.kind) {
      case "heading":
        return <h2 key={`heading-${index}`}>{block.text}</h2>;
      case "paragraph":
        return <p key={`paragraph-${index}`}>{renderInlineText(block.text, locale, routes)}</p>;
      case "bullet-list":
        return (
          <ul key={`ul-${index}`}>
            {block.items.map((item, itemIndex) => (
              <li key={`ul-${index}-${itemIndex}`}>{renderInlineText(item, locale, routes)}</li>
            ))}
          </ul>
        );
      case "ordered-list":
        return (
          <ol key={`ol-${index}`}>
            {block.items.map((item, itemIndex) => (
              <li key={`ol-${index}-${itemIndex}`}>{renderInlineText(item, locale, routes)}</li>
            ))}
          </ol>
        );
      case "table":
        return (
          <table key={`table-${index}`}>
            <thead>
              <tr>
                {block.headers.map((header, headerIndex) => (
                  <th key={`th-${index}-${headerIndex}`}>{renderInlineText(header, locale, routes)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row, rowIndex) => (
                <tr key={`tr-${index}-${rowIndex}`}>
                  {row.map((cell, cellIndex) => (
                    <td key={`td-${index}-${rowIndex}-${cellIndex}`}>{renderInlineText(cell, locale, routes)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        );
    }
  });
}

function RichContentPage({
  content,
  locale,
  routes,
  eyebrow,
}: Pick<PublicContentPageProps, "content" | "locale" | "routes"> & { eyebrow: string }) {
  return (
    <main className="content-page">
      <article className="content-article container">
        <p className="eyebrow">{eyebrow}</p>
        <h1>{content.title}</h1>
        <p className="content-summary">{content.summary}</p>
        {renderContentBlocks(content.body ?? "", locale, routes)}
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
        return (
          <RichContentPage
            content={props.content}
            eyebrow={props.locale === "vi" ? "Lá Số Việt" : "La So Viet"}
            locale={props.locale}
            routes={props.routes}
          />
        );
      case "about-page":
        return (
          <RichContentPage
            content={props.content}
            eyebrow={props.locale === "vi" ? "Về chúng tôi" : "About us"}
            locale={props.locale}
            routes={props.routes}
          />
        );
      case "methodology-hub":
        return (
          <RichContentPage
            content={props.content}
            eyebrow={props.locale === "vi" ? "Phương pháp luận" : "Methodology"}
            locale={props.locale}
            routes={props.routes}
          />
        );
      case "methodology-page":
        return (
          <RichContentPage
            content={props.content}
            eyebrow={props.locale === "vi" ? "Phương pháp" : "Methodology"}
            locale={props.locale}
            routes={props.routes}
          />
        );
      case "source-registry":
        return (
          <RichContentPage
            content={props.content}
            eyebrow={props.locale === "vi" ? "Nguồn tri thức" : "Sources"}
            locale={props.locale}
            routes={props.routes}
          />
        );
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
