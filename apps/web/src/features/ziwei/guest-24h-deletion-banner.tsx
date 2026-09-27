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
              ? "Private chart · automatically deleted after 24 hours"
              : "Lá số riêng tư · tự động xóa sau 24 giờ"}
          </strong>
          <p className="guest-banner-text">
            {isEn
              ? "Guest charts are wiped after 24 hours to protect your privacy. Sign in to keep your chart permanently and reveal insight 2."
              : "Dữ liệu khách tự động xóa sau 24 giờ để bảo vệ quyền riêng tư. Đăng nhập để lưu lá số vĩnh viễn và mở tiếp điều thứ hai."}
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
