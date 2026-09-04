import Link from "next/link";
import { useTranslations } from "next-intl";

import { ArtifactImage } from "../../components/artifact-image";
import { imagePath, localizedPath } from "./homepage-utilities";

type HomepageHeroProps = {
  locale: "en" | "vi";
};

export function HomepageHero({ locale }: HomepageHeroProps) {
  const t = useTranslations("common");

  return (
    <div className="hero-inner">
      <ArtifactImage
        alt=""
        className="hero-image"
        desktop={imagePath("menh-thu-khai-quang-hero-lasoviet-desktop.webp")}
        mobile={imagePath("menh-thu-khai-quang-hero-lasoviet-mobile.webp")}
      />
      <div className="container hero-content">
        <p className="eyebrow">{t("home.hero.eyebrow")}</p>
        <h1>
          {t("app.taglinePrefix")}
          <br />
          <span className="gold-text">{t("app.taglineHighlight")}</span>
        </h1>
        <p className="hero-lead">{t("home.hero.lead")}</p>
        <p className="hero-copy">{t("home.hero.copy")}</p>
        <div className="birth-cta">
          <Link className="button" href={localizedPath(locale, "/tao-la-so/tu-vi")}>
            {t("home.hero.ctaPrimary")}
          </Link>
          <Link className="button button-secondary" href="#luan-giai">
            {t("home.hero.ctaSecondary")}
          </Link>
          <p className="birth-note">{t("home.hero.microcopy")}</p>
        </div>
      </div>
    </div>
  );
}
