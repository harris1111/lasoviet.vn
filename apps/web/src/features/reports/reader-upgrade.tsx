"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import type { ReportUpgradePreviewV1 } from "@lasoviet/contracts";
import { SecureLockedPreview } from "../ziwei/secure-locked-preview";
import { UnlockSheet } from "../commerce/unlock-sheet";
import { useUnlockLabels } from "../commerce/contextual-unlock";
import { useWalletQuotes } from "../commerce/use-wallet-quotes";
import { trackUpgradeView } from "../analytics/funnel-analytics";

export function ReaderUpgrade({ locale, chartId, chartVersionId, reportVersionId, reportLocale, upgradePreview }: {
  locale: "vi" | "en"; chartId?: string; chartVersionId?: string;
  reportVersionId?: string; reportLocale?: "vi" | "en"; upgradePreview?: ReportUpgradePreviewV1;
}) {
  if (!chartId || !chartVersionId) return null;
  const authorizedPreview = upgradePreview?.reportVersionId === reportVersionId &&
    upgradePreview?.chartVersionId === chartVersionId && upgradePreview?.locale === reportLocale ? upgradePreview : undefined;
  return <ReaderUpgradeForChart key={`${chartId}:${chartVersionId}:${locale}:${reportVersionId ?? ""}`} locale={locale} chartId={chartId} chartVersionId={chartVersionId} upgradePreview={authorizedPreview} />;
}

function ReaderUpgradeForChart({ locale, chartId, chartVersionId, upgradePreview }: {
  locale: "vi" | "en"; chartId: string; chartVersionId: string; upgradePreview?: ReportUpgradePreviewV1;
}) {
  const t = useTranslations("reports");
  const labels = useUnlockLabels();
  const router = useRouter();
  const quote = useWalletQuotes(chartId, chartVersionId, locale);
  const terms = quote.quotes?.find(item => item.sku === "ZIWEI-IDENTITY-P0");
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLElement>(null);
  const seen = useRef(new Set<string>());
  const prefix = locale === "en" ? "/en" : "";
  const canBuy = quote.status === "ready" && terms?.state === "available" && terms.priceLa !== null;
  const coverage = upgradePreview?.coverage;
  const lockedPart = upgradePreview?.lockedPart;

  useEffect(() => {
    if (!terms || terms.state !== "available" || terms.creditLa <= 0 || !terms.creditExpiresAt || typeof IntersectionObserver === "undefined") return;
    const expiry = Date.parse(terms.creditExpiresAt);
    const observer = new IntersectionObserver(entries => {
      if (!entries.some(entry => entry.isIntersecting && entry.intersectionRatio > 0 && entry.target.getClientRects().length)) return;
      const nowMs = Date.now();
      if (!Number.isFinite(expiry) || expiry <= nowMs) return;
      for (const source of terms.creditSourceSkus) {
        const identity = `${source}:${terms.creditExpiresAt}`;
        if (seen.current.has(identity)) continue;
        seen.current.add(identity);
        void trackUpgradeView({source_sku: source, target_sku: "ZIWEI-IDENTITY-P0", days_remaining: Math.ceil((expiry - nowMs) / 86_400_000)});
      }
    }, {threshold: 0.1});
    if (root.current) observer.observe(root.current);
    return () => observer.disconnect();
  }, [terms]);

  if (terms?.state === "owned") return <section className="report-upgrade-box reader-upgrade" aria-label={t("readerUpgrade.title")}>
    <p>{t("selection.ladderOwned")}</p>
    <Link className="button" href={terms.reportId ? `${prefix}/bao-cao/${encodeURIComponent(terms.reportId)}` : `${prefix}/tai-khoan/bao-cao`}>
      {t(terms.reportState === "ready" ? "selection.readAgain" : terms.reportId ? "selection.viewProgress" : "selection.viewLibrary")}
    </Link>
  </section>;

  return <section ref={root} className="report-upgrade-box reader-upgrade" id="nang-cap" aria-labelledby="reader-upgrade-title" data-testid="reader-upgrade">
    <h3 id="reader-upgrade-title">{t("readerUpgrade.title")}</h3>
    <p>{t("readerUpgrade.description")}</p>
    {coverage && <>
      <p data-testid="reader-upgrade-section-coverage">{t("readerUpgrade.sectionCoverage", {opened: coverage.openedSections, locked: coverage.lockedSections})}</p>
      <p data-testid="reader-upgrade-palace-coverage">{t("readerUpgrade.palaceCoverage", {opened: coverage.openedPalaces, locked: coverage.lockedPalaces})}</p>
    </>}
    <p className="visually-hidden">{t("readerUpgrade.scope")}</p>
    {lockedPart && <div className="reader-upgrade-previews" data-testid="reader-upgrade-preview">
      <SecureLockedPreview title={lockedPart.title} clippedSentences={lockedPart.clippedSentences} locale={locale} lengthHint={lockedPart.lengthHint} />
    </div>}
    <p role="status">{canBuy ? t("readerUpgrade.price", {amount: terms.priceLa!}) : t(quote.status === "loading" ? "readerUpgrade.loading" : "readerUpgrade.unavailable")}</p>
    {canBuy && terms.creditLa > 0 && <p>{t("readerUpgrade.credit", {amount: terms.creditLa})}</p>}
    {canBuy && terms.creditLa > 0 && terms.creditExpiresAt && <p>{t("readerUpgrade.creditExpiry", {date: new Intl.DateTimeFormat(locale === "vi" ? "vi-VN" : "en-GB", {timeZone: "Asia/Ho_Chi_Minh", dateStyle: "medium", timeStyle: "short"}).format(new Date(terms.creditExpiresAt))})}</p>}
    {canBuy && terms.discountLa > 0 && <p>{t("selection.ladderDiscount", {discount: terms.discountLa})}</p>}
    {quote.status === "error" && <button type="button" className="button button-secondary" onClick={quote.retry}>{t("selection.retry")}</button>}
    <p>{t("readerUpgrade.terms")}</p>
    <button type="button" className="btn-upgrade" disabled={!canBuy} onClick={() => setOpen(true)}>{t("readerUpgrade.unlock")}</button>
    <UnlockSheet open={open} onOpenChange={setOpen} chartId={chartId} chartVersionId={chartVersionId} locale={locale} sku="ZIWEI-IDENTITY-P0" itemName={t("readerUpgrade.title")} labels={labels}
      onUnlocked={reportId => { quote.retry(); if (reportId) {router.push(`${prefix}/bao-cao/${encodeURIComponent(reportId)}`); router.refresh();} }} />
    <Link className="reader-upgrade-topup" href={`${prefix}/nap-la`}>{t("readerUpgrade.topup")}</Link>
  </section>;
}
