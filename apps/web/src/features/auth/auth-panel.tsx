"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";

import { authClient } from "../../auth/auth-client";
import { createAuthActions } from "./auth-client-actions";
import { withAuthRequestLock } from "./auth-request-lock";
import { GoogleSignInButton } from "./google-sign-in-button";

type AuthPanelProps = {
  callbackURL: string;
  forgotPasswordURL: string;
};

const actions = createAuthActions(authClient);

export function AuthPanel({ callbackURL, forgotPasswordURL }: AuthPanelProps) {
  const t = useTranslations("auth");
  const [mode, setMode] = useState<"signIn" | "signUp">("signUp");
  const [notice, setNotice] = useState<
    | "verification"
    | "signedIn"
    | "resent"
    | "invalidCredentials"
    | "accountExists"
    | "error"
    | null
  >(null);
  const [pending, setPending] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [verificationEmail, setVerificationEmail] = useState<string | null>(null);
  const inFlightRef = useRef(false);

  async function submit(formData: FormData) {
    const submittedEmail = String(formData.get("email") ?? email);
    const submittedPassword = String(formData.get("password") ?? password);
    setEmail(submittedEmail);

    const result = await withAuthRequestLock(inFlightRef, async () => {
      setPending(true);
      setNotice(null);
      if (mode === "signUp") {
        return actions.signUp({
          name: String(formData.get("name") ?? ""),
          email: submittedEmail,
          password: submittedPassword,
          callbackURL,
        });
      }
      return actions.signIn({
        email: submittedEmail,
        password: submittedPassword,
        callbackURL,
      });
    });

    if (result.status === "blocked") {
      return;
    }

    setPending(false);

    if (result.status === "rejected") {
      setNotice("error");
      return;
    }

    const outcome = result.value;
    if (mode === "signUp") {
      if (!outcome.ok) {
        if ("reason" in outcome && outcome.reason === "accountExists") {
          setMode("signIn");
          setEmail(submittedEmail);
          setPassword("");
          setNotice("accountExists");
          return;
        }
        setNotice("error");
        return;
      }
      setVerificationEmail(submittedEmail);
      setNotice("verification");
      return;
    }

    if (!outcome.ok) {
      if ("reason" in outcome && outcome.reason === "verificationRequired") {
        setVerificationEmail(submittedEmail);
        setNotice("verification");
        return;
      }
      setNotice(
        "reason" in outcome && outcome.reason === "invalidCredentials"
          ? "invalidCredentials"
          : "error",
      );
      return;
    }

    setNotice("signedIn");
    if (typeof window !== "undefined") {
      window.location.assign(callbackURL);
    }
  }

  async function resendVerification() {
    if (!verificationEmail) {
      return;
    }

    const result = await withAuthRequestLock(inFlightRef, async () => {
      setPending(true);
      setNotice(null);
      return actions.resendVerification({
        email: verificationEmail,
        callbackURL,
      });
    });

    if (result.status === "blocked") {
      return;
    }

    setPending(false);

    if (result.status === "rejected") {
      setNotice("error");
      return;
    }

    setNotice(result.value.ok ? "resent" : "error");
  }

  async function signInWithGoogle(_callbackURL: string) {
    const result = await withAuthRequestLock(inFlightRef, async () => {
      setPending(true);
      setNotice(null);
      return actions.signInWithGoogle(callbackURL);
    });

    if (result.status === "blocked") {
      return { ok: false };
    }

    setPending(false);

    if (result.status === "rejected") {
      setNotice("error");
      return { ok: false };
    }

    if (!result.value.ok) {
      setNotice("error");
    }
    return result.value;
  }

  return (
    <section className="auth-panel" aria-label={t("panel.title")}>
      <div className="auth-mode" role="tablist">
        <button
          aria-selected={mode === "signUp"}
          onClick={() => {
            setMode("signUp");
            setNotice(null);
            setPassword("");
          }}
          role="tab"
          type="button"
        >
          {t("panel.signUp")}
        </button>
        <button
          aria-selected={mode === "signIn"}
          onClick={() => {
            setMode("signIn");
            setNotice(null);
            setPassword("");
          }}
          role="tab"
          type="button"
        >
          {t("panel.signIn")}
        </button>
      </div>
      <form action={submit} className="auth-form">
        {mode === "signUp" ? (
          <label>
            {t("panel.name")}
            <input name="name" required />
          </label>
        ) : null}
        <label>
          {t("panel.email")}
          <input
            name="email"
            onChange={(e) => setEmail(e.target.value)}
            required
            type="email"
            value={email}
          />
        </label>
        <label>
          {t("panel.password")}
          <input
            minLength={8}
            name="password"
            onChange={(e) => setPassword(e.target.value)}
            required
            type="password"
            value={password}
          />
        </label>
        {mode === "signIn" ? (
          <a href={forgotPasswordURL}>{t("panel.forgotPassword")}</a>
        ) : null}
        <button className="button" disabled={pending} type="submit">
          {pending
            ? t("panel.pending")
            : mode === "signUp"
              ? t("panel.signUp")
              : t("panel.signIn")}
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
          <button
            className="button"
            disabled={pending}
            onClick={() => void resendVerification()}
            type="button"
          >
            {pending ? t("panel.pending") : t("verification.resend")}
          </button>
        </div>
      ) : null}
      {notice === "resent" ? (
        <p className="form-notice" role="status">
          {t("verification.resent")}
        </p>
      ) : null}
      {notice === "signedIn" ? (
        <p className="form-notice" role="status">
          {t("panel.signedIn")}
        </p>
      ) : null}
      {notice === "accountExists" ? (
        <p className="form-notice" role="status">
          {t("panel.accountExists")}
        </p>
      ) : null}
      {notice === "invalidCredentials" ? (
        <p className="form-error" role="alert">
          {t("panel.invalidCredentials")}
        </p>
      ) : null}
      {notice === "error" ? (
        <p className="form-error" role="alert">
          {t("panel.error")}
        </p>
      ) : null}
    </section>
  );
}
