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

export type FreeToolKey =
  | "good-days"
  | "zodiac"
  | "feng-shui"
  | "dream-symbols"
  | "tarot"
  | "lunar-calendar"
  | "palmistry";

export type ToolStatusKind = "preview" | "waiting" | "experimental";

export type ToolCardItem = {
  key: FreeToolKey;
  icon: string;
  color: string;
  status: string;
  statusKind: ToolStatusKind;
  title: string;
  body: string;
  href: string;
  cta: string;
  isFunctional: boolean;
};

export type FreeToolsFaqItem = {
  num: string;
  q: string;
  a: string;
};

export type FreeToolsHubContent = {
  locale: "vi" | "en";
  breadcrumbHome: string;
  breadcrumbCurrent: string;
  eyebrow: string;
  title: string;
  description: string;
  tools: readonly ToolCardItem[];
  principles: {
    heading: string;
    items: readonly string[];
  };
  faqHeading: string;
  faqs: readonly FreeToolsFaqItem[];
  conversion: {
    heading: string;
    body: string;
    buttonText: string;
    buttonHref: string;
  };
};

export type FreeToolsHubPageModel = {
  kind: "hub";
  template: "free-tools-hub";
  slug: string;
  locale: "vi" | "en";
  content: FreeToolsHubContent;
};

export type UtilityPreviewPageModel<T = unknown> = {
  kind: "utility-preview";
  template: "utility-preview";
  toolKey: FreeToolKey;
  slug: string;
  locale: "vi" | "en";
  title: string;
  eyebrow: string;
  description: string;
  isFunctional: boolean;
  preview: PreviewData<T>;
  faqs: readonly FreeToolsFaqItem[];
};

export type GatedPreviewPageModel = {
  kind: "gated-preview";
  template: "gated-preview";
  toolKey: FreeToolKey;
  slug: string;
  locale: "vi" | "en";
  title: string;
  eyebrow: string;
  notice: string;
  subnotice: string;
  ctaText: string;
  ctaHref: string;
  isFunctional: false;
  isAvailable: false;
  gateReason: "waiting_method" | "biometric_consent_prep";
};

export type FreeToolsPageModel =
  | FreeToolsHubPageModel
  | UtilityPreviewPageModel
  | GatedPreviewPageModel;

export type FreeToolsPageContext = {
  route: RouteDefinitionV1;
  locale: "vi" | "en";
};

export interface FreeToolsPageProvider {
  resolve(context: FreeToolsPageContext): FreeToolsPageModel | null;
}
