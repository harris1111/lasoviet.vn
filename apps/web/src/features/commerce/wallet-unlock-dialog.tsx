"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";

import { findSmallestCoveringPack, LA_TOP_UP_PACKS } from "./la-packs";
import {
  trackUnlockConfirmView,
  trackUnlockConfirmed,
  trackTopupView,
  trackPackSelected,
  trackUnlockError,
} from "../analytics/funnel-analytics";
import type { LaSku } from "@lasoviet/contracts";
import { customerContactConfig } from "@lasoviet/config/customer-contact";
import {
  classifyWalletUnlockError,
  resolveWalletUnlockLoadedState,
  type WalletUnlockErrorKind,
} from "./wallet-unlock-dialog-state";

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
  | { step: "error"; kind: WalletUnlockErrorKind; code?: string };

export type WalletUnlockDialogProps = {
  embedded?: boolean;
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

export function buildWalletSignInHref(
  locale: "vi" | "en",
  currentHref: string,
  chartId: string,
): string {
  const prefix = locale === "en" ? "/en" : "";
  const currentUrl = new URL(currentHref, "https://lasoviet.local");
  const callbackURL = `${currentUrl.pathname}${currentUrl.search}${currentUrl.hash}`;
  const fallbackURL = `${prefix}/la-so/${encodeURIComponent(chartId)}/chon-luan-giai`;
  return (
    `${prefix}/dang-nhap?callbackURL=${encodeURIComponent(callbackURL)}` +
    `&fallbackURL=${encodeURIComponent(fallbackURL)}`
  );
}

async function readErrorCode(response: Response): Promise<string | undefined> {
  try {
    const body = (await response.json()) as { code?: unknown };
    return typeof body.code === "string" ? body.code : undefined;
  } catch {
    return undefined;
  }
}

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
  embedded = false,
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
  const router = useRouter();
  const membership = sku === "MEMBERSHIP-MONTHLY-P0" || sku === "MEMBERSHIP-YEARLY-P0";
  const [state, setState] = useState<DialogState>({ step: "loading" });
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const idempotencyKeyRef = useRef<string>(randomId());
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    idempotencyKeyRef.current = randomId();

    async function load() {
      try {
        const [intentResponse, balanceResponse] = await Promise.all([
          fetch(membership ? "/api/commerce/membership/intents" : "/api/commerce/wallet/purchase-intents", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(membership ? { sku, locale } : { chartId, chartVersionId, sku, locale }),
          }),
          fetch("/api/commerce/wallet/balance"),
        ]);
        if (!active) return;
        if (!intentResponse.ok || !balanceResponse.ok) {
          if (intentResponse.status === 401 || balanceResponse.status === 401) {
            router.push(buildWalletSignInHref(locale, window.location.href, chartId));
            return;
          }
          const code =
            (!intentResponse.ok ? await readErrorCode(intentResponse) : undefined) ??
            (!balanceResponse.ok ? await readErrorCode(balanceResponse) : undefined);
          if (!active) return;
          setState({ step: "error", kind: classifyWalletUnlockError(code), code });
          return;
        }
        const intent = (await intentResponse.json()) as {
          id: string;
          amountLa: number;
          stateVersion: number;
        };
        const balance = (await balanceResponse.json()) as { totalLa: number; stateVersion: number };
        if (!active) return;
        const loadedState = resolveWalletUnlockLoadedState(intent, balance, balance.stateVersion);
        setState(loadedState);
        if (loadedState.step === "confirm") {
          void trackUnlockConfirmView({
            sku,
            price_la: loadedState.priceLa,
            balance: loadedState.balance,
            balance_after: loadedState.balance - loadedState.priceLa,
            placement: "wallet_unlock_dialog",
          });
        } else if (loadedState.step === "short_balance") {
          const gap = loadedState.priceLa - loadedState.balance;
          const coveringPack = findSmallestCoveringPack(gap);
          void trackTopupView({
            pack_id: coveringPack.id,
            placement: "wallet_unlock_dialog",
          });
        }
      } catch {
        if (active) setState({ step: "error", kind: "unavailable", code: "NETWORK_ERROR" });
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
  }, [chartId, locale, router, attempt]);

  useEffect(() => {
    if (state.step === "error") {
      void trackUnlockError({ sku, error_code: state.code ?? "UNKNOWN" });
    }
  }, [state, sku]);

  useEffect(() => {
    if (!open || embedded) return;
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
  }, [open, onOpenChange, embedded]);

  useEffect(() => {
    if (embedded && open) dialogRef.current?.focus();
  }, [embedded, open]);

  if (!open) return null;
  if (typeof document === "undefined" || !document.body) return null;

  async function confirm() {
    if (state.step !== "confirm") return;
    const data: ConfirmData = state;
    setState({ step: "confirming", ...data });
    try {
      const response = await fetch(membership ? "/api/commerce/membership/purchase" : "/api/commerce/wallet/unlock", {
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
        setState({ step: "error", kind: classifyWalletUnlockError(body.code), code: body.code });
        return;
      }
      const value = (await response.json()) as { reportId: string | null };
      void trackUnlockConfirmed({
        sku,
        price_la: data.priceLa,
        amount: data.priceLa,
        balance_after: data.balance - data.priceLa,
      });
      onOpenChange(false);
      onUnlocked(value.reportId ?? null);
    } catch {
      setState({ step: "error", kind: "unavailable", code: "NETWORK_ERROR" });
    }
  }

  function retry() {
    setState({ step: "loading" });
    setAttempt((value) => value + 1);
  }

  const balanceAfter =
    state.step === "confirm" || state.step === "confirming" ? state.balance - state.priceLa : null;
  const shortBalance = state.step === "short_balance" ? state : null;
  const gap = shortBalance ? shortBalance.priceLa - shortBalance.balance : 0;
  const coveringPack = shortBalance ? findSmallestCoveringPack(gap) : LA_TOP_UP_PACKS[0]!;
  const topUpParams = new URLSearchParams({ pack: coveringPack.id });
  if (shortBalance && !membership) {
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
      className={embedded ? "wallet-unlock-dialog-embedded" : "wallet-unlock-dialog-overlay"}
      onClick={() => onOpenChange(false)}
    >
      <div
        aria-labelledby={titleId}
        aria-modal={embedded ? undefined : true}
        className="wallet-unlock-dialog"
        onClick={(event) => event.stopPropagation()}
        ref={dialogRef}
        role={embedded ? "region" : "dialog"}
        tabIndex={-1}
      >
        <h2 id={titleId}>{labels.title}</h2>
        <p className="wallet-unlock-dialog-item">
          {labels.itemLabel}: <strong>{itemName}</strong>
        </p>

        {state.step === "loading" && <p role="status">…</p>}

        {state.step === "error" && (
          <div role="alert" className="wallet-unlock-dialog-error">
            <p>
              {state.kind === "chart_not_found"
                ? t("selection.unlockDialogErrorChartNotFound")
                : state.kind === "preparing"
                  ? t("selection.unlockDialogErrorPreparing")
                  : state.kind === "stale"
                    ? t("selection.unlockDialogErrorStale")
                    : state.kind === "unavailable"
                      ? t("selection.unlockDialogErrorUnavailable")
                      : labels.genericError}
            </p>
            {state.code && (
              <p className="wallet-unlock-dialog-error-code">
                {t("selection.unlockDialogErrorCode", { code: state.code })}
              </p>
            )}
            <div className="wallet-unlock-dialog-actions">
              <button className="button button-secondary" onClick={() => onOpenChange(false)} type="button">
                {labels.cancel}
              </button>
              {state.kind !== "chart_not_found" && (
                <button className="button button-primary" onClick={retry} type="button">
                  {t("selection.unlockDialogRetry")}
                </button>
              )}
            </div>
            {customerContactConfig.email.visible && (
              <p className="wallet-unlock-dialog-topup-note">
                <a href={`mailto:${customerContactConfig.email.value}`}>
                  {t("selection.unlockDialogContactSupport")}
                </a>
              </p>
            )}
          </div>
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
            <p>{membership ? t("membership.confirmAfterTopup") : t("selection.unlockAfterTopupConsent", { item: itemName, price: shortBalance.priceLa })}</p>
            <a className="button button-primary" href={topUpHref} onClick={() => {
              void trackPackSelected({ pack_id: coveringPack.id, price_vnd: coveringPack.vndAmount, la_amount: coveringPack.totalLa });
            }}>
              {embedded ? t("selection.unlockSheetTopup") : t("selection.unlockDialogTopupAction", {
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

  return embedded ? dialogContent : createPortal(dialogContent, document.body);
}
