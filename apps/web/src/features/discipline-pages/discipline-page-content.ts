import type {
  DisciplineKey,
  DisciplinePageContent,
} from "./discipline-page-model";
import { BAT_TU_CONTENT_EN, BAT_TU_CONTENT_VI } from "./content-bat-tu";
import { KINH_DICH_CONTENT_EN, KINH_DICH_CONTENT_VI } from "./content-kinh-dich";
import { CHIEM_TINH_CONTENT_EN, CHIEM_TINH_CONTENT_VI } from "./content-chiem-tinh";
import { THAN_SO_HOC_CONTENT_EN, THAN_SO_HOC_CONTENT_VI } from "./content-than-so-hoc";

export type { DisciplineKey, DisciplinePageContent };

export const DISCIPLINE_KEYS: readonly DisciplineKey[] = [
  "bat-tu",
  "kinh-dich",
  "chiem-tinh",
  "than-so-hoc",
] as const;

const DISCIPLINE_CONTENT_MAP: Record<
  DisciplineKey,
  Record<"vi" | "en", DisciplinePageContent>
> = {
  "bat-tu": {
    vi: BAT_TU_CONTENT_VI,
    en: BAT_TU_CONTENT_EN,
  },
  "kinh-dich": {
    vi: KINH_DICH_CONTENT_VI,
    en: KINH_DICH_CONTENT_EN,
  },
  "chiem-tinh": {
    vi: CHIEM_TINH_CONTENT_VI,
    en: CHIEM_TINH_CONTENT_EN,
  },
  "than-so-hoc": {
    vi: THAN_SO_HOC_CONTENT_VI,
    en: THAN_SO_HOC_CONTENT_EN,
  },
};

export function getDisciplineContent(
  key: DisciplineKey,
  locale: "vi" | "en",
): DisciplinePageContent {
  const byKey = DISCIPLINE_CONTENT_MAP[key];
  if (!byKey) {
    throw new Error(`Unknown discipline key: ${key}`);
  }
  const content = byKey[locale];
  if (!content) {
    throw new Error(`Content not found for discipline "${key}" and locale "${locale}"`);
  }
  return content;
}