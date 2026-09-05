import type { Metadata } from "next";

import { AccountDashboard } from "../../../features/account/account-dashboard";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function AccountPage({
  params,
}: {
  params: Promise<{ locale: "en" | "vi" }>;
}) {
  const { locale } = await params;
  return <AccountDashboard locale={locale} />;
}
