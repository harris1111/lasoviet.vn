"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { findLaProduct, PersonalDailyReadingV1Schema, type PersonalDailyReadingV1 } from "@lasoviet/contracts";
import { WalletUnlockDialog } from "../commerce/wallet-unlock-dialog";

export function PersonalDailyReadingPanel({ chartId, chartVersionId, locale }: { chartId: string; chartVersionId: string; locale: "vi" | "en" }) {
  const t = useTranslations("ziwei.dailyReading");
  const reports = useTranslations("reports");
  const [reading, setReading] = useState<PersonalDailyReadingV1 | null>(null);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let active = true;
    if (locale !== "vi") return;
    fetch(`/api/ziwei/charts/${encodeURIComponent(chartId)}/daily-reading`, { cache: "no-store" })
      .then(async (response) => response.ok ? PersonalDailyReadingV1Schema.safeParse(await response.json()) : null)
      .then((result) => { if (active) setReading(result?.success ? result.data : null); })
      .catch(() => { if (active) setReading(null); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [chartId, locale, revision]);
  const purchasable = locale === "vi" && findLaProduct("ZIWEI-TODAY-P0")?.availability === "active";
  return <section className="container result-paid-report-cta" aria-labelledby="personal-daily-title">
    <h2 id="personal-daily-title">{t("title")}</h2>
    {reading ? <>
      <p>{reading.calendar.solarDateFormatted} · {reading.calendar.dayStemBranch}</p>
      <h3>{reading.reading.headline}</h3>
      <p>{reading.reading.overview}</p>
      {reading.reading.aspects.map((aspect) => <div key={aspect.key}><h3>{aspect.title}</h3><p>{aspect.guidance}</p></div>)}
      <h3>{t("actions")}</h3><ul>{reading.reading.actionPlan.recommendations.map((item) => <li key={item}>{item}</li>)}</ul>
      <h3>{t("cautions")}</h3><ul>{reading.reading.actionPlan.cautions.map((item) => <li key={item}>{item}</li>)}</ul>
    </> : <>
      <p>{t("bonus")}</p>
      <p role="status">{loading && locale === "vi" ? t("loading") : t("locked")}</p>
      {purchasable && !loading && <button type="button" className="button" onClick={() => setOpen(true)}>{t("unlock")}</button>}
    </>}
    {open && <WalletUnlockDialog open chartId={chartId} chartVersionId={chartVersionId} sku="ZIWEI-TODAY-P0" locale={locale}
      itemName={t("title")} onOpenChange={setOpen} onUnlocked={() => setRevision((value) => value + 1)}
      labels={{
        title: reports("selection.unlockDialogTitle"), itemLabel: reports("selection.unlockDialogItemLabel"),
        priceLabel: reports("selection.unlockDialogPriceLabel"), balanceLabel: reports("selection.unlockDialogBalanceLabel"),
        balanceAfterLabel: reports("selection.unlockDialogBalanceAfterLabel"), confirm: reports("selection.unlockDialogConfirm"),
        confirming: reports("selection.unlockDialogConfirming"), cancel: reports("selection.unlockDialogCancel"),
        shortBalanceTitle: reports("selection.unlockDialogShortBalanceTitle"), topUpNote: reports("selection.unlockDialogTopupNote"),
        genericError: reports("selection.unlockDialogGenericError"),
      }} />}
  </section>;
}
