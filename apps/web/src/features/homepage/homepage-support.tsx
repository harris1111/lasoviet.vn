import { customerContactConfig } from "@lasoviet/config/customer-contact";
import { useTranslations } from "next-intl";

import { SupportCard } from "../../components/ui/support-card";

type HomepageSupportProps = {
  supportEmail?: string;
};

export function HomepageSupport({
  supportEmail = customerContactConfig.email.value,
}: HomepageSupportProps = {}) {
  const t = useTranslations("common");

  return (
    <SupportCard
      actionLabel={t("home.support.action")}
      description={t("home.support.description")}
      email={supportEmail}
      title={t("home.support.title")}
    />
  );
}
