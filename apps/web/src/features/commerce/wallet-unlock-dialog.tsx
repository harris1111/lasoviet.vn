"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";

import { findSmallestCoveringPack, LA_TOP_UP_PACKS } from "./la-packs";
import type { LaSku } from "@lasoviet/contracts";
import { resolveWalletUnlockLoadedState } from "./wallet-unlock-dialog-state";

export type WalletUnlockDialogSku = LaSku | "ZIWEI-NATAL-EXCERPT-P0" | "ZIWEI-IDENTITY-P0";

export type WalletUnlockDialogLabels = {
  title: string;
  itemLabel: string;
  priceLabel: string;
  balanceLabel: string;
  balanceAfterLabel: string;
  confirm: string;
  confirming: string;
  cancel: string;
  shortBalanceTitle: string;
  topUpNote: string;
  genericError: string;
};

type ConfirmData = {
  balance: number;
  priceLa: number;
  intentId: string;
  intentVersion: number;
  walletVersion: number;
};

type DialogState =
  | { step: "loading" }
  | ({ step: "confirm" } & ConfirmData)
  | ({ step: "confirming" } & ConfirmData)
  | ({ step: "short_balance" } & ConfirmData)
  | { step: "error"; message: string };

export type WalletUnlockDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUnlocked: (reportId: string | null) => void;
  chartId: string;
  chartVersionId: string;
  sku: WalletUnlockDialogSku;
  locale: "vi" | "en";
  itemName: string;
  labels: WalletUnlockDialogLabels;
};

function randomId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `k-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/**
 * Confirm dialog for "Mở – N Lá" (FD-105 package 1.2): shows price and
 * balance before spending, and if the balance is short, offers the
 * smallest covering pack. Creating the purchase intent is idempotent
 * server-side. The top-up link carries the confirmed intent terms so payment
 * settlement can complete the purchase and return to the same chart section.
 */
export function WalletUnlockDialog({
  open,
  onOpenChange,
  onUnlocked,
  chartId,
  chartVersionId,
  sku,
  locale,
  itemName,
  labels,
}: WalletUnlockDialogProps) {
  const t = useTranslations("reports");
  const [state, setState] = useState<DialogState>({ step: "loading" });
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const idempotencyKeyRef = useRef<string>(randomId());

  useEffect(() => {
    let active = true;
    idempotencyKeyRef.current = randomId();

    async function load() {
      try {
        const [intentResponse, balanceResponse] = await Promise.all([
          fetch("/api/commerce/wallet/purchase-intents", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ chartId, chartVersionId, sku, locale }),
          }),
          fetch("/api/commerce/wallet/balance"),
        ]);
        if (!active) return;
        if (!intentResponse.ok || !balanceResponse.ok) {
          if (intentResponse.status === 401 || balanceResponse.status === 401) {
            const prefix = locale === "en" ? "/en" : "";
            window.location.href = `${prefix}/dang-nhap?callbackURL=${encodeURIComponent(window.location.href)}`;
            return;
          }
          setState({ step: "error", message: labels.genericError });
          return;
        }
        const intent = (await intentResponse.json()) as {
          id: string;
          amountLa: number;
          stateVersion: number;
        };
        const balance = (await balanceResponse.json()) as { totalLa: number; stateVersion: number };
        if (!active) return;
        setState(resolveWalletUnlockLoadedState(intent, balance, balance.stateVersion));
      } catch {
        if (active) setState({ step: "error", message: labels.genericError });
      }
    }

    void load();
    return () => {
      active = false;
    };
    // Runs once per mount; the parent remounts this component (via `key`)
    // every time the dialog opens, so a fresh intent+balance load always
    // starts from "loading" without a synchronous setState in the effect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!open) return;
    const triggerElement = typeof document !== "undefined" ? (document.activeElement as HTMLElement | null) : null;
    const previousOverflow = typeof document !== "undefined" ? document.body.style.overflow : "";
    if (typeof document !== "undefined") {
      document.body.style.overflow = "hidden";
    }
    dialogRef.current?.focus();
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onOpenChange(false);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => {
      if (typeof document !== "undefined") {
        document.body.style.overflow = previousOverflow;
        document.removeEventListener("keydown", onKeyDown);
      }
      triggerElement?.focus();
    };
  }, [open, onOpenChange]);

  if (!open) return null;
  if (typeof document === "undefined" || !document.body) return null;

  async function confirm() {
    if (state.step !== "confirm") return;
    const data: ConfirmData = state;
    setState({ step: "confirming", ...data });
    try {
      const response = await fetch("/api/commerce/wallet/unlock", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          purchaseIntentId: state.intentId,
          expectedIntentVersion: state.intentVersion,
          expectedWalletVersion: state.walletVersion,
          idempotencyKey: idempotencyKeyRef.current,
        }),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { code?: string };
        if (body.code === "WALLET_INSUFFICIENT_BALANCE") {
          setState({ ...state, step: "short_balance" });
          return;
        }
        setState({ step: "error", message: labels.genericError });
        return;
      }
      const value = (await response.json()) as { reportId: string | null };
      onOpenChange(false);
      onUnlocked(value.reportId);
    } catch {
      setState({ step: "error", message: labels.genericError });
    }
  }

  const balanceAfter =
    state.step === "confirm" || state.step === "confirming" ? state.balance - state.priceLa : null;
  const shortBalance = state.step === "short_balance" ? state : null;
  const gap = shortBalance ? shortBalance.priceLa - shortBalance.balance : 0;
  const coveringPack = shortBalance ? findSmallestCoveringPack(gap) : LA_TOP_UP_PACKS[0]!;
  const topUpParams = new URLSearchParams({ pack: coveringPack.id });
  if (shortBalance) {
    topUpParams.set("intent", shortBalance.intentId);
    topUpParams.set("intentVersion", String(shortBalance.intentVersion));
    topUpParams.set("price", String(shortBalance.priceLa));
    const context = new URLSearchParams(window.location.search);
    const tab = context.get("tab");
    topUpParams.set("tab", tab && ["chart", "overview", "palaces", "topics", "nam-nay", "evidence"].includes(tab) ? tab : "topics");
    const openPart = context.get("open");
    if (openPart && /^[a-zA-Z0-9._-]{1,128}$/.test(openPart)) topUpParams.set("open", openPart);
  }
  const topUpHref = `${locale === "en" ? "/en" : ""}/nap-la?${topUpParams}`;

  const dialogContent = (
    <div
      className="wallet-unlock-dialog-overlay"
      onClick={() => onOpenChange(false)}
    >
      <div
        aria-labelledby={titleId}
        aria-modal="true"
        className="wallet-unlock-dialog"
        onClick={(event) => event.stopPropagation()}
        ref={dialogRef}
        role="dialog"
        tabIndex={-1}
      >
        <h2 id={titleId}>{labels.title}</h2>
        <p className="wallet-unlock-dialog-item">
          {labels.itemLabel}: <strong>{itemName}</strong>
        </p>

        {state.step === "loading" && <p role="status">…</p>}

        {state.step === "error" && (
          <p role="alert" className="wallet-unlock-dialog-error">
            {state.message}
          </p>
        )}

        {(state.step === "confirm" || state.step === "confirming") && (
          <div className="wallet-unlock-dialog-summary">
            <p>
              {labels.priceLabel}: <strong>{state.priceLa} Lá</strong>
            </p>
            <p>
              {labels.balanceLabel}: <strong>{state.balance} Lá</strong>
            </p>
            {balanceAfter !== null && (
              <p>
                {labels.balanceAfterLabel}: <strong>{balanceAfter} Lá</strong>
              </p>
            )}
            <div className="wallet-unlock-dialog-actions">
              <button
                className="button button-secondary"
                disabled={state.step === "confirming"}
                onClick={() => onOpenChange(false)}
                type="button"
              >
                {labels.cancel}
              </button>
              <button
                className="button button-primary"
                disabled={state.step === "confirming"}
                onClick={() => void confirm()}
                type="button"
              >
                {state.step === "confirming" ? labels.confirming : labels.confirm}
              </button>
            </div>
          </div>
        )}

        {shortBalance && (
          <div className="wallet-unlock-dialog-short-balance">
            <h3>{labels.shortBalanceTitle}</h3>
            <p>{t("selection.unlockDialogShortBalanceBody", { gap, balance: shortBalance.balance })}</p>
            <p>{t("selection.unlockAfterTopupConsent", { item: itemName, price: shortBalance.priceLa })}</p>
            <a className="button button-primary" href={topUpHref}>
              {t("selection.unlockDialogTopupAction", {
                pack: coveringPack.name[locale],
                vnd: coveringPack.vndFormatted[locale],
              })}
            </a>
            <p className="wallet-unlock-dialog-topup-note">{labels.topUpNote}</p>
            <button className="button button-secondary" onClick={() => onOpenChange(false)} type="button">
              {labels.cancel}
            </button>
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(dialogContent, document.body);
}
