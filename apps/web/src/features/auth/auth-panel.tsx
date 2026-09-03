"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { authClient } from "../../auth/auth-client";
import { createAuthActions } from "./auth-client-actions";
import { GoogleSignInButton } from "./google-sign-in-button";

type AuthPanelProps = {
  callbackURL: string;
};

const actions = createAuthActions(authClient);

export function AuthPanel({ callbackURL }: AuthPanelProps) {
  const t = useTranslations("auth");
  const [mode, setMode] = useState<"signIn" | "signUp">("signUp");
  const [notice, setNotice] = useState<"verification" | "signedIn" | "resent" | "error" | null>(null);
  const [pending, setPending] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState<string | null>(null);

  async function submit(formData: FormData) {
    setPending(true);
    setNotice(null);
    const email = String(formData.get("email") ?? "");
    const password = String(formData.get("password") ?? "");
    const outcome = mode === "signUp"
      ? await actions.signUp({
          name: String(formData.get("name") ?? ""),
          email,
          password,
          callbackURL,
        })
      : await actions.signIn({ email, password, callbackURL });
    setPending(false);
    if (!outcome.ok) {
      setNotice("error");
      return;
    }

    if (mode === "signUp") {
      setVerificationEmail(email);
      setNotice("verification");
      return;
    }

    setNotice("signedIn");
  }

  async function resendVerification() {
    if (!verificationEmail) {
      return;
    }

    setPending(true);
    setNotice(null);
    const outcome = await actions.resendVerification({
      email: verificationEmail,
      callbackURL,
    });
    setPending(false);
    setNotice(outcome.ok ? "resent" : "error");
  }

  async function signInWithGoogle(_callbackURL: string) {
    setPending(true);
    setNotice(null);
    const outcome = await actions.signInWithGoogle(callbackURL);
    setPending(false);
    if (!outcome.ok) {
      setNotice("error");
    }
    return outcome;
  }

  return (
    <section className="auth-panel" aria-label={t("panel.title")}>
      <div className="auth-mode" role="tablist">
        <button
          aria-selected={mode === "signUp"}
          onClick={() => setMode("signUp")}
          role="tab"
          type="button"
        >
          {t("panel.signUp")}
        </button>
        <button
          aria-selected={mode === "signIn"}
          onClick={() => setMode("signIn")}
          role="tab"
          type="button"
        >
          {t("panel.signIn")}
        </button>
      </div>
      <form action={submit} className="auth-form">
        {mode === "signUp" ? (
          <label>{t("panel.name")}<input name="name" required /></label>
        ) : null}
        <label>{t("panel.email")}<input name="email" required type="email" /></label>
        <label>{t("panel.password")}<input minLength={8} name="password" required type="password" /></label>
        <button className="button" disabled={pending} type="submit">
          {pending ? t("panel.pending") : mode === "signUp" ? t("panel.signUp") : t("panel.signIn")}
        </button>
      </form>
      <GoogleSignInButton
        callbackURL={callbackURL}
        disabled={pending}
        label={t("panel.google")}
        onSignIn={signInWithGoogle}
      />
      {notice === "verification" ? (
        <div className="form-notice" role="status">
          <p>{t("verification.checkOrResend")}</p>
          <button className="button" disabled={pending} onClick={() => void resendVerification()} type="button">
            {pending ? t("panel.pending") : t("verification.resend")}
          </button>
        </div>
      ) : null}
      {notice === "resent" ? <p className="form-notice" role="status">{t("verification.resent")}</p> : null}
      {notice === "signedIn" ? <p className="form-notice" role="status">{t("panel.signedIn")}</p> : null}
      {notice === "error" ? <p className="form-error" role="alert">{t("panel.error")}</p> : null}
    </section>
  );
}
