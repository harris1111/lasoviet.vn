import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";

import { UnsubscribeForm } from "../../../../features/notifications/unsubscribe-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("notifications.unsubscribe");
  return {
    title: t("page_title"),
    robots: { index: false, follow: false },
    referrer: "no-referrer",
  };
}

export default async function UnsubscribePage() {
  const rawLocale = await getLocale();
  const locale: "vi" | "en" = rawLocale === "en" ? "en" : "vi";
  const t = await getTranslations("notifications.unsubscribe");

  return (
    <main className="auth-page">
      <div className="auth-page-inner">
        <p className="eyebrow">Lá Số Việt</p>
        <h1>{t("title")}</h1>
        <UnsubscribeForm locale={locale} />
      </div>
    </main>
  );
}
