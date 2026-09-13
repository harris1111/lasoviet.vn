import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import React from "react";

import { resolveVerifiedAccountActor } from "../../../../auth/resolve-current-actor";
import {
  buildAccountSignInRedirect,
  loadAccountPrivacy,
} from "../../../../features/account/account-center-data";
import {
  cancelAccountDeletionAction,
  requestAccountDeletionAction,
} from "../../../../features/account/account-center-actions";
import {
  AccountPageShell,
  formatHoChiMinhDateTime,
} from "../../../../features/account/account-page-shell";
import {
  AccountDeletionForm,
  CancelDeletionButton,
} from "../../../../features/account/account-actions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function AccountPrivacyPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (locale !== "vi" && locale !== "en") {
    notFound();
  }

  const routeLocale = locale as "vi" | "en";
  const isEn = routeLocale === "en";
  const isVi = !isEn;
  const prefix = isEn ? "/en" : "";

  let actor;
  try {
    actor = await resolveVerifiedAccountActor();
  } catch {
    actor = null;
  }

  if (!actor) {
    const currentPath = `${prefix}/tai-khoan/quyen-rieng-tu`;
    redirect(buildAccountSignInRedirect(routeLocale, currentPath));
  }

  const result = await loadAccountPrivacy(actor);

  if (!result.ok) {
    const errorMessage = isVi
      ? "Dịch vụ quyền riêng tư tạm thời không khả dụng. Vui lòng thử lại sau."
      : "Privacy service is temporarily unavailable. Please try again later.";
    return (
      <AccountPageShell activeTab="privacy" locale={routeLocale}>
        <div role="alert" className="account-error-banner">
          {errorMessage}
        </div>
      </AccountPageShell>
    );
  }

  const { consents, deletionRequest } = result.value;

  return (
    <AccountPageShell activeTab="privacy" locale={routeLocale}>
      <div className="account-section">
        <h1 className="account-section-title">
          {isVi ? "Quyền riêng tư dữ liệu" : "Data privacy"}
        </h1>
        <p className="account-section-desc">
          {isVi
            ? "Mỗi mục đích dùng dữ liệu có công tắc riêng. Dữ liệu chỉ được truy cập khi có sự uỷ quyền của chính bạn."
            : "Each data purpose has separate controls. Data access remains owner-authorized."}
        </p>
        <p style={{ marginTop: "8px", fontSize: "13px", color: "var(--pearl-400)" }}>
          {isVi
            ? "Trạng thái đồng ý được ghi nhận từ lần chấp thuận gần nhất và hiển thị dạng chỉ đọc."
            : "Consent records are recorded from your latest agreements and displayed as read-only."}
        </p>

        <div className="account-rows-list" style={{ marginTop: "24px" }}>
          {consents.map((c) => {
            const purposeLabel =
              c.purpose === "birth_profile"
                ? isVi
                  ? "Xử lý hồ sơ lá số"
                  : "Birth profile processing"
                : c.purpose;
            const grantedDate = formatHoChiMinhDateTime(c.grantedAt, routeLocale);
            const docInfo = isVi
              ? `Tài liệu: ${c.documentKey} (${c.documentVersion}) · Đồng ý ngày ${grantedDate}`
              : `Document: ${c.documentKey} (${c.documentVersion}) · Granted on ${grantedDate}`;

            return (
              <div
                key={`${c.documentKey}-${c.purpose}`}
                className="account-row-card"
                style={{ padding: "18px 24px" }}
              >
                <div>
                  <h3 className="account-row-title">{purposeLabel}</h3>
                  <div className="account-row-meta" style={{ marginTop: "4px" }}>
                    <span>{docInfo}</span>
                  </div>
                </div>
                <div>
                  <span
                    className={`account-status-badge ${
                      c.active ? "account-badge-success" : "account-badge-muted"
                    }`}
                  >
                    {c.active
                      ? isVi ? "Đang bật" : "Active"
                      : isVi ? "Đã thu hồi" : "Revoked"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="account-section">
        <h2 className="account-section-title">
          {isVi ? "Dữ liệu & Xoá tài khoản" : "Your Data & Account Deletion"}
        </h2>
        <div
          style={{
            marginTop: "24px",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: "20px",
          }}
        >
          <div className="account-stat-item" style={{ gap: "12px", padding: "24px" }}>
            <h3 className="account-row-title" style={{ fontSize: "18px" }}>
              {isVi ? "Dữ liệu của bạn" : "Your data"}
            </h3>
            <p className="account-text-muted" style={{ lineHeight: 1.5 }}>
              {isVi
                ? "Tải toàn bộ hồ sơ lá số, báo cáo đã mua và thông tin tài khoản dưới dạng một file JSON."
                : "Download your birth profiles, purchased reports, and account data as a JSON file."}
            </p>
            <div style={{ marginTop: "12px" }}>
              <a
                href="/api/account/export"
                className="button button-secondary button-small"
                download
              >
                {isVi ? "Xuất dữ liệu (.json)" : "Export data (.json)"}
              </a>
            </div>
          </div>

          <div className="account-stat-item" style={{ gap: "12px", padding: "24px" }}>
            <h3 className="account-row-title" style={{ fontSize: "18px" }}>
              {isVi ? "Xoá dữ liệu của bạn" : "Delete your data"}
            </h3>
            <p className="account-text-muted" style={{ lineHeight: 1.5 }}>
              {isVi
                ? "Yêu cầu xoá tài khoản, lá số đã lưu và báo cáo. Xem chi tiết quy trình xoá bên dưới."
                : "Request deletion of your account, saved charts, and reports. Details below."}
            </p>
            <div style={{ marginTop: "12px" }}>
              {deletionRequest && deletionRequest.status === "requested" ? (
                <div>
                  <div
                    style={{
                      marginBottom: "12px",
                      fontSize: "13px",
                      color: "var(--gold-400)",
                    }}
                  >
                    {isVi
                      ? `Tài khoản đang trong thời gian chờ xoá (hạn khôi phục: ${formatHoChiMinhDateTime(
                          deletionRequest.recoverUntil,
                          routeLocale,
                        )}). Bạn có thể huỷ yêu cầu bất cứ lúc nào trước thời hạn này.`
                      : `Account deletion is requested (recovery deadline: ${formatHoChiMinhDateTime(
                          deletionRequest.recoverUntil,
                          routeLocale,
                        )}). You may cancel this request at any time before the deadline.`}
                  </div>
                  <CancelDeletionButton
                    action={cancelAccountDeletionAction.bind(null, routeLocale)}
                    locale={routeLocale}
                    label={isVi ? "Huỷ yêu cầu xoá dữ liệu" : "Cancel deletion request"}
                    cancellingText={isVi ? "Đang huỷ..." : "Cancelling..."}
                  />
                </div>
              ) : (
                <AccountDeletionForm
                  action={requestAccountDeletionAction.bind(null, routeLocale)}
                  locale={routeLocale}
                  buttonLabel={isVi ? "Yêu cầu xoá dữ liệu" : "Request data deletion"}
                  modalTitle={
                    isVi
                      ? "Xác nhận yêu cầu xoá tài khoản"
                      : "Confirm account deletion request"
                  }
                  modalDesc={
                    isVi
                      ? "Bạn sắp yêu cầu xoá toàn bộ hồ sơ lá số và báo cáo. Hành động này không thể hoàn tác sau khi hoàn tất thời gian khôi phục."
                      : "You are requesting deletion of your account and all data. This action is irreversible once the recovery window expires."
                  }
                  ackText={
                    isVi
                      ? "Tôi hiểu dữ liệu giao dịch kế toán liên quan vẫn được lưu trữ độc lập theo nghĩa vụ pháp lý."
                      : "I understand financial transaction records are preserved separately under statutory accounting obligations."
                  }
                  confirmText={isVi ? "Xác nhận" : "Confirm"}
                  cancelText={isVi ? "Huỷ" : "Cancel"}
                  requestingText={isVi ? "Đang yêu cầu..." : "Requesting..."}
                />
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="account-section">
        <h2 className="account-section-title">
          {isVi ? "Link đã chia sẻ" : "Shared links"}
        </h2>
        <p className="account-section-desc">
          {isVi
            ? "Link xem lá số bạn đã chia sẻ. Mặc định ẩn thông tin cá nhân khi xem qua link chia sẻ."
            : "Shared chart links. Personal birth details are hidden by default."}
        </p>
        <p className="account-text-muted" style={{ marginTop: "16px" }}>
          {isVi ? "Bạn chưa chia sẻ link nào." : "You haven't shared any links yet."}
        </p>
      </div>

      <div className="account-section">
        <h2 className="account-section-title">
          {isVi ? "Quy trình xoá dữ liệu" : "Data Deletion Process"}
        </h2>
        <div className="account-table-wrapper" style={{ marginTop: "24px" }}>
          <table className="account-table">
            <tbody>
              <tr>
                <th style={{ width: "240px" }}>
                  {isVi ? "Thời gian khôi phục 30 ngày" : "30-Day Recovery Window"}
                </th>
                <td>
                  {isVi
                    ? "Tài khoản có 30 ngày để đăng nhập lại và huỷ yêu cầu xoá trước khi dữ liệu vòng đời bị thanh lọc vĩnh viễn."
                    : "Your account enters a 30-day recovery window during which you can sign in and cancel the deletion request before lifecycle data is permanently purged."}
                </td>
              </tr>
              <tr>
                <th>
                  {isVi ? "Thanh lọc sau 30 ngày" : "Purged After 30 Days"}
                </th>
                <td>
                  {isVi
                    ? "Hồ sơ lá số, bản hiệu chỉnh, lá số tính toán và báo cáo gắn liền với tài khoản sẽ bị thanh lọc vĩnh viễn sau thời gian khôi phục."
                    : "Birth profiles, revisions, calculated charts, and account-linked reports will be permanently purged after the recovery window expires."}
                </td>
              </tr>
              <tr>
                <th>
                  {isVi ? "Dữ liệu kế toán bắt buộc" : "Retained Accounting Records"}
                </th>
                <td>
                  {isVi
                    ? "Hoá đơn và thông tin giao dịch thanh toán được lưu trữ theo quy định chứng từ kế toán, tách biệt hoàn toàn khỏi hồ sơ lá số đã thanh lọc."
                    : "Order invoices and payment transaction records are preserved separately for statutory accounting compliance as required by law, detached from purged birth profiles."}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </AccountPageShell>
  );
}
