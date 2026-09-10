import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { resolveVerifiedAccountActor } from "../../../../auth/resolve-current-actor";
import { loadAccountLibrary } from "../../../../features/account/account-data-loader";
import { AccountLibrary } from "../../../../features/account/account-library";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

function localizedSignInPath(locale: "vi" | "en", callbackURL: string): string {
  const prefix = locale === "en" ? "/en" : "";
  return `${prefix}/dang-nhap?callbackURL=${encodeURIComponent(callbackURL)}`;
}

export default async function AccountReportsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (locale !== "vi" && locale !== "en") {
    notFound();
  }

  const routeLocale = locale as "vi" | "en";
  let actor;
  try {
    actor = await resolveVerifiedAccountActor();
  } catch {
    actor = null;
  }

  if (!actor) {
    const currentPath =
      routeLocale === "en" ? "/en/tai-khoan/bao-cao" : "/tai-khoan/bao-cao";
    redirect(localizedSignInPath(routeLocale, currentPath));
  }

  const result = await loadAccountLibrary(actor);
  if (!result.ok) {
    const error =
      routeLocale === "vi"
        ? "Dịch vụ báo cáo tạm thời không khả dụng. Vui lòng thử lại sau."
        : "Report service is temporarily unavailable. Please try again later.";
    return <AccountLibrary locale={routeLocale} error={error} />;
  }

  return <AccountLibrary locale={routeLocale} library={result.value} />;
}
