"use client";
import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { ReportNotificationViewV1Schema, type ReportNotificationViewV1 } from "@lasoviet/contracts";

type Props = {reportId: string; reportVersionId: string; locale: "vi" | "en"};
export function ReportNotification(props: Props) {
  return <ReportNotificationBody key={`${props.reportId}:${props.reportVersionId}:${props.locale}`} {...props} />;
}
function ReportNotificationBody({reportId, reportVersionId, locale}: Props) {
  const t = useTranslations("reports.notification");
  const [view, setView] = useState<ReportNotificationViewV1 | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const alive = useRef(false);
  const endpoint = `/api/reports/${encodeURIComponent(reportId)}/notification`;
  function accept(value: unknown) {
    const parsed = ReportNotificationViewV1Schema.safeParse(value);
    if (!parsed.success || parsed.data.reportId !== reportId || parsed.data.reportVersionId !== reportVersionId || parsed.data.locale !== locale) throw new Error("REPORT_NOTICE_RESPONSE_INVALID");
    return parsed.data;
  }
  useEffect(() => {
    alive.current = true;
    const abort = new AbortController();
    fetch(endpoint, {credentials: "same-origin", cache: "no-store", signal: abort.signal})
      .then(async response => { if (!response.ok) throw new Error("REPORT_NOTICE_UNAVAILABLE"); return accept(await response.json()); })
      .then(value => {if (alive.current) {setView(value);setError(false);}})
      .catch(() => {if (alive.current && !abort.signal.aborted) setError(true);});
    return () => {alive.current = false;abort.abort();};
    // The parent keys this component by immutable report identity.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endpoint, reportVersionId, locale]);
  async function command(action: "subscribe" | "cancel") {
    if (busy) return;
    setBusy(true);setError(false);
    try {
      const response = await fetch(endpoint, {method: "POST", credentials: "same-origin", cache: "no-store",
        headers: {"content-type": "application/json"}, body: JSON.stringify({version: 1, reportVersionId, action})});
      if (!response.ok) throw new Error("REPORT_NOTICE_UNAVAILABLE");
      const next = accept(await response.json());
      if (alive.current) setView(next);
    } catch {if (alive.current) setError(true);}
    finally {if (alive.current) setBusy(false);}
  }
  const active = view?.state === "subscribed";
  const terminal = view && ["captured", "already_notified", "suppressed"].includes(view.state);
  return <section className="report-progress-card report-notification" aria-label={t("title")}>
    <p>{t("description")}</p>
    {view && !terminal && <button type="button" className="button button-secondary" disabled={busy}
      onClick={() => void command(active ? "cancel" : "subscribe")}>{t(busy ? "saving" : active ? "cancel" : "subscribe")}</button>}
    {active && <p role="status">{t("registered")}</p>}
    {terminal && <p role="status">{t(view.state === "suppressed" ? "suppressed" : "processed")}</p>}
    <p>{t("automatic_notice")}</p>
    {error && <p role="alert">{t("error")}</p>}
  </section>;
}
