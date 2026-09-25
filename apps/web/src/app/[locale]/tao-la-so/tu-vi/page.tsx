import { getLocale, getTranslations } from "next-intl/server";

import { Icon } from "../../../../components/icon";
import { BirthProfileForm } from "../../../../features/birth-profile/birth-profile-form";
import { submitBirthProfile } from "../../../../features/birth-profile/birth-profile-actions";
import { calculateZiweiChart } from "../../../../features/ziwei/calculate-ziwei-chart-action";

type ZiweiBirthProfilePageProps = {
  searchParams?: Promise<{ from?: string }>;
};

export default async function ZiweiBirthProfilePage(props: ZiweiBirthProfilePageProps) {
  const locale = (await getLocale()) as "en" | "vi";
  const t = await getTranslations("profile");
  const referenceYear = new Date().getFullYear();
  const searchParams = props.searchParams ? await props.searchParams : undefined;
  return (
    <main className="wizard-page" data-light-ready>
      <div className="wizard-privacy">
        <Icon name="shield-lock" />
        {t("nav.privacy")}
      </div>
      <BirthProfileForm
        calculateZiweiChart={calculateZiweiChart}
        fromSource={searchParams?.from}
        locale={locale}
        referenceYear={referenceYear}
        submitBirthProfile={submitBirthProfile}
      />
    </main>
  );
}
