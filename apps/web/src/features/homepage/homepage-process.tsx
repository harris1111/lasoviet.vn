import { useTranslations } from "next-intl";

import { ArtifactImage } from "../../components/artifact-image";
import { Icon } from "../../components/icon";
import { imagePath } from "./homepage-utilities";

export function HomepageProcess() {
  const t = useTranslations("common");
  const processKeys = ["one", "two", "three"] as const;
  const processImages = [
    "lich-phap-can-chi-quy-doi-du-lieu-sinh-homepage.webp",
    "an-dinh-la-so-tu-vi-12-cung-homepage.webp",
    "chon-chu-de-luan-giai-sau-ho-so-tang-thu-homepage.webp",
  ] as const;

  return (
    <div className="container">
      <p className="eyebrow">{t("home.process.eyebrow")}</p>
      <div className="process">
        {processKeys.map((key, index) => (
          <article className="process-item" key={key}>
            <div className="process-number">{String(index + 1).padStart(2, "0")}</div>
            <div>
              <h3>{t(`home.process.${key}.title`)}</h3>
              <p>{t(`home.process.${key}.copy`)}</p>
              {index === 0 ? (
                <div className="process-meta">
                  <span><Icon name="calendar-day" />{t("home.process.meta.calendar")}</span>
                  <span><Icon name="clock" />{t("home.process.meta.clock")}</span>
                  <span><Icon name="map-pin" />{t("home.process.meta.place")}</span>
                </div>
              ) : null}
            </div>
            <figure className="process-figure">
              <ArtifactImage
                alt={t(`home.process.${key}.title`)}
                desktop={imagePath(processImages[index]!)}
              />
              <figcaption>{t(`home.process.caption${index + 1}`)}</figcaption>
            </figure>
          </article>
        ))}
      </div>
    </div>
  );
}
