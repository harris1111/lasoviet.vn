import { getTranslations } from "next-intl/server";

export default async function Page() {
  const t = await getTranslations("common");

  return (
    <main>
      <h1>{t("app.name")}</h1>
      <p>{t("app.tagline")}</p>
    </main>
  );
}
