"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { authClient } from "../../auth/auth-client";
import { createAuthActions } from "./auth-client-actions";

type PasswordResetFormProps = {
  token?: string;
  invalidToken: boolean;
};

const actions = createAuthActions(authClient);

export function PasswordResetForm({ token, invalidToken }: PasswordResetFormProps) {
  const t = useTranslations("auth.passwordReset");
  const [notice, setNotice] = useState<"complete" | "invalidToken" | "error" | null>(
    invalidToken || !token ? "invalidToken" : null,
  );
  const [pending, setPending] = useState(false);

  async function submit(formData: FormData) {
    if (!token) {
      setNotice("invalidToken");
      return;
    }
    setPending(true);
    setNotice(null);
    const outcome = await actions.resetPassword({
      newPassword: String(formData.get("password") ?? ""),
      token,
    });
    setPending(false);
    if (outcome.ok) {
      setNotice("complete");
      return;
    }
    setNotice(outcome.reason === "invalidToken" ? "invalidToken" : "error");
  }

  return (
    <section className="auth-panel" aria-label={t("completeTitle")}>
      <form action={submit} className="auth-form">
        <label>
          {t("newPassword")}
          <input disabled={pending || !token} minLength={8} name="password" required type="password" />
        </label>
        <button className="button" disabled={pending || !token} type="submit">
          {pending ? t("pending") : t("completeAction")}
        </button>
      </form>
      {notice === "complete" ? <p className="form-notice" role="status">{t("complete")}</p> : null}
      {notice === "invalidToken" ? <p className="form-error" role="alert">{t("invalidToken")}</p> : null}
      {notice === "error" ? <p className="form-error" role="alert">{t("error")}</p> : null}
    </section>
  );
}
