import type { RouteDefinitionV1 } from "@lasoviet/contracts";

export type PreviewData<T = unknown> =
  | {
      sourceKind: "illustrative";
      isIllustrative: true;
      disclosure: string;
      data: T;
    }
  | {
      sourceKind: "backend";
      isIllustrative: false;
      provenance: string;
      data: T;
    };

export type DisciplineKey =
  | "bat-tu"
  | "kinh-dich"
  | "chiem-tinh"
  | "than-so-hoc";

export type DisciplineMethodRow = {
  label: string;
  value: string;
};

export type DisciplineGlossaryItem = {
  term: string;
  body: string;
  icon?: string;
};

export type DisciplineFreeItem = {
  num: string;
  title: string;
  body: string;
  icon?: string;
};

export type DisciplineFaqItem = {
  num: string;
  q: string;
  a: string;
};

export type DisciplineHeroContent = {
  eyebrow: string;
  title: string;
  subtitle: string;
  note: string;
  ctaPrimaryText: string;
  ctaPrimaryHref: string;
  ctaSecondaryText: string;
  ctaSecondaryHref: string;
  previewDisclaimer: string;
  previewBadge: string;
};

export type DisciplinePageContent = {
  key: DisciplineKey;
  locale: "vi" | "en";
  marquee: readonly string[];
  hero: DisciplineHeroContent;
  freeValue: {
    eyebrow: string;
    title: string;
    items: readonly DisciplineFreeItem[];
  };
  sampleResult: {
    eyebrow: string;
    title: string;
    note: string;
    disclosure: string;
    subnote?: string;
  };
  glossary: {
    eyebrow: string;
    title: string;
    items: readonly DisciplineGlossaryItem[];
  };
  method: {
    eyebrow: string;
    title: string;
    note: string;
    rows: readonly DisciplineMethodRow[];
    footnote: string;
  };
  limitations: {
    eyebrow: string;
    title: string;
    items: readonly string[];
  };
  knowledgeFaq: {
    eyebrow: string;
    title: string;
    note: string;
    linkText: string;
    linkHref: string;
    faqHeading: string;
    faqs: readonly DisciplineFaqItem[];
    ctaHeading: string;
    ctaBody: string;
    ctaButtonText: string;
    ctaButtonHref: string;
  };
};

export type DisciplineTheme = {
  accentColor: string;
  accentDeep: string;
  accentTint: string;
  screenLabel: string;
  canvasBg?: string;
  deepBg?: string;
  panelBg?: string;
  borderColor?: string;
};

export type DisciplinePageModel<T = unknown> = {
  key: DisciplineKey;
  slug: string;
  locale: "vi" | "en";
  theme: DisciplineTheme;
  content: DisciplinePageContent;
  preview: PreviewData<T>;
  methodRows: readonly DisciplineMethodRow[];
  limitations: readonly string[];
  faqs: readonly DisciplineFaqItem[];
  glossary: readonly DisciplineGlossaryItem[];
  freeValueItems: readonly DisciplineFreeItem[];
};

export type DisciplinePageContext = {
  route: RouteDefinitionV1;
  locale: "vi" | "en";
};

export interface DisciplinePageProvider {
  resolve(context: DisciplinePageContext): DisciplinePageModel | null;
}
