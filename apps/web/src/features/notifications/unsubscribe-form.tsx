"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";

export type FormState = "initializing" | "ready" | "no_token" | "submitting" | "success" | "error";

export type UnsubscribeFormProps = {
  locale?: "vi" | "en";
  fetchFn?: typeof fetch;
  initialToken?: string | null;
};

export function UnsubscribeFormView({
  state,
  onConfirm,
  homeHref,
  t,
}: {
  state: FormState;
  onConfirm: () => void;
  homeHref: string;
  t: (key: string) => string;
}) {
  if (state === "initializing") {
    return (
      <div className="unsubscribe-panel">
        <p>{t("submitting")}</p>
      </div>
    );
  }

  if (state === "success") {
    return (
      <div className="unsubscribe-panel" role="status" aria-live="polite">
        <h2>{t("success_title")}</h2>
        <p>{t("success_message")}</p>
        <a href={homeHref} className="btn-secondary">{t("back_to_home")}</a>
      </div>
    );
  }

  if (state === "error") {
    return (
      <div className="unsubscribe-panel" role="alert">
        <h2>{t("error_title")}</h2>
        <p>{t("error_invalid_or_expired")}</p>
        <a href={homeHref} className="btn-secondary">{t("back_to_home")}</a>
      </div>
    );
  }

  if (state === "no_token") {
    return (
      <div className="unsubscribe-panel" role="alert">
        <h2>{t("error_title")}</h2>
        <p>{t("error_no_token")}</p>
        <a href={homeHref} className="btn-secondary">{t("back_to_home")}</a>
      </div>
    );
  }

  return (
    <div className="unsubscribe-panel">
      <p className="unsubscribe-description">{t("description")}</p>
      <button
        type="button"
        className="btn-primary"
        onClick={onConfirm}
        disabled={state === "submitting"}
      >
        {state === "submitting" ? t("submitting") : t("confirm_button")}
      </button>
    </div>
  );
}

export function UnsubscribeForm({
  locale = "vi",
  fetchFn,
  initialToken = null,
}: UnsubscribeFormProps) {
  const t = useTranslations("notifications.unsubscribe");
  const [token, setToken] = useState<string | null>(initialToken);
  const [state, setState] = useState<FormState>(initialToken ? "ready" : "initializing");

  // StrictMode duplicate effect guard
  const hasInitializedRef = useRef(false);
  const isSubmittingRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (hasInitializedRef.current) return;
    hasInitializedRef.current = true;

    if (initialToken) {
      return;
    }

    const hash = window.location.hash;
    const cleanHash = hash.startsWith("#") ? hash.slice(1) : hash;
    const params = new URLSearchParams(cleanHash);
    const parsedToken = params.get("token")?.trim() ?? null;

    if (parsedToken) {
      // Remove fragment from address using history replace without logging it
      window.history.replaceState(
        null,
        "",
        window.location.pathname + window.location.search,
      );
    }

    queueMicrotask(() => {
      if (parsedToken) {
        setToken(parsedToken);
        setState("ready");
      } else {
        setState("no_token");
      }
    });
  }, [initialToken]);

  async function handleConfirm() {
    if (!token || isSubmittingRef.current || state === "submitting") return;
    isSubmittingRef.current = true;
    setState("submitting");

    const doFetch = fetchFn ?? fetch;
    try {
      const response = await doFetch("/api/notifications/unsubscribe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "same-origin",
        body: JSON.stringify({ token }),
      });

      if (response.ok) {
        setState("success");
      } else {
        setState("error");
      }
    } catch {
      setState("error");
    } finally {
      isSubmittingRef.current = false;
    }
  }

  const homeHref = locale === "en" ? "/en" : "/";

  return (
    <UnsubscribeFormView
      state={state}
      onConfirm={handleConfirm}
      homeHref={homeHref}
      t={t}
    />
  );
}
