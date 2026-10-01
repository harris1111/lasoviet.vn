"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import type { NormalizedZiweiChartV1, ZiweiEvidenceViewV1 } from "@lasoviet/contracts";
import { EvidenceDrawer } from "../evidence/evidence-drawer";
import { ReportScoreExplainer } from "../reports/report-chart-visuals";
import { PartFeedback } from "../reports/part-feedback";
import { ZiweiChart } from "./ziwei-chart";
import type { FreeResultModel } from "./ziwei-free-result-model";
import type { ZiweiPresentationLocale } from "./ziwei-presentation";
import {
  CANONICAL_RESULT_TABS, CANONICAL_ID_TO_EVIDENCE_SUFFIX,
  EVIDENCE_SUFFIX_TO_CANONICAL_ID, buildCanonicalTabUrl,
  type ParsedResultTabState, type ZiweiResultTab,
} from "./ziwei-tabs-state";

export type ZiweiFreeResultProps = {
  chart: NormalizedZiweiChartV1;
  chartId: string;
  basePath: string;
  locale: ZiweiPresentationLocale;
  initialState: ParsedResultTabState;
  model: FreeResultModel;
  signInHref: string;
  loadEvidence(chartId: string, evidenceId: string): Promise<
    { ok: true; value: ZiweiEvidenceViewV1 } | { ok: false; error: { code: string } }
  >;
};

export function ZiweiFreeResult({
  chart, chartId, basePath, locale, initialState, model, signInHref, loadEvidence,
}: ZiweiFreeResultProps) {
  const t = useTranslations("ziwei");
  const reportT = useTranslations("reports");
  const router = useRouter();
  const [askEligible, setAskEligible] = useState(false);
  const completionRef = useRef<HTMLElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const tabListRef = useRef<HTMLDivElement>(null);
  const selected = model.palaces.find((palace) => palace.id === model.selectedPalaceId)!;
  const others = model.palaces.filter((palace) => palace.id !== selected.id);
  const previewPalace = (initialState.tab === "palaces" || initialState.tab === "topics")
    ? model.palaces.find((palace) => palace.id === `ziwei.palace.${initialState.open}`)
    : undefined;
  const offerHref = `${basePath}/chon-luan-giai`;

  useEffect(() => {
    const node = completionRef.current;
    if (!node || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) setAskEligible(true);
    }, { threshold: 0.2 });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (window.matchMedia("(min-width: 1024px)").matches || initialState.tab === "chart") return;
    const frame = requestAnimationFrame(() => {
      document.getElementById(`panel-${initialState.tab}`)?.scrollIntoView({ block: "start" });
    });
    return () => cancelAnimationFrame(frame);
  }, [initialState.tab]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog || !previewPalace) return;
    const tabs = tabListRef.current;
    const panel = document.getElementById(`panel-${initialState.tab}`);
    queueMicrotask(() => setAskEligible(true));
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialog.showModal();
    return () => {
      dialog.close();
      document.body.style.overflow = previousOverflow;
      const trigger = triggerRef.current;
      const activeTab = tabs?.querySelector<HTMLButtonElement>('[aria-selected="true"]');
      const target = trigger?.isConnected && trigger.getClientRects().length ? trigger
        : activeTab?.getClientRects().length ? activeTab
        : panel;
      target?.focus({ preventScroll: true });
    };
  }, [previewPalace, initialState.tab]);

  function navigate(tab: ZiweiResultTab, open?: string) {
    router.push(buildCanonicalTabUrl(basePath, { tab, open }), { scroll: false });
  }
  function openPreview(suffix: string, trigger: HTMLButtonElement, tab: "palaces" | "topics") {
    triggerRef.current = trigger;
    setAskEligible(true);
    navigate(tab, suffix);
  }
  function closePreview() {
    navigate(initialState.tab);
  }
  function tabKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const count = CANONICAL_RESULT_TABS.length;
    const next = event.key === "ArrowRight" ? (index + 1) % count
      : event.key === "ArrowLeft" ? (index + count - 1) % count
      : event.key === "Home" ? 0 : event.key === "End" ? count - 1 : null;
    if (next === null) return;
    event.preventDefault();
    navigate(CANONICAL_RESULT_TABS[next]!);
    tabListRef.current?.querySelectorAll<HTMLButtonElement>("[role=tab]")[next]?.focus();
  }
  function score(palace: typeof selected) {
    return <span className="fd109-score">{palace.score} · {reportT(`reader.score_band_${palace.band}`)}</span>;
  }

  return (
    <div className="fd109 container" data-active-tab={initialState.tab} data-testid="fd109-free-result">
      <div className="fd109-tabs" role="tablist" aria-label={t("tabs.ariaLabel")} ref={tabListRef}>
        {CANONICAL_RESULT_TABS.map((tab, index) => (
          <button key={tab} id={`tab-${tab}`} role="tab" aria-controls={`panel-${tab}`}
            aria-selected={tab === initialState.tab} tabIndex={tab === initialState.tab ? 0 : -1}
            onClick={() => navigate(tab)} onKeyDown={(event) => tabKeyDown(event, index)} type="button">
            {t(`tabs.${tab}`)}
          </button>
        ))}
      </div>
      <div className="fd109-layout">
        <aside className="fd109-chart" data-free-result-block="chart" aria-label={t("tabs.chart")} id="panel-chart" tabIndex={-1}>
          <ZiweiChart chart={chart} locale={locale} />
        </aside>
        <div className="fd109-main">
          <section className="fd109-block" id="panel-overview" data-free-result-block="insights" data-tab="overview"
            aria-labelledby="fd109-insights-title" tabIndex={-1}>
            <p className="eyebrow">02</p>
            <h2 id="fd109-insights-title">{t("freeResult.insights")}</h2>
            {chart.provisional && <p role="status">{t("provisional.insightsDisclaimer")}</p>}
            {model.insights.map((insight) => (
              <article key={insight.id}>
                <h3>{insight.title}</h3><p>{insight.description}</p>
                <PartFeedback locale={locale} chartId={chartId} partId={insight.id} sku="free-result" />
                <EvidenceDrawer chart={chart} chartId={chartId} locale={locale}
                  evidenceId={insight.evidenceId} loadEvidence={loadEvidence} isOpen={false}
                  onOpenChange={(open) => {
                    if (open) navigate("evidence", CANONICAL_ID_TO_EVIDENCE_SUFFIX[insight.evidenceId]);
                  }} />
              </article>
            ))}
            {model.isGuest && <div className="fd109-save">
              <p>{t("freeResult.saveDescription")}</p>
              <Link className="button button-secondary" href={signInHref}>{t("freeResult.save")}</Link>
            </div>}
          </section>
          <section className="fd109-block" data-free-result-block="free-palace" data-palace-id={selected.id} data-tab="overview">
            <p className="eyebrow">06 · {t("freeResult.structuralPreview")}</p>
            <h2>{selected.name}</h2>
            {score(selected)}<p>{selected.facts}</p>
            <p>{t("freeResult.fallback")}</p>
          </section>
          <section className="fd109-block" data-free-result-block="scores" data-tab="chart">
            <p className="eyebrow">03</p><h2>{t("freeResult.scores")}</h2>
            <p>{t("freeResult.scoreDescription")}</p>
            <ul className="fd109-score-list">
              {model.palaces.map((palace) => <li key={palace.id}><span>{palace.name}</span>{score(palace)}</li>)}
            </ul>
            <ReportScoreExplainer t={reportT} />
          </section>
          <section className="fd109-block" id="panel-nam-nay" data-free-result-block="year" data-tab="nam-nay" tabIndex={-1}>
            <p className="eyebrow">04</p><h2>{t("freeResult.year")}{model.annual ? ` ${model.annual.year}` : ""}</h2>
            {model.annual ? <>
              <div className="fd109-counts">
                <p><strong>{model.annual.caution}</strong>{t("freeResult.cautionMonths")}</p>
                <p><strong>{model.annual.favorable}</strong>{t("freeResult.favorableMonths")}</p>
                <p><strong>{model.annual.neutral}</strong>{t("freeResult.neutralMonths")}</p>
              </div>
              <p>{t("freeResult.monthsMasked")}</p>
            </> : <p>{t("freeResult.yearUnavailable")}</p>}
          </section>
          <section className="fd109-block" id="panel-palaces" data-free-result-block="palaces" data-tab="palaces" tabIndex={-1}>
            <p className="eyebrow">07</p><h2>{t("freeResult.palaces", { count: others.length })}</h2>
            <div className="fd109-map">
              {others.map((palace) => <article key={palace.id}>
                <div><h3>{palace.name}</h3>{score(palace)}</div>
                <p>{palace.facts}</p>
                <button type="button" data-testid="fd109-palace-preview"
                  onClick={(event) => openPreview(palace.id.split(".").pop()!, event.currentTarget, "palaces")}>
                  {t("freeResult.preview")} · {palace.name}
                </button>
              </article>)}
            </div>
          </section>
          <section className="fd109-block" id="panel-topics" data-free-result-block="topics" data-tab="topics" tabIndex={-1}>
            <p className="eyebrow">08</p><h2>{t("tabs.topics")}</h2>
            <p>{t("freeResult.topicDescription")}</p>
            <div className="fd109-map">
              {model.palaces.map((palace) => <article key={palace.id}>
                <h3>{palace.name}</h3><p>{palace.facts}</p>
                <button type="button" onClick={(event) => openPreview(palace.id.split(".").pop()!, event.currentTarget, "topics")}>
                  {t("freeResult.preview")} · {palace.name}
                </button>
              </article>)}
            </div>
          </section>
          <section className="fd109-block" id="panel-evidence" data-free-result-block="evidence" data-tab="evidence" tabIndex={-1}>
            <h2>{t("tabs.evidence")}</h2>
            {Object.entries(EVIDENCE_SUFFIX_TO_CANONICAL_ID).map(([suffix, evidenceId]) => (
              <div key={evidenceId}>
                <EvidenceDrawer chart={chart} chartId={chartId} locale={locale} evidenceId={evidenceId}
                  loadEvidence={loadEvidence} isOpen={initialState.tab === "evidence" && initialState.open === suffix}
                  onOpenChange={(open) => navigate("evidence", open ? CANONICAL_ID_TO_EVIDENCE_SUFFIX[evidenceId] : undefined)} />
              </div>
            ))}
          </section>
          <section className="fd109-block fd109-completion" data-free-result-block="completion" data-tab="topics"
            data-testid="fd109-completion" ref={completionRef}>
            <p className="eyebrow">09 · {t("freeResult.complete")}</p>
            <h2>{t("freeResult.bridge")}</h2>
            <p>{t("freeResult.bridgeDescription")}</p>
            <div className="fd109-counts">
              <p><strong>{model.insights.length}</strong>{t("freeResult.insightCount")}</p>
              <p><strong>{model.palaces.length}</strong>{t("freeResult.palaceCount")}</p>
            </div>
            <Link className="button" href={offerHref}>{t("freeResult.choose")}</Link>
          </section>
        </div>
      </div>
      <div className="fd109-sticky" data-testid="fd109-sticky" hidden={!askEligible}>
        <span>{t("freeResult.stickyContext")}</span>
        <Link className="button" href={offerHref}>{t("freeResult.choose")}</Link>
      </div>
      <dialog className="fd109-preview" data-testid="fd109-preview-dialog" ref={dialogRef}
        aria-labelledby="fd109-preview-title" onCancel={(event) => { event.preventDefault(); closePreview(); }}
        onClick={(event) => { if (event.target === event.currentTarget) closePreview(); }}>
        <div>
          <button className="fd109-close" autoFocus type="button" onClick={closePreview}>{t("freeResult.close")}</button>
          <h2 id="fd109-preview-title">{previewPalace?.name ?? t("freeResult.preview")}</h2>
          {previewPalace && <>{score(previewPalace)}<p>{previewPalace.facts}</p></>}
          <p>{t("freeResult.previewDescription")}</p>
          <div className="fd109-blur" aria-hidden="true"><i /><i /><i /></div>
          <Link className="button" href={offerHref}>{t("freeResult.choose")}</Link>
        </div>
      </dialog>
    </div>
  );
}
