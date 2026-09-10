import type { OrderHistoryV1 } from "@lasoviet/contracts";
import Link from "next/link";
import React from "react";

import {
  AccountPageShell,
  formatHoChiMinhDateTime,
  formatVndAmount,
  localizeOrderStatus,
} from "./account-page-shell";

export interface OrderHistoryProps {
  locale: "vi" | "en";
  orders?: OrderHistoryV1 | null;
  history?: OrderHistoryV1 | null;
  error?: string | null;
}

export function OrderHistory({
  locale,
  orders,
  history,
  error,
}: OrderHistoryProps) {
  const isVi = locale === "vi";
  const createChartPath = isVi ? "/tao-la-so/tu-vi" : "/en/tao-la-so/tu-vi";

  const orderData = orders ?? history;
  const orderList = orderData?.orders ?? orderData?.items ?? [];
  const isUnavailable = Boolean(error && !orderData);
  const isEmpty = !isUnavailable && (!orderData || orderList.length === 0);

  return (
    <AccountPageShell activeTab="orders" locale={locale}>
      {isUnavailable ? (
        <section className="account-unavailable-state" role="alert">
          <h2>
            {isVi
              ? "Chưa thể tải lịch sử đơn hàng"
              : "Order history is temporarily unavailable"}
          </h2>
          <p>{error}</p>
        </section>
      ) : isEmpty ? (
        <section className="account-empty-state">
          <h2>{isVi ? "Chưa có đơn hàng nào" : "No orders yet"}</h2>
          <p>
            {isVi
              ? "Bạn chưa có đơn hàng nào. Hãy lập lá số Tử Vi để bắt đầu khám phá."
              : "You have no orders yet. Create your Zi Wei chart to get started."}
          </p>
          <Link href={createChartPath} className="button button-primary">
            {isVi ? "Lập lá số Tử Vi" : "Create Zi Wei chart"}
          </Link>
        </section>
      ) : (
        <div className="account-orders-layout">
          <section
            className="account-section"
            aria-label={isVi ? "Danh sách đơn hàng" : "Order list"}
          >
            <div className="account-section-header">
              <h2 className="account-section-title">
                {isVi ? "Lịch sử đơn hàng" : "Order history"}
              </h2>
            </div>
            <div className="account-rows-list">
              {orderList.map((order, orderIndex) => {
                const profileDisplayName = order.profileDisplayName?.trim();
                const profileName =
                  profileDisplayName ||
                  (isVi ? "Hồ sơ cá nhân" : "Personal profile");
                const title = order.productTitle || order.productName;
                const dateStr = formatHoChiMinhDateTime(
                  order.paidAt || order.createdAt,
                  locale,
                );
                const statusText = localizeOrderStatus(
                  order.status || order.orderStatus,
                  locale,
                );
                const formattedAmount = formatVndAmount(order.amount);

                return (
                  <article
                    key={order.invoiceNumber || orderIndex}
                    className="account-row-card"
                  >
                    <div className="account-row-content">
                      <div className="account-row-header-meta">
                        <span className="account-order-code">
                          {order.invoiceNumber}
                        </span>
                        <span className="account-row-profile">
                          {profileName}
                        </span>
                      </div>
                      <h3 className="account-row-title">{title}</h3>
                      <div className="account-row-meta">
                        <span className="account-amount">
                          {formattedAmount}
                        </span>
                        {dateStr && (
                          <span className="account-meta-date">
                            {dateStr}
                          </span>
                        )}
                        <span className="account-status-badge">
                          {statusText}
                        </span>
                      </div>
                    </div>
                    {(order.readUrl || order.supportUrl) && (
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
                    )}
                  </article>
                );
              })}
            </div>
          </section>
        </div>
      )}
    </AccountPageShell>
  );
}

export default OrderHistory;
