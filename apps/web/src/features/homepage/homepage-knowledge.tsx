import Link from "next/link";
import { useTranslations } from "next-intl";

import { ArtifactImage } from "../../components/artifact-image";
import { imagePath, localizedPath } from "./homepage-utilities";

type HomepageKnowledgeProps = {
  locale: "en" | "vi";
};

export function HomepageKnowledge({ locale }: HomepageKnowledgeProps) {
  const t = useTranslations("common");
  const items = [
    {
      key: "chart",
      image: "cau-truc-la-so-tu-vi-12-cung-la-gi-homepage.webp",
      href: "/kien-thuc/tu-vi/la-so-tu-vi-la-gi",
    },
    {
      key: "create",
      image: "quy-trinh-lap-la-so-tu-vi-tu-lich-phap-homepage.webp",
      href: "/kien-thuc/tu-vi/cach-lap-la-so-tu-vi",
    },
    {
      key: "read",
      image: "cach-doc-moi-lien-he-giua-cac-cung-la-so-tu-vi-homepage.webp",
      href: "/kien-thuc/tu-vi/cach-doc-la-so-tu-vi",
    },
  ] as const;

  return (
    <div className="container">
      <p className="eyebrow">{t("home.knowledge.eyebrow")}</p>
      <h2>{t("home.knowledge.title")}</h2>
      <div className="knowledge-grid">
        {items.map((item) => (
          <Link href={localizedPath(locale, item.href)} key={item.key}>
            <ArtifactImage
              alt={t(`home.knowledge.${item.key}.title`)}
              desktop={imagePath(item.image)}
            />
            <h3>{t(`home.knowledge.${item.key}.title`)}</h3>
            <p>{t(`home.knowledge.${item.key}.copy`)}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
