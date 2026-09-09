import type { AccountLibraryV1 } from "@lasoviet/contracts";
import Link from "next/link";
import React from "react";

import {
  AccountPageShell,
  formatHoChiMinhDateTime,
  localizeReportStatus,
} from "./account-page-shell";

export interface AccountLibraryProps {
  locale: "vi" | "en";
  library?: AccountLibraryV1 | null;
  error?: string | null;
}

export function AccountLibrary({
  locale,
  library,
  error,
}: AccountLibraryProps) {
  const isVi = locale === "vi";
  const createChartPath = isVi ? "/tao-la-so/tu-vi" : "/en/tao-la-so/tu-vi";

  const totalReports = library?.totalCount ?? 0;
  const groups = library?.groups ?? [];
  const hasItems = groups.some((g) => g.items && g.items.length > 0);
  const isEmpty =
    !library || totalReports === 0 || groups.length === 0 || !hasItems;

  return (
    <AccountPageShell activeTab="reports" locale={locale}>
      {error && (
        <div role="alert" className="account-error-banner">
          {error}
        </div>
      )}

      {isEmpty ? (
        <section className="account-empty-state">
          <h2>{isVi ? "Chưa có báo cáo nào" : "No reports yet"}</h2>
          <p>
            {isVi
              ? "Bạn chưa có báo cáo luận giải nào. Hãy lập lá số Tử Vi để bắt đầu khám phá."
              : "You have no reports yet. Create your Zi Wei chart to get started."}
          </p>
          <Link href={createChartPath} className="button button-primary">
            {isVi ? "Lập lá số Tử Vi" : "Create Zi Wei chart"}
          </Link>
        </section>
      ) : (
        <div className="account-library-layout">
          {groups.map((group, groupIndex) => {
            const profileDisplayName = group.profileDisplayName?.trim();
            const groupProfileName =
              profileDisplayName ||
              (isVi ? "Hồ sơ cá nhân" : "Personal profile");

            return (
              <section
                key={group.chartId || groupIndex}
                className="account-section account-library-group"
                aria-label={groupProfileName}
              >
                <div className="account-section-header">
                  <h2 className="account-section-title">{groupProfileName}</h2>
                </div>
                <div className="account-rows-list">
                  {group.items.map((item, itemIndex) => {
                    const itemDisplayName = item.profileDisplayName?.trim();
                    const itemProfileName =
                      itemDisplayName ||
                      (isVi ? "Hồ sơ cá nhân" : "Personal profile");
                    const title = item.productTitle || item.productName;
                    const dateStr = formatHoChiMinhDateTime(
                      item.purchasedAt || item.createdAt,
                      locale,
                    );
                    const statusText = localizeReportStatus(
                      item.reportStatus,
                      item.orderStatus,
                      locale,
                    );

                    return (
                      <article
                        key={item.id || itemIndex}
                        className="account-row-card"
                      >
                        <div className="account-row-content">
                          <span className="account-row-profile">
                            {itemProfileName}
                          </span>
                          <h3 className="account-row-title">{title}</h3>
                          <div className="account-row-meta">
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
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </AccountPageShell>
  );
}

export default AccountLibrary;
