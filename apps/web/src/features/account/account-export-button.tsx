"use client";

import React, { useState } from "react";

export type AccountExportErrorType = "limit_exceeded" | "generic";

export type AccountExportResult =
  | { ok: true }
  | { ok: false; error: AccountExportErrorType };

export type TriggerDownloadFn = (blob: Blob, filename: string) => void;

export function defaultTriggerDownload(blob: Blob, filename: string): void {
  if (typeof window === "undefined" || typeof URL === "undefined") {
    return;
  }

  const url = URL.createObjectURL(blob);
  try {
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function executeAccountExport({
  fetchFn = fetch,
  triggerDownload = defaultTriggerDownload,
}: {
  fetchFn?: typeof fetch;
  triggerDownload?: TriggerDownloadFn;
} = {}): Promise<AccountExportResult> {
  try {
    const response = await fetchFn("/api/account/export", {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });

    if (response.status === 413) {
      return { ok: false, error: "limit_exceeded" };
    }

    if (!response.ok) {
      try {
        const body = (await response.clone().json()) as unknown;
        if (
          typeof body === "object" &&
          body !== null &&
          "code" in body &&
          body.code === "ACCOUNT_EXPORT_LIMIT_EXCEEDED"
        ) {
          return { ok: false, error: "limit_exceeded" };
        }
      } catch {
        // Ignore non-JSON error responses.
      }
      return { ok: false, error: "generic" };
    }

    const blob = await response.blob();
    triggerDownload(blob, "lasoviet-account-export.json");
    return { ok: true };
  } catch {
    return { ok: false, error: "generic" };
  }
}

export function getExportErrorMessage(
  errorType: AccountExportErrorType,
  locale: "vi" | "en",
): string {
  const isVi = locale === "vi";
  if (errorType === "limit_exceeded") {
    return isVi
      ? "Dữ liệu xuất vượt quá giới hạn cho phép (5 MB). Vui lòng liên hệ bộ phận hỗ trợ."
      : "Account export exceeds the maximum allowed limit (5 MB). Please contact support.";
  }
  return isVi
    ? "Dịch vụ xuất dữ liệu tạm thời không khả dụng. Vui lòng thử lại sau."
    : "Export service is temporarily unavailable. Please try again later.";
}

export interface AccountExportState {
  isBusy: boolean;
  errorMessage: string | null;
}

export interface AccountExportButtonViewProps {
  locale: "vi" | "en";
  className?: string;
  isBusy: boolean;
  errorMessage: string | null;
  onClick: () => void | Promise<void>;
}

export function AccountExportButtonView({
  locale,
  className,
  isBusy,
  errorMessage,
  onClick,
}: AccountExportButtonViewProps) {
  const isVi = locale === "vi";
  return (
    <div>
      <button
        type="button"
        onClick={onClick}
        disabled={isBusy}
        aria-busy={isBusy ? "true" : undefined}
        className={className ?? "button button-secondary button-small"}
      >
        {isBusy
          ? (isVi ? "Đang xuất..." : "Exporting...")
          : (isVi ? "Xuất dữ liệu (.json)" : "Export data (.json)")}
      </button>
      {errorMessage ? (
        <div
          role="alert"
          style={{
            marginTop: "8px",
            fontSize: "14px",
            color: "#e06c64",
          }}
        >
          {errorMessage}
        </div>
      ) : null}
    </div>
  );
}

export interface AccountExportActionOptions {
  locale: "vi" | "en";
  fetchFn?: typeof fetch;
  triggerDownload?: TriggerDownloadFn;
  onStateChange: (state: AccountExportState) => void;
}

export function createAccountExportAction({
  locale,
  fetchFn,
  triggerDownload,
  onStateChange,
}: AccountExportActionOptions): () => Promise<void> {
  return async function handleExport(): Promise<void> {
    onStateChange({ isBusy: true, errorMessage: null });
    const result = await executeAccountExport({
      fetchFn,
      triggerDownload,
    });
    onStateChange(
      result.ok
        ? { isBusy: false, errorMessage: null }
        : {
            isBusy: false,
            errorMessage: getExportErrorMessage(result.error, locale),
          },
    );
  };
}

export interface AccountExportButtonProps {
  locale: "vi" | "en";
  className?: string;
  fetchFn?: typeof fetch;
  triggerDownload?: TriggerDownloadFn;
  initialBusy?: boolean;
  initialError?: string | null;
}

export function AccountExportButton({
  locale,
  className,
  fetchFn,
  triggerDownload = defaultTriggerDownload,
  initialBusy = false,
  initialError = null,
}: AccountExportButtonProps) {
  const [state, setState] = useState<AccountExportState>({
    isBusy: initialBusy,
    errorMessage: initialError,
  });

  const handleExport = createAccountExportAction({
    locale,
    fetchFn,
    triggerDownload,
    onStateChange: setState,
  });

  return (
    <AccountExportButtonView
      locale={locale}
      className={className}
      isBusy={state.isBusy}
      errorMessage={state.errorMessage}
      onClick={handleExport}
    />
  );
}
