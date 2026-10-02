import { TOPIC_PALACE_SCOPES, ZIWEI_TOPIC_SKU_MAP, type TopConcernV1, type ZiweiTopicDeepDiveId } from "@lasoviet/contracts";
import type { ZiweiPresentationLocale } from "./ziwei-presentation";

export const FREE_RESULT_TOPIC_IDS = ["career_wealth", "relationship_marriage"] as const;
export type FreeResultTopic = {
  id: ZiweiTopicDeepDiveId;
  sku: (typeof ZIWEI_TOPIC_SKU_MAP)[ZiweiTopicDeepDiveId];
  title: string;
  question: string;
  primaryPalaces: readonly string[];
  supportingPalaces: readonly string[];
  sourceKind: "structural";
  state: "locked";
};

export function buildFreeResultTopics(locale: ZiweiPresentationLocale, concern?: TopConcernV1): FreeResultTopic[] {
  const ids: readonly ZiweiTopicDeepDiveId[] = concern === "love"
    ? ["relationship_marriage", "career_wealth"] : FREE_RESULT_TOPIC_IDS;
  return ids.map((id) => ({
    id, sku: ZIWEI_TOPIC_SKU_MAP[id], ...TOPIC_PALACE_SCOPES[id],
    sourceKind: "structural", state: "locked",
    title: id === "career_wealth"
      ? (locale === "vi" ? "Công việc và tài lộc" : "Work and finances")
      : (locale === "vi" ? "Tình duyên và hôn nhân" : "Relationships and marriage"),
    question: id === "career_wealth"
      ? (locale === "vi" ? "Quan Lộc và Tài Bạch cùng nói gì về cách bạn làm việc và sử dụng nguồn lực?" : "How do Career and Wealth together describe your approach to work and resources?")
      : (locale === "vi" ? "Cung Phu Thê liên hệ với Mệnh và Phúc Đức như thế nào trong chuyện gắn bó?" : "How does Spouse relate to Life and Fortune in questions of partnership?"),
  }));
}
