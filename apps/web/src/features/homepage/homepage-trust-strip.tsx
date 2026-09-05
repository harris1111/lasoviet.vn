import { useTranslations } from "next-intl";

import { Icon } from "../../components/icon";

export function HomepageTrustStrip() {
  const t = useTranslations("common");
  const keys = [
    { key: "item1", icon: "check" },
    { key: "item2", icon: "trien" },
    { key: "item3", icon: "shield-lock" },
    { key: "item4", icon: "refresh-off" },
  ] as const;

  return (
    <div className="container commitments">
      {keys.map((item, index) => (
        <article className="commitment" key={item.key}>
          <div className="commitment-top">
            <Icon name={item.icon} />
            <span>{String(index + 1).padStart(2, "0")}</span>
          </div>
          <h3>{t(`home.trustStrip.${item.key}.title`)}</h3>
          <p>{t(`home.trustStrip.${item.key}.copy`)}</p>
        </article>
      ))}
    </div>
  );
}
