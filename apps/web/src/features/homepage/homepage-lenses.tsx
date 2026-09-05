import Link from "next/link";
import { useTranslations } from "next-intl";

import { Icon } from "../../components/icon";
import { localizedPath } from "./homepage-utilities";

type HomepageLensesProps = {
  locale: "en" | "vi";
};

export function HomepageLenses({ locale }: HomepageLensesProps) {
  const t = useTranslations("common");

  return (
    <div className="container lenses-section">
      <div className="section-heading">
        <p className="eyebrow">{t("home.lenses.eyebrow")}</p>
        <h2>{t("home.lenses.title")}</h2>
        <p className="section-lead">{t("home.lenses.lead")}</p>
      </div>
      <div className="lenses-grid">
        <article className="lens-card lens-active">
          <div className="lens-icon-wrap">
            <Icon name="star" />
          </div>
          <h3>{t("home.lenses.tuVi.title")}</h3>
          <p className="lens-sub">{t("home.lenses.tuVi.subtitle")}</p>
          <p className="lens-copy">{t("home.lenses.tuVi.copy")}</p>
          <Link className="lens-link" href={localizedPath(locale, "/tao-la-so/tu-vi")}>
            <span>{t("home.lenses.tuVi.action")}</span>
            <Icon name="arrow-right" />
          </Link>
        </article>

        <article className="lens-card lens-disabled">
          <div className="lens-icon-wrap">
            <Icon name="elements" />
          </div>
          <div className="lens-header">
            <h3>{t("home.lenses.batTu.title")}</h3>
            <span className="badge-planned">{t("home.lenses.batTu.status")}</span>
          </div>
          <p className="lens-sub">{t("home.lenses.batTu.subtitle")}</p>
          <p className="lens-copy">{t("home.lenses.batTu.copy")}</p>
          <div className="lens-link-disabled">
            <span>{t("home.lenses.batTu.action")}</span>
            <Icon name="arrow-right" />
          </div>
        </article>

        <article className="lens-card lens-disabled">
          <div className="lens-icon-wrap">
            <Icon name="orbit" />
          </div>
          <div className="lens-header">
            <h3>{t("home.lenses.astrology.title")}</h3>
            <span className="badge-planned">{t("home.lenses.astrology.status")}</span>
          </div>
          <p className="lens-sub">{t("home.lenses.astrology.subtitle")}</p>
          <p className="lens-copy">{t("home.lenses.astrology.copy")}</p>
          <div className="lens-link-disabled">
            <span>{t("home.lenses.astrology.action")}</span>
            <Icon name="arrow-right" />
          </div>
        </article>

        <article className="lens-card lens-disabled">
          <div className="lens-icon-wrap">
            <Icon name="hash" />
          </div>
          <div className="lens-header">
            <h3>{t("home.lenses.numerology.title")}</h3>
            <span className="badge-planned">{t("home.lenses.numerology.status")}</span>
          </div>
          <p className="lens-sub">{t("home.lenses.numerology.subtitle")}</p>
          <p className="lens-copy">{t("home.lenses.numerology.copy")}</p>
          <div className="lens-link-disabled">
            <span>{t("home.lenses.numerology.action")}</span>
            <Icon name="arrow-right" />
          </div>
        </article>
      </div>
    </div>
  );
}
