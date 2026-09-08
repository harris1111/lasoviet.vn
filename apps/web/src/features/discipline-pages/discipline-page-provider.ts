import type {
  DisciplineKey,
  DisciplinePageContext,
  DisciplinePageModel,
  DisciplinePageProvider,
  DisciplineTheme,
  PreviewData,
} from "./discipline-page-model";
import { getDisciplineContent } from "./discipline-page-content";

const DISCIPLINE_THEMES: Record<DisciplineKey, DisciplineTheme> = {
  "bat-tu": {
    accentColor: "#4F7A68",
    accentDeep: "#33463D",
    accentTint: "rgba(79,122,104,0.14)",
    screenLabel: "bat-tu",
  },
  "kinh-dich": {
    accentColor: "#8A7450",
    accentDeep: "#46392A",
    accentTint: "rgba(138,116,80,0.16)",
    screenLabel: "kinh-dich",
  },
  "chiem-tinh": {
    accentColor: "#6E93AC",
    accentDeep: "#2E4356",
    accentTint: "rgba(79,112,138,0.18)",
    screenLabel: "chiem-tinh",
    canvasBg: "#0A121D",
    deepBg: "#0E1826",
    panelBg: "#131F30",
    borderColor: "#253347",
  },
  "than-so-hoc": {
    accentColor: "#7A82A0",
    accentDeep: "#363B4C",
    accentTint: "rgba(89,97,127,0.18)",
    screenLabel: "than-so-hoc",
  },
};

const PATH_TO_KEY: Record<string, DisciplineKey> = {
  "/bat-tu": "bat-tu",
  "/kinh-dich": "kinh-dich",
  "/chiem-tinh": "chiem-tinh",
  "/than-so-hoc": "than-so-hoc",
};

export class StaticDisciplinePageProvider implements DisciplinePageProvider {
  resolve(context: DisciplinePageContext): DisciplinePageModel | null {
    const { route, locale } = context;
    if (route.template !== "discipline-flagship") {
      return null;
    }

    const key = PATH_TO_KEY[route.path];
    if (!key) {
      return null;
    }

    const content = getDisciplineContent(key, locale);
    const theme = DISCIPLINE_THEMES[key];

    const preview: PreviewData = {
      sourceKind: "illustrative",
      isIllustrative: true,
      disclosure: content.sampleResult.disclosure,
      data: {
        disciplineKey: key,
      },
    };

    return {
      key,
      slug: route.path,
      locale,
      theme,
      content,
      preview,
      methodRows: content.method.rows,
      limitations: content.limitations.items,
      faqs: content.knowledgeFaq.faqs,
      glossary: content.glossary.items,
      freeValueItems: content.freeValue.items,
    };
  }
}

let providerInstance: DisciplinePageProvider | null = null;

export function getDisciplinePageProvider(): DisciplinePageProvider {
  if (!providerInstance) {
    providerInstance = new StaticDisciplinePageProvider();
  }
  return providerInstance;
}