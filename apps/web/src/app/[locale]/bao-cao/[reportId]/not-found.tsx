import { getTranslations } from "next-intl/server";

// Keep the localized layout and approved refund notice mounted when access ends.
// Missing, foreign and revoked reports retain the same uniform 404 response.
export default async function ReportNotFound() {
  const t = await getTranslations("reports");
  return <main className="report-reader"><h1>{t("report_not_found")}</h1></main>;
}
