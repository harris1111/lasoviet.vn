import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { resolveVerifiedAccountActor } from "../../../../auth/resolve-current-actor";
import { loadOrderHistory } from "../../../../features/account/account-data-loader";
import { OrderHistory } from "../../../../features/account/order-history";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

function localizedSignInPath(locale: "vi" | "en", callbackURL: string): string {
  const prefix = locale === "en" ? "/en" : "";
  return `${prefix}/dang-nhap?callbackURL=${encodeURIComponent(callbackURL)}`;
}

export default async function AccountOrdersPage({
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
      routeLocale === "en" ? "/en/tai-khoan/don-hang" : "/tai-khoan/don-hang";
    redirect(localizedSignInPath(routeLocale, currentPath));
  }

  const result = await loadOrderHistory(actor);
  if (!result.ok) {
    const error =
      routeLocale === "vi"
        ? "Dịch vụ đơn hàng tạm thời không khả dụng. Vui lòng thử lại sau."
        : "Order history service is temporarily unavailable. Please try again later.";
    return <OrderHistory locale={routeLocale} error={error} />;
  }

  return <OrderHistory locale={routeLocale} orders={result.value} />;
}
