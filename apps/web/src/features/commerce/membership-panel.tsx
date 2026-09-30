"use client";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { WalletUnlockDialog } from "./wallet-unlock-dialog";

type MembershipStatus = {
  active: boolean; expiresAt: string | null;
  plans: Array<{ sku: "MEMBERSHIP-MONTHLY-P0" | "MEMBERSHIP-YEARLY-P0"; priceLa: number; days: number; available: boolean }>;
};
export function MembershipPanel({ locale }: { locale: "vi" | "en" }) {
  const t = useTranslations("reports.membership");
  const reports = useTranslations("reports");
  const [status, setStatus] = useState<MembershipStatus | null>(null);
  const [selected, setSelected] = useState<MembershipStatus["plans"][number] | null>(null);
  const [revision, setRevision] = useState(0);
  const [signedOut, setSignedOut] = useState(false);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let active = true;
    fetch("/api/commerce/membership", { cache: "no-store" }).then(async (response) => {
      if (active) setSignedOut(response.status === 401);
      if (!response.ok) { if (active) setFailed(response.status !== 401); return; }
      const data = await response.json() as MembershipStatus;
      if (active && typeof data.active === "boolean" && Array.isArray(data.plans)) { setStatus(data); setFailed(false); }
    }).catch(() => { if (active) { setStatus(null); setFailed(true); } });
    return () => { active = false; };
  }, [revision]);
  return <div className="pack-note" aria-label={t("title")}>
    <p role="status">{failed ? t("error") : !status ? (signedOut ? t("signIn") : t("loading")) : status.active && status.expiresAt ? t("activeUntil", { date: new Intl.DateTimeFormat(locale === "vi" ? "vi-VN" : "en-GB", { timeZone: "Asia/Ho_Chi_Minh", dateStyle: "medium" }).format(new Date(status.expiresAt)) }) : t("inactive")}</p>
    <p>{t("manualRenewal")}</p><p>{t("benefitsPending")}</p>
    {signedOut && <a href={`${locale === "en" ? "/en" : ""}/dang-nhap?callbackURL=${encodeURIComponent(`${locale === "en" ? "/en" : ""}/nap-la?tab=hoi-vien`)}`}>{t("signIn")}</a>}
    {status?.plans.filter((plan) => plan.available).map((plan) => <button type="button" className="button" key={plan.sku} onClick={() => setSelected(plan)}>{t(status.active ? "renew" : "purchase", { price: plan.priceLa, days: plan.days })}</button>)}
    {selected && <WalletUnlockDialog open chartId="membership" chartVersionId="membership" sku={selected.sku} locale={locale}
      itemName={t(selected.sku === "MEMBERSHIP-MONTHLY-P0" ? "monthly" : "yearly")}
      onOpenChange={(open) => { if (!open) setSelected(null); }} onUnlocked={() => { setSelected(null); setRevision((value) => value + 1); }}
      labels={{
        title: t("confirmTitle"), itemLabel: reports("selection.unlockDialogItemLabel"),
        priceLabel: reports("selection.unlockDialogPriceLabel"), balanceLabel: reports("selection.unlockDialogBalanceLabel"),
        balanceAfterLabel: reports("selection.unlockDialogBalanceAfterLabel"), confirm: t("confirm"),
        confirming: reports("selection.unlockDialogConfirming"), cancel: reports("selection.unlockDialogCancel"),
        shortBalanceTitle: reports("selection.unlockDialogShortBalanceTitle"), topUpNote: reports("selection.unlockDialogTopupNote"),
        genericError: reports("selection.unlockDialogGenericError"),
      }} />}
  </div>;
}
