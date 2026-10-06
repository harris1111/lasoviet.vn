"use client";

import React from "react";
import Link from "next/link";

export type Guest24hDeletionBannerProps = {
  locale: "vi" | "en";
  signInHref: string;
};

export function Guest24hDeletionBanner({
  locale,
  signInHref,
}: Guest24hDeletionBannerProps) {
  const isEn = locale === "en";

  return (
    <aside
      aria-label={isEn ? "Guest chart expiration notice" : "Thông báo thời hạn lưu lá số khách"}
      className="guest-24h-deletion-banner container"
      role="status"
    >
      <div className="guest-banner-inner">
        <div className="guest-banner-badge" aria-hidden="true">
          24H
        </div>
        <div className="guest-banner-content">
          <strong className="guest-banner-title">
            {isEn
              ? "Save your chart to keep reading"
              : "Lưu lá số để đọc tiếp"}
          </strong>
          <p className="guest-banner-text">
            {isEn
              ? "Guest data is deleted within 24 hours. Sign in to save your chart to your account; eligible verified accounts receive 60 welcome Lá once."
              : "Dữ liệu khách tự động xóa trong 24 giờ. Đăng nhập để lưu lá số vào tài khoản; tài khoản đủ điều kiện được xác minh nhận một lần 60 Lá chào mừng."}
          </p>
        </div>
        <div className="guest-banner-action">
          <Link
            className="button button-small button-pill guest-banner-cta"
            href={signInHref}
          >
            {isEn ? "Save chart now" : "Lưu lá số ngay"}
          </Link>
        </div>
      </div>
    </aside>
  );
}
