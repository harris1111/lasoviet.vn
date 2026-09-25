export type KnowledgeClusterId = "reading" | "self" | "relations" | "career" | "method";

export type KnowledgeCluster = {
  id: KnowledgeClusterId;
  titleVi: string;
  titleEn: string;
  descriptionVi: string;
  descriptionEn: string;
  articleRouteIds: readonly string[];
};

export const ARTICLE_IMAGE_MAP: Record<string, string> = {
  "knowledge.tu-vi.definition": "/images/lasoviet/cau-truc-la-so-tu-vi-12-cung-la-gi-homepage.webp",
  "knowledge.tu-vi.calculation": "/images/lasoviet/quy-trinh-lap-la-so-tu-vi-tu-lich-phap-homepage.webp",
  "knowledge.tu-vi.reading": "/images/lasoviet/cach-doc-moi-lien-he-giua-cac-cung-la-so-tu-vi-homepage.webp",
  "knowledge.tu-vi.palaces": "/images/lasoviet/an-dinh-la-so-tu-vi-12-cung-homepage.webp",
  "knowledge.tu-vi.stars": "/images/lasoviet/la-so-mien-phi-ba-diem-noi-bat-co-can-cu-homepage.webp",
  "knowledge.tu-vi.foundations": "/images/lasoviet/lich-phap-can-chi-quy-doi-du-lieu-sinh-homepage.webp",
  "knowledge.tu-vi.cycles": "/images/lasoviet/tang-thu-chu-de-luan-giai-sau-background-homepage.webp",
  "knowledge.tu-vi.birth-time": "/images/lasoviet/the-dang-ky-noi-sinh-orthogonal-index-cards.webp",
  "knowledge.tu-vi.accuracy": "/images/lasoviet/ve-lasoviet-tu-lieu-co-mo-trang-homepage.webp",
  "knowledge.tu-vi.schools": "/images/lasoviet/frontispiece-bao-cao-luan-giai-tu-vi.webp",
};

export const DEFAULT_KNOWLEDGE_IMAGE = "/images/lasoviet/cau-truc-la-so-tu-vi-12-cung-la-gi-homepage.webp";

export function getArticleImage(routeId: string): string {
  return ARTICLE_IMAGE_MAP[routeId] ?? DEFAULT_KNOWLEDGE_IMAGE;
}

export const KNOWLEDGE_CLUSTERS: readonly KnowledgeCluster[] = [
  {
    id: "reading",
    titleVi: "HỌC ĐỌC LÁ SỐ",
    titleEn: "LEARN TO READ YOUR CHART",
    descriptionVi: "Quy trình an sao, lập lá số và các bước tiếp cận luận giải từ căn bản đến chi tiết.",
    descriptionEn: "Chart construction, star placement, and foundational interpretation techniques.",
    articleRouteIds: [
      "knowledge.tu-vi.definition",
      "knowledge.tu-vi.calculation",
      "knowledge.tu-vi.reading",
    ],
  },
  {
    id: "self",
    titleVi: "HIỂU MÌNH",
    titleEn: "UNDERSTAND YOURSELF",
    descriptionVi: "Khám phá bản mệnh, cấu trúc Mệnh - Thân - Cục và nhận diện năng lực nội tại.",
    descriptionEn: "Discover your life path, core configuration, and inner potential.",
    articleRouteIds: [
      "knowledge.tu-vi.foundations",
      "knowledge.tu-vi.stars",
    ],
  },
  {
    id: "relations",
    titleVi: "QUAN HỆ",
    titleEn: "RELATIONSHIPS",
    descriptionVi: "Tương tác với người thân, cung Phối, Tử, Nô và sự phụ thuộc vào độ chính xác giờ sinh.",
    descriptionEn: "Family, partnerships, and social dynamics across the relational palaces.",
    articleRouteIds: [
      "knowledge.tu-vi.palaces",
      "knowledge.tu-vi.birth-time",
    ],
  },
  {
    id: "career",
    titleVi: "CÔNG VIỆC & VẬN TRÌNH",
    titleEn: "CAREER & CYCLES",
    descriptionVi: "Chu kỳ đại vận, tiểu vận và thời điểm chuyển dịch trong công việc, cuộc sống.",
    descriptionEn: "Major and minor periods, career direction, and transition cycles.",
    articleRouteIds: [
      "knowledge.tu-vi.cycles",
    ],
  },
  {
    id: "method",
    titleVi: "PHƯƠNG PHÁP & CĂN CỨ",
    titleEn: "METHODOLOGY & BOUNDARIES",
    descriptionVi: "Ranh giới dữ liệu, độ chính xác có căn cứ và các trường phái Tử Vi Đẩu Số.",
    descriptionEn: "Calculation boundaries, factual accuracy, and traditional schools.",
    articleRouteIds: [
      "knowledge.tu-vi.accuracy",
      "knowledge.tu-vi.schools",
    ],
  },
];

export const FEATURED_SPOTLIGHT_ARTICLE_ID = "knowledge.tu-vi.definition";
export const SPOTLIGHT_LIST_ARTICLE_IDS = [
  "knowledge.tu-vi.calculation",
  "knowledge.tu-vi.reading",
  "knowledge.tu-vi.foundations",
  "knowledge.tu-vi.accuracy",
] as const;
