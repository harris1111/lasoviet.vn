import type { AccountLibraryV1, OrderHistoryV1 } from "@lasoviet/contracts";
import Link from "next/link";
import React from "react";

import {
  AccountPageShell,
  formatHoChiMinhDateTime,
  formatVndAmount,
  localizeOrderStatus,
  localizeReportStatus,
} from "./account-page-shell";

export interface AccountDashboardProps {
  locale: "vi" | "en";
  library?: AccountLibraryV1 | null;
  orders?: OrderHistoryV1 | null;
  error?: string | null;
}

export function AccountDashboard({
  locale,
  library,
  orders,
  error,
}: AccountDashboardProps) {
  const isVi = locale === "vi";
  const wizardPath = isVi ? "/tao-la-so/tu-vi" : "/en/tao-la-so/tu-vi";
  const reportsPath = isVi ? "/tai-khoan/bao-cao" : "/en/tai-khoan/bao-cao";
  const ordersPath = isVi ? "/tai-khoan/don-hang" : "/en/tai-khoan/don-hang";

  const totalReports = library?.totalCount ?? 0;
  const totalOrders = orders?.totalCount ?? 0;
  const libraryUnavailable = Boolean(error && !library);
  const ordersUnavailable = Boolean(error && !orders);
  const isUnavailable = libraryUnavailable && ordersUnavailable;
  const isEmpty =
    !error &&
    library !== undefined &&
    library !== null &&
    orders !== undefined &&
    orders !== null &&
    totalReports === 0 &&
    totalOrders === 0;
  const latestReadableReport = library?.latestReadableReport ?? null;

  const allLibraryItems =
    library?.items && library.items.length > 0
      ? library.items
      : (library?.groups?.flatMap((g) => g.items) ?? []);
  const recentReports = allLibraryItems.slice(0, 3);

  const allOrders =
    orders?.orders && orders.orders.length > 0
      ? orders.orders
      : (orders?.items ?? []);
  const recentOrders = allOrders.slice(0, 3);

  return (
    <AccountPageShell activeTab="overview" locale={locale}>
      {error && (
        <div role="alert" className="account-error-banner">
          {error}
        </div>
      )}

      {isUnavailable ? (
        <section className="account-unavailable-state">
          <h2>
            {isVi
              ? "Chưa thể tải dữ liệu tài khoản"
              : "Account data is temporarily unavailable"}
          </h2>
          <p>
            {isVi
              ? "Thông tin mua hàng của bạn chưa thể hiển thị lúc này. Vui lòng thử lại sau."
              : "Your purchase information cannot be displayed right now. Please try again later."}
          </p>
        </section>
      ) : isEmpty ? (
        <section className="account-empty-state">
          <h2>
            {isVi
              ? "Chưa có báo cáo hoặc đơn hàng"
              : "No reports or orders yet"}
          </h2>
          <p>
            {isVi
              ? "Bạn chưa có báo cáo luận giải hay giao dịch nào. Hãy lập lá số Tử Vi để bắt đầu khám phá."
              : "You have no reports or purchase history yet. Create your Zi Wei chart to get started."}
          </p>
          <Link href={wizardPath} className="button button-primary">
            {isVi ? "Lập lá số Tử Vi" : "Create Zi Wei chart"}
          </Link>
        </section>
      ) : (
        <div className="account-overview-layout">
          {latestReadableReport && (
            <section
              className="account-section account-latest-section"
              aria-label={isVi ? "Báo cáo gần nhất" : "Latest report"}
            >
              <div className="account-section-header">
                <span className="account-badge-highlight">
                  {isVi ? "Báo cáo gần nhất" : "Latest report"}
                </span>
              </div>
              <div className="account-latest-card">
                <div className="account-latest-info">
                  <span className="account-profile-name">
                    {latestReadableReport.profileDisplayName?.trim() ||
                      (isVi ? "Hồ sơ cá nhân" : "Personal profile")}
                  </span>
                  <h2 className="account-latest-title">
                    {latestReadableReport.productTitle ||
                      latestReadableReport.productName}
                  </h2>
                  <div className="account-latest-meta">
                    <span className="account-meta-date">
                      {formatHoChiMinhDateTime(
                        latestReadableReport.purchasedAt ||
                          latestReadableReport.createdAt,
                        locale,
                      )}
                    </span>
                    <span className="account-status-badge">
                      {localizeReportStatus(
                        latestReadableReport.reportStatus,
                        latestReadableReport.orderStatus,
                        locale,
                      )}
                    </span>
                  </div>
                </div>
                <div className="account-latest-action">
                  {latestReadableReport.readUrl && (
                    <Link
                      href={latestReadableReport.readUrl}
                      className="button button-primary"
                    >
                      {isVi ? "Đọc tiếp" : "Continue reading"}
                    </Link>
                  )}
                </div>
              </div>
            </section>
          )}

          <div className="account-stats-row">
            <div className="account-stat-item">
              <span className="account-stat-label">
                {isVi ? "Tổng số báo cáo" : "Total reports"}
              </span>
              <span className="account-stat-value">
                {libraryUnavailable ? "—" : totalReports}
              </span>
            </div>
            <div className="account-stat-item">
              <span className="account-stat-label">
                {isVi ? "Tổng số đơn hàng" : "Total orders"}
              </span>
              <span className="account-stat-value">
                {ordersUnavailable ? "—" : totalOrders}
              </span>
            </div>
          </div>

          <div className="account-overview-grid">
            <section
              className="account-section"
              aria-label={isVi ? "Báo cáo gần đây" : "Recent reports"}
            >
              <div className="account-section-header">
                <h3 className="account-section-title">
                  {isVi ? "Báo cáo gần đây" : "Recent reports"}
                </h3>
                {totalReports > 0 && (
                  <Link href={reportsPath} className="account-section-link">
                    {isVi ? "Xem tất cả" : "View all"}
                  </Link>
                )}
              </div>
              {libraryUnavailable ? (
                <p className="account-text-muted">
                  {isVi
                    ? "Danh sách báo cáo tạm thời không khả dụng."
                    : "Reports are temporarily unavailable."}
                </p>
              ) : recentReports.length === 0 ? (
                <p className="account-text-muted">
                  {isVi ? "Chưa có báo cáo nào." : "No reports yet."}
                </p>
              ) : (
                <div className="account-rows-list">
                  {recentReports.map((item, itemIndex) => (
                    <article
                      key={item.id || itemIndex}
                      className="account-row-card"
                    >
                      <div className="account-row-content">
                        <span className="account-row-profile">
                          {item.profileDisplayName?.trim() ||
                            (isVi ? "Hồ sơ cá nhân" : "Personal profile")}
                        </span>
                        <h4 className="account-row-title">
                          {item.productTitle || item.productName}
                        </h4>
                        <div className="account-row-meta">
                          <span>
                            {formatHoChiMinhDateTime(
                              item.purchasedAt || item.createdAt,
                              locale,
                            )}
                          </span>
                          <span className="account-status-badge">
                            {localizeReportStatus(
                              item.reportStatus,
                              item.orderStatus,
                              locale,
                            )}
                          </span>
                        </div>
                      </div>
                      {item.readUrl && (
                        <div className="account-row-actions">
                          <Link
                            href={item.readUrl}
                            className="button button-small"
                          >
                            {isVi ? "Đọc báo cáo" : "Read report"}
                          </Link>
                        </div>
                      )}
                    </article>
                  ))}
                </div>
              )}
            </section>

            <section
              className="account-section"
              aria-label={isVi ? "Đơn hàng gần đây" : "Recent orders"}
            >
              <div className="account-section-header">
                <h3 className="account-section-title">
                  {isVi ? "Đơn hàng gần đây" : "Recent orders"}
                </h3>
                {totalOrders > 0 && (
                  <Link href={ordersPath} className="account-section-link">
                    {isVi ? "Xem tất cả" : "View all"}
                  </Link>
                )}
              </div>
              {ordersUnavailable ? (
                <p className="account-text-muted">
                  {isVi
                    ? "Lịch sử đơn hàng tạm thời không khả dụng."
                    : "Order history is temporarily unavailable."}
                </p>
              ) : recentOrders.length === 0 ? (
                <p className="account-text-muted">
                  {isVi ? "Chưa có đơn hàng nào." : "No orders yet."}
                </p>
              ) : (
                <div className="account-rows-list">
                  {recentOrders.map((order, orderIndex) => (
                    <article
                      key={order.invoiceNumber || order.id || orderIndex}
                      className="account-row-card"
                    >
                      <div className="account-row-content">
                        <div className="account-row-header-meta">
                          <span className="account-order-code">
                            {order.invoiceNumber}
                          </span>
                          <span className="account-row-profile">
                            {order.profileDisplayName?.trim() ||
                              (isVi ? "Hồ sơ cá nhân" : "Personal profile")}
                          </span>
                        </div>
                        <h4 className="account-row-title">
                          {order.productTitle || order.productName}
                        </h4>
                        <div className="account-row-meta">
                          <span className="account-amount">
                            {formatVndAmount(order.amount)}
                          </span>
                          <span>
                            {formatHoChiMinhDateTime(
                              order.paidAt || order.createdAt,
                              locale,
                            )}
                          </span>
                          <span className="account-status-badge">
                            {localizeOrderStatus(
                              order.status || order.orderStatus,
                              locale,
                            )}
                          </span>
                        </div>
                      </div>
                      <div className="account-row-actions">
                        {order.readUrl && (
                          <Link
                            href={order.readUrl}
                            className="button button-small"
                          >
                            {isVi ? "Đọc báo cáo" : "Read report"}
                          </Link>
                        )}
                        {order.supportUrl && (
                          <Link
                            href={order.supportUrl}
                            className="button button-secondary button-small"
                          >
                            {isVi ? "Hỗ trợ" : "Support"}
                          </Link>
                        )}
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>
          </div>
        </div>
      )}
    </AccountPageShell>
  );
}

export default AccountDashboard;
