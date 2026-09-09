import Link from "next/link";
import React from "react";

export type AccountTab = "overview" | "reports" | "orders";

export function formatHoChiMinhDateTime(
  dateStr: string | null | undefined,
  locale: "vi" | "en",
): string {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Ho_Chi_Minh",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).formatToParts(d);

    const find = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
    const day = find("day");
    const month = find("month");
    const year = find("year");
    const hour = find("hour");
    const minute = find("minute");

    if (locale === "vi") {
      return `${hour}:${minute} ${day}/${month}/${year}`;
    }
    return `${year}-${month}-${day} ${hour}:${minute}`;
  } catch {
    return dateStr;
  }
}

export function formatVndAmount(amount: number): string {
  return new Intl.NumberFormat("vi-VN").format(amount) + " ₫";
}

export function localizeOrderStatus(status: string, locale: "vi" | "en"): string {
  switch (status) {
    case "paid":
      return locale === "vi" ? "Đã thanh toán" : "Paid";
    case "pending":
      return locale === "vi" ? "Đang chờ thanh toán" : "Pending payment";
    case "expired":
      return locale === "vi" ? "Hết hạn" : "Expired";
    case "failed":
      return locale === "vi" ? "Thất bại" : "Failed";
    case "refunded":
      return locale === "vi" ? "Đã hoàn tiền" : "Refunded";
    default:
      return locale === "vi" ? "Đang xử lý" : "Processing";
  }
}

export function localizeReportStatus(
  reportStatus: string | null | undefined,
  orderStatus: string | undefined,
  locale: "vi" | "en",
): string {
  if (reportStatus === "ready" || (!reportStatus && orderStatus === "paid")) {
    return locale === "vi" ? "Đã hoàn tất" : "Completed";
  }
  if (reportStatus === "failed" || orderStatus === "failed") {
    return locale === "vi" ? "Thất bại" : "Failed";
  }
  if (orderStatus === "expired") {
    return locale === "vi" ? "Hết hạn" : "Expired";
  }
  if (orderStatus === "refunded") {
    return locale === "vi" ? "Đã hoàn tiền" : "Refunded";
  }
  return locale === "vi" ? "Đang xử lý" : "Processing";
}

export function AccountPageShell({
  activeTab,
  locale,
  children,
}: {
  activeTab: AccountTab;
  locale: "vi" | "en";
  children: React.ReactNode;
}) {
  const isVi = locale === "vi";
  const overviewPath = isVi ? "/tai-khoan" : "/en/tai-khoan";
  const reportsPath = isVi ? "/tai-khoan/bao-cao" : "/en/tai-khoan/bao-cao";
  const ordersPath = isVi ? "/tai-khoan/don-hang" : "/en/tai-khoan/don-hang";

  return (
    <main className="content-page account-desk-page">
      <div className="container">
        <header className="account-shell-header">
          <p className="account-eyebrow">
            {isVi ? "Không gian cá nhân" : "Customer desk"}
          </p>
          <h1 className="account-title">{isVi ? "Tài khoản" : "Account"}</h1>
          <nav
            aria-label={isVi ? "Điều hướng tài khoản" : "Account navigation"}
            className="account-nav-tabs"
          >
            <Link
              href={overviewPath}
              className={`account-tab-link ${activeTab === "overview" ? "active" : ""}`}
              aria-current={activeTab === "overview" ? "page" : undefined}
            >
              {isVi ? "Tổng quan" : "Overview"}
            </Link>
            <Link
              href={reportsPath}
              className={`account-tab-link ${activeTab === "reports" ? "active" : ""}`}
              aria-current={activeTab === "reports" ? "page" : undefined}
            >
              {isVi ? "Báo cáo" : "Reports"}
            </Link>
            <Link
              href={ordersPath}
              className={`account-tab-link ${activeTab === "orders" ? "active" : ""}`}
              aria-current={activeTab === "orders" ? "page" : undefined}
            >
              {isVi ? "Đơn hàng" : "Orders"}
            </Link>
          </nav>
        </header>
        <div className="account-shell-content">{children}</div>
      </div>
    </main>
  );
}
