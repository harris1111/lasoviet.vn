"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { findLaProduct, PersonalDailyReadingV1Schema, type PersonalDailyReadingV1 } from "@lasoviet/contracts";
import { PartFeedback } from "../reports/part-feedback";
import { WalletUnlockDialog } from "../commerce/wallet-unlock-dialog";

export function PersonalDailyReadingPanel({ chartId, chartVersionId, locale, includedOnly = false }: { chartId: string; chartVersionId: string; locale: "vi" | "en"; includedOnly?: boolean }) {
  const t = useTranslations("ziwei.dailyReading");
  const reports = useTranslations("reports");
  const [open, setOpen] = useState(false);
  const [revision, setRevision] = useState(0);
  const requestKey = `${chartId}:${chartVersionId}:${locale}:${revision}`;
  const [result, setResult] = useState<{key: string; reading: PersonalDailyReadingV1 | null; purchased: boolean} | null>(null);
  const current = result?.key === requestKey ? result : null;
  const reading = current?.reading ?? null;
  const purchased = current?.purchased ?? false;
  const loading = !current;
  useEffect(() => {
    if (locale !== "vi") return;
    let active = true;
    let controller: AbortController | undefined;
    let midnightTimer: ReturnType<typeof setTimeout> | undefined;
    const vietnamDate = () => new Intl.DateTimeFormat("en-CA", {timeZone: "Asia/Ho_Chi_Minh", year: "numeric", month: "2-digit", day: "2-digit"}).format(new Date());
    async function load() {
      controller?.abort();
      const request = new AbortController();
      controller = request;
      try {
        const response = await fetch(`/api/ziwei/charts/${encodeURIComponent(chartId)}/daily-reading`, {cache: "no-store", signal: request.signal});
        const parsed = response.ok ? PersonalDailyReadingV1Schema.safeParse(await response.json()) : null;
        const reading = parsed?.success && parsed.data.qualityGate.passed
          && parsed.data.chartId === chartId && parsed.data.chartVersionId === chartVersionId
          && parsed.data.calendar.solarDate === parsed.data.asOfDate && parsed.data.asOfDate === vietnamDate() ? parsed.data : null;
        if (active && controller === request) setResult({key: requestKey, reading, purchased: !!reading && response.headers.get("x-daily-purchased") === "true"});
      } catch {
        if (active && controller === request && !request.signal.aborted) setResult({key: requestKey, reading: null, purchased: false});
      }
    }
    function onVisibilityChange() { if (document.visibilityState === "visible") { setResult(null); void load(); } }
    function scheduleMidnight() {
      const next = new Date(`${vietnamDate()}T00:00:00+07:00`).getTime() + 86_400_000;
      midnightTimer = setTimeout(() => {setResult(null); void load(); scheduleMidnight();}, Math.max(1, next - Date.now()));
    }
    function onWalletChange() {setResult(null); void load();}
    void load();
    scheduleMidnight();
    window.addEventListener("lsv:wallet-changed", onWalletChange);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => { active = false; controller?.abort(); if (midnightTimer) clearTimeout(midnightTimer); window.removeEventListener("lsv:wallet-changed", onWalletChange); document.removeEventListener("visibilitychange", onVisibilityChange); };
  }, [chartId, chartVersionId, locale, requestKey]);
  if (includedOnly && (!reading || locale !== "vi")) return null;
  const purchasable = !includedOnly && locale === "vi" && findLaProduct("ZIWEI-TODAY-P0")?.availability === "active";
  return <section id="personal-daily-reading" data-testid="personal-daily-reading" className="container result-paid-report-cta personal-daily-reading-panel" aria-labelledby="personal-daily-title">
    <h2 id="personal-daily-title">{t("title")}</h2>
    {reading ? <>
      <p>{reading.calendar.solarDateFormatted} · {reading.calendar.dayStemBranch}</p>
      <h3>{reading.reading.headline}</h3>
      <p>{reading.reading.overview}</p>
      {reading.reading.aspects.map((aspect) => <div key={aspect.key}><h3>{aspect.title}</h3><p>{aspect.guidance}</p></div>)}
      <h3>{t("actions")}</h3><ul>{reading.reading.actionPlan.recommendations.map((item) => <li key={item}>{item}</li>)}</ul>
      <h3>{t("cautions")}</h3><ul>{reading.reading.actionPlan.cautions.map((item) => <li key={item}>{item}</li>)}</ul>
      <PartFeedback chartId={chartId} partId={`daily:${reading.asOfDate}`} paid={purchased} locale={locale} onClaimed={() => { setResult(null); setRevision((value) => value + 1); }} />
    </> : <>
      <p>{t("bonus")}</p>
      {purchasable && <p>{t("terms")}</p>}
      <p role="status">{loading && locale === "vi" ? t("loading") : t("locked")}</p>
      {purchasable && !loading && <button type="button" className="button" onClick={() => setOpen(true)}>{t("unlock")}</button>}
    </>}
    {open && <WalletUnlockDialog key={`${chartId}:${chartVersionId}:${locale}`} open chartId={chartId} chartVersionId={chartVersionId} sku="ZIWEI-TODAY-P0" locale={locale}
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
