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
        <div className="value-ladder-grid">
          <article className="ladder-tier active-tier">
            <span className="tier-tag">{t("home.valueLadder.tier1.tag")}</span>
            <div className="tier-head">
              <h3>{t("home.valueLadder.tier1.title")}</h3>
              <div className="tier-pricing">
                <span className="topic-price">{t("home.valueLadder.tier1.price")}</span>
                <span className="topic-once">{t("home.valueLadder.tier1.once")}</span>
              </div>
            </div>
            <p>{t("home.valueLadder.tier1.copy")}</p>
            <div className="tier-action">
              <Link href={localizedPath(locale, "/luan-giai-tu-vi/tong-quan-ban-menh")}>
                {t("home.valueLadder.tier1.sampleLink")}
              </Link>
            </div>
          </article>

          <article className="ladder-tier planned-tier">
            <div className="tier-tag-row">
              <span className="tier-tag">{t("home.valueLadder.tier2.tag")}</span>
              <span className="badge-planned">{t("home.valueLadder.tier2.status")}</span>
            </div>
            <h3>{t("home.valueLadder.tier2.title")}</h3>
            <p>{t("home.valueLadder.tier2.copy")}</p>
          </article>

          <article className="ladder-tier planned-tier">
            <div className="tier-tag-row">
              <span className="tier-tag">{t("home.valueLadder.tier3.tag")}</span>
              <span className="badge-planned">{t("home.valueLadder.tier3.status")}</span>
            </div>
            <h3>{t("home.valueLadder.tier3.title")}</h3>
            <p>{t("home.valueLadder.tier3.copy")}</p>
          </article>
        </div>
        <p className="ladder-microcopy">{t("home.valueLadder.microcopy")}</p>
      </div>
    </div>
  );
}
