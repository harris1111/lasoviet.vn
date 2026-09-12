"use client";

import React, { useState, useTransition } from "react";

const h = React.createElement;

export type ActionResult = {
  ok: boolean;
  error?: string;
};

type ClientAction = () => Promise<ActionResult>;

export function SignOutButton({
  action,
  label,
}: {
  action: ClientAction;
  label: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleSignOut = () => {
    setError(null);
    startTransition(async () => {
      const res = await action();
      if (res && !res.ok && res.error) {
        setError(res.error);
      }
    });
  };

  return h(
    "div",
    null,
    h(
      "button",
      {
        type: "button",
        onClick: handleSignOut,
        disabled: isPending,
        className: "account-signout-button",
        "aria-label": label,
      },
      isPending ? "..." : label,
    ),
    error
      ? h(
          "span",
          { role: "alert", style: { fontSize: "12px", color: "#e06c64", marginLeft: "8px" } },
          error,
        )
      : null,
  );
}

export function ProfileDeleteButton({
  action,
  locale,
  label,
  confirmText,
  cancelText,
  deletingText,
}: {
  action: ClientAction;
  locale: "en" | "vi";
  label?: string;
  confirmText?: string;
  cancelText?: string;
  deletingText?: string;
}) {
  const isEn = locale === "en";
  const btnLabel = label ?? (isEn ? "Delete profile" : "Xoá hồ sơ");
  const confirmLabel = confirmText ?? (isEn ? "Confirm" : "Xác nhận");
  const cancelLabel = cancelText ?? (isEn ? "Cancel" : "Huỷ");
  const deletingLabel = deletingText ?? (isEn ? "Deleting..." : "Đang xoá...");

  const [isConfirming, setIsConfirming] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleDelete = () => {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (!result.ok) {
        setError(result.error ?? (isEn ? "Failed to delete profile" : "Xoá hồ sơ thất bại"));
        setIsConfirming(false);
      }
    });
  };

  if (isConfirming) {
    return h(
      "div",
      { style: { display: "inline-flex", alignItems: "center", gap: "8px" } },
      h(
        "button",
        {
          type: "button",
          onClick: handleDelete,
          disabled: isPending,
          className: "account-btn account-btn-danger",
        },
        isPending ? deletingLabel : confirmLabel,
      ),
      h(
        "button",
        {
          type: "button",
          onClick: () => setIsConfirming(false),
          disabled: isPending,
          className: "account-btn",
        },
        cancelLabel,
      ),
      error
        ? h(
            "span",
            { role: "alert", style: { fontSize: "12px", color: "#e06c64" } },
            error,
          )
        : null,
    );
  }

  return h(
    "div",
    null,
    h(
      "button",
      {
        type: "button",
        onClick: () => setIsConfirming(true),
        className: "account-btn account-btn-danger",
        "aria-label": btnLabel,
      },
      btnLabel,
    ),
    error
      ? h(
          "div",
          { role: "alert", style: { fontSize: "12px", color: "#e06c64", marginTop: "4px" } },
          error,
        )
      : null,
  );
}

export function AccountDeletionForm({
  action,
  locale,
  buttonLabel,
  modalTitle: _modalTitle,
  modalDesc,
  ackText,
  confirmText,
  cancelText,
  requestingText,
}: {
  action: ClientAction;
  locale: "en" | "vi";
  buttonLabel?: string;
  modalTitle?: string;
  modalDesc?: string;
  ackText?: string;
  confirmText?: string;
  cancelText?: string;
  requestingText?: string;
}) {
  const isEn = locale === "en";
  const btnLabel = buttonLabel ?? (isEn ? "Request data deletion" : "Yêu cầu xoá dữ liệu");
  const descLabel = modalDesc ?? (isEn
    ? "You are requesting deletion of your account and all data. This action is irreversible once the recovery window expires."
    : "Bạn sắp yêu cầu xoá toàn bộ hồ sơ lá số và báo cáo. Hành động này không thể hoàn tác sau khi hoàn tất thời gian khôi phục.");
  const acknowledgeLabel = ackText ?? (isEn
    ? "I understand financial transaction records are preserved separately under statutory accounting obligations."
    : "Tôi hiểu dữ liệu giao dịch kế toán liên quan vẫn được lưu trữ độc lập theo nghĩa vụ pháp lý.");
  const confirmLabel = confirmText ?? (isEn ? "Confirm" : "Xác nhận");
  const cancelLabel = cancelText ?? (isEn ? "Cancel" : "Huỷ");
  const requestingLabel = requestingText ?? (isEn ? "Requesting..." : "Đang yêu cầu...");

  const [isOpen, setIsOpen] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!acknowledged) return;
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (result && !result.ok && result.error) {
        setError(result.error);
      }
    });
  };

  if (!isOpen) {
    return h(
      "button",
      {
        type: "button",
        onClick: () => setIsOpen(true),
        className: "account-btn account-btn-danger",
      },
      btnLabel,
    );
  }

  return h(
    "div",
    {
      style: {
        background: "var(--lacquer-800, #171410)",
        border: "1px solid var(--son-deep, #6b211a)",
        borderRadius: "8px",
        padding: "20px 24px",
      },
    },
    h(
      "p",
      { style: { margin: 0, fontSize: "14.5px", lineHeight: 1.6, color: "var(--pearl-200)" } },
      descLabel,
    ),
    h(
      "form",
      { onSubmit: handleSubmit, style: { marginTop: "16px" } },
      h(
        "label",
        {
          style: {
            display: "flex",
            alignItems: "flex-start",
            gap: "10px",
            fontSize: "13.5px",
            color: "var(--pearl-400)",
            cursor: "pointer",
          },
        },
        h("input", {
          type: "checkbox",
          checked: acknowledged,
          onChange: (e: React.ChangeEvent<HTMLInputElement>) => setAcknowledged(e.target.checked),
          style: { marginTop: "3px" },
        }),
        h("span", null, acknowledgeLabel),
      ),
      error
        ? h(
            "div",
            { role: "alert", style: { marginTop: "12px", fontSize: "13px", color: "#e06c64" } },
            error,
          )
        : null,
      h(
        "div",
        { style: { marginTop: "18px", display: "flex", gap: "12px" } },
        h(
          "button",
          {
            type: "submit",
            disabled: !acknowledged || isPending,
            className: "account-btn account-btn-danger",
          },
          isPending ? requestingLabel : confirmLabel,
        ),
        h(
          "button",
          {
            type: "button",
            onClick: () => {
              setIsOpen(false);
              setError(null);
            },
            disabled: isPending,
            className: "account-btn",
          },
          cancelLabel,
        ),
      ),
    ),
  );
}

export function CancelDeletionButton({
  action,
  locale,
  label,
  cancellingText,
}: {
  action: ClientAction;
  locale: "en" | "vi";
  label?: string;
  cancellingText?: string;
}) {
  const isEn = locale === "en";
  const btnLabel = label ?? (isEn ? "Cancel deletion request" : "Huỷ yêu cầu xoá dữ liệu");
  const cancellingLabel = cancellingText ?? (isEn ? "Cancelling..." : "Đang huỷ...");

  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleCancel = () => {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (!result.ok) {
        setError(result.error ?? (isEn ? "Failed to cancel deletion" : "Huỷ yêu cầu thất bại"));
      }
    });
  };

  return h(
    "div",
    null,
    h(
      "button",
      {
        type: "button",
        onClick: handleCancel,
        disabled: isPending,
        className: "account-btn",
      },
      isPending ? cancellingLabel : btnLabel,
    ),
    error
      ? h(
          "div",
          { role: "alert", style: { marginTop: "8px", fontSize: "13px", color: "#e06c64" } },
          error,
        )
      : null,
  );
}
