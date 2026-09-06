"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { authClient } from "../../auth/auth-client";
import { createAuthActions } from "./auth-client-actions";

type PasswordResetRequestPanelProps = {
  resetPasswordURL: string;
};

const actions = createAuthActions(authClient);

export function PasswordResetRequestPanel({
  resetPasswordURL,
}: PasswordResetRequestPanelProps) {
  const t = useTranslations("auth.passwordReset");
  const [notice, setNotice] = useState<"sent" | "error" | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(formData: FormData) {
    setPending(true);
    setNotice(null);
    const outcome = await actions.requestPasswordReset({
      email: String(formData.get("email") ?? ""),
      redirectTo: new URL(resetPasswordURL, window.location.origin).href,
    });
    setPending(false);
    setNotice(outcome.ok ? "sent" : "error");
  }

  return (
    <section className="auth-panel" aria-label={t("requestTitle")}>
      <form action={submit} className="auth-form">
        <label>{t("email")}<input name="email" required type="email" /></label>
        <button className="button" disabled={pending} type="submit">
          {pending ? t("pending") : t("request")}
        </button>
      </form>
      {notice === "sent" ? <p className="form-notice" role="status">{t("sent")}</p> : null}
      {notice === "error" ? <p className="form-error" role="alert">{t("error")}</p> : null}
    </section>
  );
}
