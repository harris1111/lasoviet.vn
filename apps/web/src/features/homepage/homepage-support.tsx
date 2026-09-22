import { useTranslations } from "next-intl";

import { SupportCard } from "../../components/ui/support-card";

export function HomepageSupport() {
  const t = useTranslations("common");

  return (
    <SupportCard
      actionLabel={t("home.support.action")}
      description={t("home.support.description")}
      email="support@lasoviet.net"
      title={t("home.support.title")}
    />
  );
}
