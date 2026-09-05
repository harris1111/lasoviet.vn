import { getLocale, getTranslations } from "next-intl/server";

import { BirthProfileForm } from "../../../../features/birth-profile/birth-profile-form";
import { submitBirthProfile } from "../../../../features/birth-profile/birth-profile-actions";
import { calculateZiweiChart } from "../../../../features/ziwei/calculate-ziwei-chart-action";

export default async function ZiweiBirthProfilePage() {
  const locale = (await getLocale()) as "en" | "vi";
  const t = await getTranslations("profile");
  return (
    <main className="wizard-page">
      <div className="wizard-privacy">{t("review.privacy")}</div>
      <div className="wizard-shell">
        <p className="wizard-brand">Lá Số Việt</p>
        <BirthProfileForm
          calculateZiweiChart={calculateZiweiChart}
          locale={locale}
          submitBirthProfile={submitBirthProfile}
        />
      </div>
    </main>
  );
}
