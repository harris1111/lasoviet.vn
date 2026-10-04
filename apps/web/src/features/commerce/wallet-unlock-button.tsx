"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { type WalletUnlockDialogLabels, type WalletUnlockDialogSku } from "./wallet-unlock-dialog";

import { UnlockSheet } from "./unlock-sheet";

export type WalletUnlockButtonProps = {
  chartId: string;
  chartVersionId: string;
  sku: WalletUnlockDialogSku;
  locale: "vi" | "en";
  itemName: string;
  buttonLabel: string;
  labels: WalletUnlockDialogLabels;
};

/**
 * The "Mở – N Lá" entry point on the reading-selection page (FD-105 package
 * 1.2). Replaces the old direct VND-checkout form: displayed prices are Lá,
 * so the purchase mechanism now actually spends Lá through the wallet
 * instead of opening an unrelated VietQR content-purchase checkout.
 */
export function WalletUnlockButton({
  chartId,
  chartVersionId,
  sku,
  locale,
  itemName,
  buttonLabel,
  labels,
}: WalletUnlockButtonProps) {
  const [open, setOpen] = useState(false);
  // A fresh key on every open forces the dialog to remount, so it always
  // starts a clean intent+balance load instead of needing to reset state
  // from inside an effect.
  const [openKey, setOpenKey] = useState(0);
  const router = useRouter();

  return (
    <>
      <button
        className="button button-primary btn btn-primary btn-lg"
        onClick={() => {
          setOpenKey((key) => key + 1);
          setOpen(true);
        }}
        type="button"
      >
        {buttonLabel}
      </button>
      {open && (
        <UnlockSheet
          chartId={chartId}
          chartVersionId={chartVersionId}
          itemName={itemName}
          key={openKey}
          labels={labels}
          locale={locale}
          onOpenChange={setOpen}
          onUnlocked={(reportId) => {
            if (sku === "ZIWEI-TODAY-P0") {
              router.push(locale === "en" ? `/en/la-so/${chartId}` : `/la-so/${chartId}`);
              router.refresh();
            } else if (reportId !== null) {
              router.push(locale === "en" ? `/en/bao-cao/${reportId}` : `/bao-cao/${reportId}`);
            }
          }}
          open={open}
          sku={sku}
        />
      )}
    </>
  );
}
