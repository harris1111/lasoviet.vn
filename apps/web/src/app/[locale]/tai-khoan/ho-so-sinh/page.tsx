import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import React from "react";
import type { BirthCalendarInput, BirthTimeInput, BirthTimezoneInput } from "@lasoviet/contracts";

import { resolveVerifiedAccountActor } from "../../../../auth/resolve-current-actor";
import {
  buildAccountSignInRedirect,
  loadAccountProfiles,
} from "../../../../features/account/account-center-data";
import { deleteProfile } from "../../../../features/account/account-center-actions";
import { AccountPageShell } from "../../../../features/account/account-page-shell";
import { ProfileDeleteButton } from "../../../../features/account/account-actions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

function formatCalendar(cal: BirthCalendarInput, isEn: boolean): string {
  if (cal.kind === "solar") {
    return isEn ? `Solar: ${cal.date}` : `Dương lịch: ${cal.date}`;
  }
  return isEn
    ? `Lunar: ${cal.date}${cal.isLeapMonth ? " (leap)" : ""}`
    : `Âm lịch: ${cal.date}${cal.isLeapMonth ? " (nhuận)" : ""}`;
}

function formatTime(time: BirthTimeInput, isEn: boolean): string {
  if (time.precision === "exact_minute") {
    return time.localTime;
  }
  if (time.precision === "branch_only") {
    return isEn ? `Branch ${time.branch}` : `Giờ ${time.branch}`;
  }
  if (time.precision === "range") {
    return `${time.startLocalTime} - ${time.endLocalTime}`;
  }
  return isEn ? "Unknown time" : "Giờ không rõ";
}

function formatTimezone(tz: BirthTimezoneInput): string {
  if ("ianaZone" in tz && tz.ianaZone) return tz.ianaZone;
  if ("offsetMinutes" in tz && typeof tz.offsetMinutes === "number") {
    const h = Math.floor(Math.abs(tz.offsetMinutes) / 60);
    const m = Math.abs(tz.offsetMinutes) % 60;
    const sign = tz.offsetMinutes >= 0 ? "+" : "-";
    return `UTC${sign}${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  }
  return "Asia/Ho_Chi_Minh";
}

export default async function AccountProfilesPage({
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
    const currentPath = `${prefix}/tai-khoan/ho-so-sinh`;
    redirect(buildAccountSignInRedirect(routeLocale, currentPath));
  }

  const result = await loadAccountProfiles(actor);

  if (!result.ok) {
    const errorMessage = isVi
      ? "Dịch vụ hồ sơ tạm thời không khả dụng. Vui lòng thử lại sau."
      : "Birth profiles service is temporarily unavailable. Please try again later.";
    return (
      <AccountPageShell activeTab="profiles" locale={routeLocale}>
        <div role="alert" className="account-error-banner">
          {errorMessage}
        </div>
      </AccountPageShell>
    );
  }

  const profiles = result.value.profiles;

  return (
    <AccountPageShell activeTab="profiles" locale={routeLocale}>
      <div className="account-section">
        <div className="account-section-header">
          <div>
            <h1 className="account-section-title">
              {isVi ? "Lá số & hồ sơ của bạn" : "Your charts & profiles"}
            </h1>
            <p className="account-section-desc">
              {isVi
                ? "Mỗi hồ sơ dùng chung cho mọi bộ môn (Tử Vi, Bát Tự, Bản đồ sao...) khi tính năng đó ra mắt — không cần nhập lại ngày, giờ, nơi sinh."
                : "Each birth profile is shared across all disciplines — no need to re-enter birth date and time."}
            </p>
          </div>
          <Link
            href={isEn ? "/en/tao-la-so/tu-vi" : "/tao-la-so/tu-vi"}
            className="account-action-link"
          >
            {isVi ? "+ Lập lá số mới" : "+ Create new chart"}
          </Link>
        </div>

        {profiles.length === 0 ? (
          <div className="account-empty-state">
            <h2>{isVi ? "Bạn chưa có hồ sơ nào." : "You don't have any birth profiles yet."}</h2>
            <p>
              {isVi
                ? "Hãy lập lá số đầu tiên để lưu thông tin sinh và xem luận giải bất cứ lúc nào."
                : "Create your first chart to save birth details and access interpretations anytime."}
            </p>
            <Link
              href={isEn ? "/en/tao-la-so/tu-vi" : "/tao-la-so/tu-vi"}
              className="button button-primary"
            >
              {isVi ? "Lập lá số đầu tiên" : "Create your first chart"}
            </Link>
          </div>
        ) : (
          <div className="account-rows-list" style={{ marginTop: "24px" }}>
            {profiles.map((p, index) => {
              const profileLabel = isEn ? `Birth profile #${index + 1}` : `Hồ sơ #${index + 1}`;
              const chartHref = p.chartId ? `${prefix}/la-so/${p.chartId}` : `${prefix}/tao-la-so/tu-vi`;
              const createdDate = p.createdAt.split("T")[0] ?? "";
              const createdText = isVi ? `Tạo ngày ${createdDate}` : `Created on ${createdDate}`;

              return (
                <article key={p.id} className="account-row-card">
                  <div style={{ minWidth: "240px", flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
                      <span className="account-row-title">{profileLabel}</span>
                      {p.gender ? (
                        <span className="account-status-badge">
                          {p.gender === "male"
                            ? isEn ? "Male" : "Nam"
                            : p.gender === "female"
                              ? isEn ? "Female" : "Nữ"
                              : isEn ? "Other" : "Khác"}
                        </span>
                      ) : null}
                    </div>
                    <div className="account-row-meta" style={{ marginTop: "8px" }}>
                      <span>
                        {`${formatCalendar(p.calendar, isEn)} · ${formatTime(p.time, isEn)} (${formatTimezone(p.timezone)})`}
                      </span>
                    </div>
                    <div className="account-text-muted" style={{ marginTop: "4px", fontSize: "12px" }}>
                      {createdText}
                    </div>
                  </div>
                  <div className="account-row-actions">
                    <Link href={chartHref} className="button button-small">
                      {isVi ? "Xem lá số" : "View chart"}
                    </Link>
                    {p.hasPurchasedReport ? (
                      <Link
                        href={isEn ? "/en/tai-khoan/bao-cao" : "/tai-khoan/bao-cao"}
                        className="account-action-link"
                      >
                        {isVi ? "Xem báo cáo →" : "View report →"}
                      </Link>
                    ) : null}
                    <ProfileDeleteButton
                      action={deleteProfile.bind(null, p.id)}
                      locale={routeLocale}
                      label={isVi ? "Xoá hồ sơ" : "Delete profile"}
                      confirmText={isVi ? "Xác nhận" : "Confirm"}
                      cancelText={isVi ? "Huỷ" : "Cancel"}
                      deletingText={isVi ? "Đang xoá..." : "Deleting..."}
                    />
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </AccountPageShell>
  );
}
