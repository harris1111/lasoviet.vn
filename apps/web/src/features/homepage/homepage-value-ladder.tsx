import Link from "next/link";
import { useTranslations } from "next-intl";

import { ArtifactImage } from "../../components/artifact-image";
import { imagePath, localizedPath } from "./homepage-utilities";

type HomepageValueLadderProps = {
  locale: "en" | "vi";
};

export function HomepageValueLadder({ locale }: HomepageValueLadderProps) {
  const t = useTranslations("common");

  return (
    <div className="section-overlay-wrap">
      <ArtifactImage
        alt=""
        className="hero-image"
        desktop={imagePath("tang-thu-chu-de-luan-giai-sau-background-homepage.webp")}
      />
      <div className="container section-overlay">
        <div className="section-heading">
          <p className="eyebrow">{t("home.valueLadder.eyebrow")}</p>
          <h2>{t("home.valueLadder.title")}</h2>
        </div>
        <div className="value-ladder-copy">
          <p>{t("home.valueLadder.bodyIntro")}</p>
          <p>{t("home.valueLadder.bodyOffer")}</p>
          <p className="value-ladder-method-note">{t("home.valueLadder.methodNote")}</p>
        </div>
        <div className="value-ladder-action">
          <Link className="button" href={localizedPath(locale, "/bao-cao-mau/tu-vi")}>
            {t("home.valueLadder.cta")}
          </Link>
        </div>
      </div>
    </div>
  );
}
