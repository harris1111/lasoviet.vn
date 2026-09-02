import type { Metadata } from "next";

import { ReportReader } from "../../../../features/reports/report-reader";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function ReportPage({
  params,
}: {
  params: Promise<{ locale: "en" | "vi"; reportId: string }>;
}) {
  const { locale } = await params;
  return <ReportReader locale={locale} />;
}
