import Link from "next/link";
import { useTranslations } from "next-intl";

import { ArtifactImage } from "../../components/artifact-image";
import { Icon } from "../../components/icon";
import { imagePath, localizedPath } from "./homepage-utilities";

type HomepageAboutExcerptProps = {
  locale: "en" | "vi";
};

export function HomepageAboutExcerpt({ locale }: HomepageAboutExcerptProps) {
  const t = useTranslations("common");

  return (
    <div className="container about-excerpt-grid">
      <ArtifactImage
        alt={t("home.aboutExcerpt.imageAlt")}
        className="about-excerpt-image"
        desktop={imagePath("ve-lasoviet-tu-lieu-co-mo-trang-homepage.webp")}
      />
      <div className="about-excerpt-content">
        <p className="eyebrow">{t("home.aboutExcerpt.eyebrow")}</p>
        <blockquote>{t("home.aboutExcerpt.quote")}</blockquote>
        <p>{t("home.aboutExcerpt.support")}</p>
        <Link className="text-link" href={localizedPath(locale, "/ve-la-so-viet")}>
          <span>{t("home.aboutExcerpt.cta")}</span>
          <Icon name="arrow-right" />
        </Link>
      </div>
    </div>
  );
}
