import Link from "next/link";
import { useTranslations } from "next-intl";

import { ArtifactImage } from "../../components/artifact-image";
import { imagePath } from "./homepage-utilities";

export function HomepageFreeValue() {
  const t = useTranslations("common");
  const items = ["item1", "item2", "item3"] as const;
  const insights = [1, 2, 3] as const;

  return (
    <div className="container free-value-section">
      <div className="section-heading">
        <p className="eyebrow">{t("home.freeValue.eyebrow")}</p>
        <h2>{t("home.freeValue.title")}</h2>
        <p className="section-lead">{t("home.freeValue.lead")}</p>
      </div>
      <div className="free-value-cards">
        {items.map((key, index) => (
          <article className="free-value-card" key={key}>
            <span className="card-number">{String(index + 1).padStart(2, "0")}</span>
            <h3>{t(`home.freeValue.${key}.title`)}</h3>
            <p>{t(`home.freeValue.${key}.copy`)}</p>
          </article>
        ))}
      </div>
      <div className="free-preview">
        <ArtifactImage
          alt={t("home.freeValue.imageAlt")}
          className="free-image"
          desktop={imagePath("la-so-mien-phi-ba-diem-noi-bat-co-can-cu-homepage.webp")}
        />
        <div className="insights">
          {insights.map((number) => (
            <article className="insight" key={number}>
              <p className="eyebrow">
                {t("home.freeValue.note")} {String(number).padStart(2, "0")}
              </p>
              <h3>{t(`home.freeValue.insight${number}.title`)}</h3>
              <p>{t(`home.freeValue.insight${number}.copy`)}</p>
              <Link className="text-link" href="#can-cu">
                <span aria-hidden="true" className="seal"><span /></span>
                {t("home.evidence.action")}
              </Link>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}
