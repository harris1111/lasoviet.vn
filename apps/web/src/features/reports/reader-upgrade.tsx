"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { WalletPurchaseIntentV1Schema } from "@lasoviet/contracts";
import { SecureLockedPreview } from "../ziwei/secure-locked-preview";
import { WalletUnlockDialog } from "../commerce/wallet-unlock-dialog";

export function ReaderUpgrade({ locale, chartId, chartVersionId }: {
  locale: "vi" | "en";
  chartId?: string;
  chartVersionId?: string;
}) {
  const t = useTranslations("reports");
  const router = useRouter();
  const [price, setPrice] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const prefix = locale === "en" ? "/en" : "";

  useEffect(() => {
    if (!chartId || !chartVersionId) return;
    const abort = new AbortController();
    async function quote() {
      try {
        const response = await fetch("/api/commerce/wallet/purchase-intents", {
          method: "POST", headers: { "content-type": "application/json" },
          body: JSON.stringify({ chartId, chartVersionId, locale, sku: "ZIWEI-IDENTITY-P0" }),
          cache: "no-store", signal: abort.signal,
        });
        if (!response.ok) return;
        const parsed = WalletPurchaseIntentV1Schema.safeParse(await response.json());
        if (parsed.success && parsed.data.sku === "ZIWEI-IDENTITY-P0" && parsed.data.chartVersionId === chartVersionId && parsed.data.locale === locale && parsed.data.status === "pending") {
          setPrice(parsed.data.amountLa);
        }
      } catch { /* The confirmation can retry a temporary quote failure. */ }
      finally { if (!abort.signal.aborted) setLoading(false); }
    }
    void quote();
    return () => abort.abort();
  }, [chartId, chartVersionId, locale]);

  return <section className="report-upgrade-box reader-upgrade" id="nang-cap" aria-labelledby="reader-upgrade-title">
    <h3 id="reader-upgrade-title">{t("readerUpgrade.title")}</h3>
    <p>{t("readerUpgrade.description")}</p>
    <p className="visually-hidden">{t("readerUpgrade.scope")}</p>
    <div className="reader-upgrade-previews">
      {(["palaces", "patterns", "timing"] as const).map(section => <SecureLockedPreview key={section} title={t(`readerUpgrade.${section}`)} locale={locale} lengthHint={3} />)}
    </div>
    {chartId && chartVersionId && <>
      <p role="status">{price !== null ? t("readerUpgrade.price", { amount: price }) : t(loading ? "readerUpgrade.loading" : "readerUpgrade.unavailable")}</p>
      {price !== null && price < 960 && <p>{t("readerUpgrade.credit", { amount: 960 - price })}</p>}
      <p>{t("readerUpgrade.terms")}</p>
      <button type="button" className="btn-upgrade" onClick={() => setOpen(true)}>{t("readerUpgrade.unlock")}</button>
      {open && <WalletUnlockDialog open onOpenChange={setOpen} chartId={chartId} chartVersionId={chartVersionId} locale={locale} sku="ZIWEI-IDENTITY-P0" itemName={t("readerUpgrade.title")}
        onUnlocked={reportId => { if (reportId) { router.push(`${prefix}/bao-cao/${encodeURIComponent(reportId)}`); router.refresh(); } }}
        labels={{ title: t("selection.unlockDialogTitle"), itemLabel: t("selection.unlockDialogItemLabel"), priceLabel: t("selection.unlockDialogPriceLabel"), balanceLabel: t("selection.unlockDialogBalanceLabel"), balanceAfterLabel: t("selection.unlockDialogBalanceAfterLabel"), confirm: t("selection.unlockDialogConfirm"), confirming: t("selection.unlockDialogConfirming"), cancel: t("selection.unlockDialogCancel"), shortBalanceTitle: t("selection.unlockDialogShortBalanceTitle"), topUpNote: t("selection.unlockDialogTopupNote"), genericError: t("selection.unlockDialogGenericError") }} />}
    </>}
    <Link className="reader-upgrade-topup" href={`${prefix}/nap-la`}>{t("readerUpgrade.topup")}</Link>
  </section>;
}
