import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { resolveVerifiedAccountActor } from "../../../auth/resolve-current-actor";
import {
  loadAccountLibrary,
  loadOrderHistory,
} from "../../../features/account/account-data-loader";
import { loadAccountOverview } from "../../../features/account/account-center-data";
import { AccountDashboard } from "../../../features/account/account-dashboard";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

function localizedSignInPath(locale: "vi" | "en", callbackURL: string): string {
  const prefix = locale === "en" ? "/en" : "";
  return `${prefix}/dang-nhap?callbackURL=${encodeURIComponent(callbackURL)}`;
}

export default async function AccountPage({
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
    const currentPath = routeLocale === "en" ? "/en/tai-khoan" : "/tai-khoan";
    redirect(localizedSignInPath(routeLocale, currentPath));
  }

  const [libraryResult, ordersResult, overviewResult] = await Promise.all([
    loadAccountLibrary(actor),
    loadOrderHistory(actor),
    loadAccountOverview(actor),
  ]);

  let errorMessage: string | undefined;
  if (!libraryResult.ok && !ordersResult.ok && !overviewResult.ok) {
    errorMessage =
      routeLocale === "vi"
        ? "Dịch vụ tài khoản tạm thời không khả dụng. Vui lòng thử lại sau."
        : "Account service is temporarily unavailable. Please try again later.";
  } else if (!libraryResult.ok && !ordersResult.ok) {
    errorMessage =
      routeLocale === "vi"
        ? "Dịch vụ tài khoản tạm thời không khả dụng. Vui lòng thử lại sau."
        : "Account service is temporarily unavailable. Please try again later.";
  } else if (!libraryResult.ok) {
    errorMessage =
      routeLocale === "vi"
        ? "Không thể tải danh sách báo cáo. Vui lòng thử lại sau."
        : "Unable to load reports. Please try again later.";
  } else if (!ordersResult.ok) {
    errorMessage =
      routeLocale === "vi"
        ? "Không thể tải lịch sử đơn hàng. Vui lòng thử lại sau."
        : "Unable to load order history. Please try again later.";
  } else if (!overviewResult.ok) {
    errorMessage =
      routeLocale === "vi"
        ? "Không thể tải tổng quan tài khoản. Vui lòng thử lại sau."
        : "Unable to load account overview. Please try again later.";
  }

  return (
    <AccountDashboard
      locale={routeLocale}
      library={libraryResult.ok ? libraryResult.value : undefined}
      orders={ordersResult.ok ? ordersResult.value : undefined}
      overview={overviewResult.ok ? overviewResult.value : undefined}
      userEmail={overviewResult.ok ? overviewResult.value.account.email : undefined}
      error={errorMessage}
    />
  );
}
