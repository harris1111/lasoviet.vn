"use client";

import { useEffect, useRef, useState, useSyncExternalStore, type KeyboardEvent } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { CANONICAL_PALACE_SKU_MAP, type LaSku, type ZiweiPalaceId } from "@lasoviet/contracts";
import { ContextualUnlock } from "../commerce/contextual-unlock";
import type { NormalizedZiweiChartV1, ZiweiBirthSummaryV1, ZiweiEvidenceViewV1 } from "@lasoviet/contracts";
import { sendBrowserAnalyticsEvent } from "../../analytics/browser-analytics";
import { createFreeResultAnalytics } from "./free-result-analytics";
import { createEngagementReporter } from "./free-palace-engagement-reporter";
import { FreePalaceGiftBlock } from "./free-palace-gift-block";
import { EvidenceDrawer } from "../evidence/evidence-drawer";
import { ReportPalaceRadar, ReportScoreExplainer } from "../reports/report-chart-visuals";
import { PartFeedback } from "../reports/part-feedback";
import { SecureLockedPreview } from "./secure-locked-preview";
import { ZiweiChart } from "./ziwei-chart";
import { ZiweiChartSheet } from "./ziwei-chart-sheet";
import { hasSheetMarker, planSheetClose, readResultView, sameView, writeResultView, type ResultSheet, type ResultView } from "./ziwei-result-history";
import type { FreeResultModel } from "./ziwei-free-result-model";
import { ziweiPresentation, type ZiweiPresentationLocale } from "./ziwei-presentation";
import {
  CANONICAL_RESULT_TABS, CANONICAL_ID_TO_EVIDENCE_SUFFIX,
  EVIDENCE_SUFFIX_TO_CANONICAL_ID,
  type ParsedResultTabState, type ZiweiResultTab,
} from "./ziwei-tabs-state";

export type ZiweiFreeResultProps = {
  chart: NormalizedZiweiChartV1;
  birthSummary?: ZiweiBirthSummaryV1;
  chartId: string;
  chartVersionId: string;
  basePath: string;
  locale: ZiweiPresentationLocale;
  initialState: ParsedResultTabState;
  model: FreeResultModel;
  signInHref: string;
  // Optional, user-action only: tells the server which tab the reader opened (see recordFreePalaceEngagement).
  recordEngagement?: (tab: string) => Promise<void>;
  loadEvidence(chartId: string, evidenceId: string): Promise<
    { ok: true; value: ZiweiEvidenceViewV1 } | { ok: false; error: { code: string } }
  >;
};

function subscribeDesktop(callback: () => void) {
  const media = window.matchMedia("(min-width: 1024px)");
  media.addEventListener("change", callback);
  return () => media.removeEventListener("change", callback);
}
function subscribeWide(callback: () => void) {
  const media = window.matchMedia("(min-width: 1100px)");
  media.addEventListener("change", callback);
  return () => media.removeEventListener("change", callback);
}
function wideSnapshot() { return window.matchMedia("(min-width: 1100px)").matches; }
function desktopSnapshot() { return window.matchMedia("(min-width: 1024px)").matches; }
const mobileAnchors: Record<ZiweiResultTab, string> = {
  chart: "free-result-board", overview: "panel-overview", "nam-nay": "panel-nam-nay",
  palaces: "panel-palaces", topics: "panel-topics", evidence: "panel-evidence",
};

export function ZiweiFreeResult({
  chart, birthSummary, chartId, chartVersionId, basePath, locale, initialState, model, signInHref, loadEvidence, recordEngagement,
}: ZiweiFreeResultProps) {
  const t = useTranslations("ziwei");
  const reportT = useTranslations("reports");
  const presentation = ziweiPresentation(locale);
  const desktop = useSyncExternalStore(subscribeDesktop, desktopSnapshot, () => false);
  const wide = useSyncExternalStore(subscribeWide, wideSnapshot, () => false);
  const [askEligible, setAskEligible] = useState(false);
  // FE-3 / N7: tab, preview and sheet are local state (instant), the address bar is synced with the native
  // History API (no server round trip). popstate restores state for Back/Forward.
  const [view, setView] = useState<ResultView>(initialState);
  const chartExpanded = view.sheet === "chart";
  const periodPreview = view.sheet === "period";
  const [selectedChartPalace, setSelectedChartPalace] = useState<string>(chart.soulPalaceId);
  const analyticsRef = useRef(createFreeResultAnalytics(locale, model.gift ? "validated_artifact" : "structural"));
  const completionRef = useRef<HTMLElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const tabListRef = useRef<HTMLDivElement>(null);
  const selected = model.palaces.find((palace) => palace.id === model.selectedPalaceId)!;
  const others = model.palaces.filter((palace) => palace.id !== selected.id);
  const previewTopic = view.tab === "topics" ? model.topics.find((topic) => topic.id === view.open) : undefined;
  const previewPalace = (view.tab === "palaces" || view.tab === "topics")
    ? model.palaces.find((palace) => palace.id === `ziwei.palace.${view.open}`) : undefined;
  const previewId = periodPreview ? "period" : previewTopic?.id ?? previewPalace?.id;
  const previewSku = periodPreview ? model.periodTeaser?.sku : previewPalace ? CANONICAL_PALACE_SKU_MAP[previewPalace.id as ZiweiPalaceId] as LaSku :
    previewTopic?.id === "career_wealth" ? "ZIWEI-CAREER-P0" : previewTopic?.id === "relationship_marriage" ? "ZIWEI-RELATIONSHIP-P0" : undefined;
  // One native dialog owns focus and body overflow for both enlargement and previews.
  const modalId = previewId ? `preview:${previewId}` : chartExpanded ? "chart" : undefined;
  const offerHref = `${basePath}/chon-luan-giai`;
  const scoreMap = new Map(model.palaces.map((palace) => [palace.id, { score: palace.score }]));
  const strongest = model.palaces.reduce((best, palace) => palace.score > best.score ? palace : best, model.palaces[0]!);
  const weakest = model.palaces.reduce((best, palace) => palace.score < best.score ? palace : best, model.palaces[0]!);

  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;
    const tracker = analyticsRef.current;
    const visible = new Map<string, Element>();
    const emit = (event: ReturnType<typeof tracker.door> | ReturnType<typeof tracker.depth>) => {
      if (event) void sendBrowserAnalyticsEvent(event.name, event.properties);
    };
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        const section = entry.target.getAttribute("data-free-result-block");
        if (!section) continue;
        if (entry.isIntersecting && entry.target.getClientRects().length > 0) {
          visible.set(section, entry.target);
          emit(tracker.visible(section, performance.now(), document.visibilityState === "visible"));
          if (section === "completion") emit(tracker.depth(document.visibilityState === "visible"));
        } else { visible.delete(section); tracker.hidden(section); }
      }
    }, { threshold: 0.2 });
    document.querySelectorAll('[data-free-result-block="gift"], [data-free-result-block="free-palace"], [data-free-result-block="insights"], [data-free-result-block="completion"]').forEach((node) => observer.observe(node));
    const tick = () => {
      for (const [section, node] of visible) {
        if (!node.getClientRects().length || document.visibilityState !== "visible") tracker.hidden(section);
        else {
          if (section === "completion") emit(tracker.depth(true));
          emit(tracker.visible(section, performance.now(), true));
          emit(tracker.tick(section, performance.now(), true));
        }
      }
    };
    const timer = window.setInterval(tick, 1000);
    document.addEventListener("visibilitychange", tick);
    return () => { observer.disconnect(); clearInterval(timer); document.removeEventListener("visibilitychange", tick); };
  }, []);
  function trackDoor() {
    const event = analyticsRef.current.door();
    if (event) void sendBrowserAnalyticsEvent(event.name, event.properties);
  }

  useEffect(() => {
    const node = completionRef.current;
    if (!node || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting && entry.target.getClientRects().length > 0)) setAskEligible(true);
    }, { threshold: 0.2 });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const media = window.matchMedia("(min-width: 1024px)");
    const focusOnResize = () => {
      const active = document.activeElement;
      if (!media.matches && active instanceof HTMLElement && active.getAttribute("role") === "tab") {
        document.getElementById(mobileAnchors[view.tab])?.focus({ preventScroll: true });
      }
    };
    media.addEventListener("change", focusOnResize);
    return () => media.removeEventListener("change", focusOnResize);
  }, [view.tab]);

  useEffect(() => {
    if (window.matchMedia("(min-width: 1024px)").matches || view.open) return;
    const frame = requestAnimationFrame(() => {
      document.getElementById(mobileAnchors[view.tab])?.scrollIntoView({ block: "start" });
    });
    return () => cancelAnimationFrame(frame);
    // Opening/closing a modal must not re-run the section anchor scroll.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view.tab]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog || !modalId) return;
    const tabs = tabListRef.current;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    if (!dialog.open) dialog.showModal();
    if (modalId.startsWith("preview:")) {
      queueMicrotask(() => setAskEligible(true));
      const event = analyticsRef.current.preview(modalId.slice("preview:".length));
      if (event) void sendBrowserAnalyticsEvent(event.name, event.properties);
    }
    return () => {
      dialog.close();
      document.body.style.overflow = previousOverflow;
      const trigger = triggerRef.current;
      const activeTab = tabs?.querySelector<HTMLButtonElement>('[aria-selected="true"]');
      const target = trigger?.isConnected && trigger.getClientRects().length ? trigger
        : activeTab?.getClientRects().length ? activeTab : document.getElementById(mobileAnchors[view.tab]);
      target?.focus({ preventScroll: true });
    };
  }, [modalId, view.tab]);

  const engagementRef = useRef(createEngagementReporter(recordEngagement));
  const viewRef = useRef(view);
  useEffect(() => { viewRef.current = view; }, [view]);
  // The server only decides the first view. A new initialState object (each server render) re-syncs
  // tab/open; an equal tab/open keeps the local view, including its open sheet.
  const [syncedState, setSyncedState] = useState(initialState);
  if (syncedState !== initialState) {
    setSyncedState(initialState);
    if (view.tab !== initialState.tab || view.open !== initialState.open) setView(initialState);
  }
  // True only while THIS instance owns a pushed sheet entry; closingRef guards a double history.back().
  const sheetEntryRef = useRef(false);
  const closingRef = useRef(false);
  useEffect(() => {
    // Next copies the first server render's router state into native pushState, so after leaving and
    // pressing Back we remount with the original initialState: rebuild the real view from the address bar.
    const real = readResultView(window.location.search, window.history.state);
    if (!sameView(viewRef.current, real)) {
      viewRef.current = real;
      setView(real);
    }
    if (!real.sheet && hasSheetMarker(window.history.state)) {
      window.history.replaceState(null, "", window.location.pathname + window.location.search);
    }
    const onPopState = () => {
      sheetEntryRef.current = false;
      closingRef.current = false;
      const next = readResultView(window.location.search, window.history.state);
      viewRef.current = next;
      setView(next);
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);
  function go(next: ResultView, mode: "push" | "replace" = "push") {
    if (sameView(viewRef.current, next)) return;
    viewRef.current = next;
    setView(next);
    writeResultView(window.history, basePath, next, mode);
    sheetEntryRef.current = mode === "push" && Boolean(next.sheet);
  }
  function navigate(tab: ZiweiResultTab, open?: string) {
    // A genuine user action (tab click, preview or evidence open): report each tab once, fire-and-forget.
    engagementRef.current.report(tab);
    go({ tab, open });
  }
  function openSheet(sheet: ResultSheet, trigger: HTMLButtonElement | null) {
    triggerRef.current = trigger;
    setAskEligible(true);
    go({ tab: view.tab, open: view.open, sheet });
  }
  function openPreview(id: string, trigger: HTMLButtonElement, tab: "palaces" | "topics") {
    triggerRef.current = trigger;
    setAskEligible(true);
    navigate(tab, id);
  }
  function closeModal() {
    if (view.sheet) {
      // Back keeps the stack tidy only when we pushed the marked entry; otherwise strip the marker in place.
      const plan = planSheetClose({
        entryOwned: sheetEntryRef.current, closing: closingRef.current, historyState: window.history.state, sheet: view.sheet,
      });
      if (plan === "back") { closingRef.current = true; window.history.back(); }
      else if (plan === "replace") go({ tab: view.tab, open: view.open }, "replace");
    } else if (previewId) navigate(view.tab);
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
  function panel(tab: ZiweiResultTab) {
    return {
      id: `panel-${tab}`, "data-tab": tab, role: desktop ? "tabpanel" : "region",
      "aria-labelledby": desktop ? `tab-${tab}` : `heading-${tab}`,
      "aria-hidden": desktop && view.tab !== tab ? true : undefined, tabIndex: -1,
    };
  }
  function score(palace: typeof selected) {
    return <span className="fd109-score">{palace.score} · {reportT(`reader.score_band_${palace.band}`)}</span>;
  }
  function chartView() {
    return <ZiweiChart chart={chart} birthSummary={birthSummary} locale={locale}
      selectedPalaceId={selectedChartPalace} onSelectPalace={setSelectedChartPalace} hideInspector={wide} />;
  }

  return (
    <div className="fd109 container" data-active-tab={view.tab} data-testid="fd109-free-result">
      <div className="fd109-tabs" role="tablist" aria-label={t("tabs.ariaLabel")} ref={tabListRef}>
        {CANONICAL_RESULT_TABS.map((tab, index) => (
          <button key={tab} id={`tab-${tab}`} role="tab" aria-controls={`panel-${tab}`}
            aria-selected={tab === view.tab} tabIndex={tab === view.tab ? 0 : -1}
            onClick={() => navigate(tab)} onKeyDown={(event) => tabKeyDown(event, index)} type="button">{t(`tabs.${tab}`)}</button>
        ))}
      </div>
      <div className="fd109-layout">
        <aside className="fd109-chart" data-free-result-block="chart" aria-label={t("tabs.chart")} id="free-result-board" tabIndex={-1}>
          <button className="fd109-enlarge" data-testid="fd109-chart-enlarge" type="button"
            onClick={(event) => openSheet("chart", event.currentTarget)}>{t("freeResult.enlargeChart")}</button>
          {chartView()}
        </aside>
        <div className="fd109-main">
          <section {...panel("chart")} className="fd109-chart-tab" data-testid="fd109-chart-tab-scores">
            <h2 id="heading-chart">{t("freeResult.scores")}</h2><p>{t("freeResult.scoreDescription")}</p>
            <ReportPalaceRadar snapshot={{palaces:model.palaces.map(palace => ({palaceId:palace.id}))}} scores={scoreMap} t={reportT} locale={locale} />
            <ReportScoreExplainer t={reportT} />
            {wide && <div className="fd109-inspector-col"><ZiweiChart chart={chart} birthSummary={birthSummary} locale={locale}
              selectedPalaceId={selectedChartPalace} onSelectPalace={setSelectedChartPalace} hideBoard /></div>}
          </section>
          <section {...panel("overview")}>
            <section className="fd109-gift" data-free-result-block="insights">
              <p className="eyebrow">02</p><h2 id="heading-overview">{t("freeResult.insights")}</h2>
              {chart.provisional && <p role="status">{t("provisional.insightsDisclaimer")}</p>}
              <p className="fd109-source-note">{t("freeResult.structuralOverview")}</p>
              <div className="fd109-overview-prose" data-testid="fd109-long-overview">
                {model.overview.sections.map(section => <article key={section.id} data-overview-section={section.id}>
                  <h3>{section.title}</h3>{section.paragraphs.map((paragraph, index) => <p key={index}>{paragraph}</p>)}
                </article>)}
              </div>
              <div className="fd109-overview-evidence">{model.insights.filter(insight => insight.evidenceId && CANONICAL_ID_TO_EVIDENCE_SUFFIX[insight.evidenceId]).map(insight => <EvidenceDrawer key={insight.id} chart={chart} chartId={chartId} locale={locale} evidenceId={insight.evidenceId!} loadEvidence={loadEvidence} isOpen={false} onOpenChange={open => { if (open) navigate("evidence", CANONICAL_ID_TO_EVIDENCE_SUFFIX[insight.evidenceId!]); }} />)}</div>
              <PartFeedback locale={locale} chartId={chartId} partId="structural-overview" sku="free-result" />
              {model.isGuest && <div className="fd109-save"><p>{t("freeResult.saveDescription")}</p>
                <Link className="button button-secondary" href={signInHref}>{t("freeResult.save")}</Link></div>}
            </section>
            <section className="fd109-block" data-free-result-block="scores">
            <p className="eyebrow">03</p><h2 id="heading-scores">{t("freeResult.scores")}</h2>
            <p>{t("freeResult.scoreDescription")}</p>
            <ReportPalaceRadar snapshot={{ palaces: model.palaces.map((palace) => ({ palaceId: palace.id })) }} scores={scoreMap} t={reportT} locale={locale} />
            <p>{t("freeResult.strongest", { name: strongest.name })} · {score(strongest)}</p>
            <p>{t("freeResult.weakest", { name: weakest.name })} · {score(weakest)}</p>
            <ul className="fd109-score-list">{model.palaces.map((palace) => <li key={palace.id}><span>{palace.name}</span>{score(palace)}</li>)}</ul>
            <ReportScoreExplainer t={reportT} />
          </section>
            {model.gift ? (
              <>
                <FreePalaceGiftBlock gift={model.gift} chartId={chartId} locale={locale} remainingPalaces={others.length} score={score(selected)} />
                <ReportScoreExplainer t={reportT} />
              </>
            ) : (
              <section className="fd109-gift" data-free-result-block="free-palace" data-palace-id={selected.id}>
                <p className="eyebrow">06 · {t("freeResult.structuralPreview")}</p><h2>{selected.name}</h2>
                {score(selected)}<p>{t("freeResult.fallback")}</p>
                <p className="fd109-gift-conclusion">{model.structuralPalace.conclusion}</p>
                <h3>{t("freeResult.giftKeyPoints")}</h3><ol className="fd109-gift-points">{model.structuralPalace.keyPoints.map((point,index) => <li key={index}>{point}</li>)}</ol>
                <h3>{t("freeResult.giftNarrative")}</h3><div className="fd109-gift-prose">{model.structuralPalace.paragraphs.map((paragraph,index) => <p key={index}>{paragraph}</p>)}</div>
                <div className="fd109-gift-actions"><div className="fd109-gift-do"><h3>{t("freeResult.giftDo")}</h3><ul>{model.structuralPalace.do.map(item => <li key={item}>{item}</li>)}</ul></div>
                  <div className="fd109-gift-avoid"><h3>{t("freeResult.giftAvoid")}</h3><ul>{model.structuralPalace.avoid.map(item => <li key={item}>{item}</li>)}</ul></div></div>
                {model.giftPreparing && <p role="status" data-testid="fd109-gift-preparing">{t("freeResult.giftPreparing", { name: selected.name })}</p>}
                <ReportScoreExplainer t={reportT} />
              </section>
            )}
          </section>
          <section {...panel("nam-nay")} className="fd109-block" data-free-result-block="year">
            <p className="eyebrow">04</p><h2 id="heading-nam-nay">{t("freeResult.year")}{model.annual ? ` ${model.annual.year}` : ""}</h2>
            {model.annual ? <><div className="fd109-counts">
              <p><strong>{model.annual.caution}</strong>{t("freeResult.cautionMonths")}</p>
              <p><strong>{model.annual.favorable}</strong>{t("freeResult.favorableMonths")}</p>
              <p><strong>{model.annual.neutral}</strong>{t("freeResult.neutralMonths")}</p>
            </div><p>{t("freeResult.monthsMasked")}</p></> : <p>{t("freeResult.yearUnavailable")}</p>}
            {model.periodTeaser && <div data-testid="fd109-period-teaser">
              <SecureLockedPreview title={t("freeResult.periodTitle")} locale={locale} clippedSentences={model.periodTeaser.sentences} lengthHint={5}
                actionLabel={t("freeResult.periodPreview")} onAction={() => openSheet("period", document.querySelector<HTMLButtonElement>('[data-testid="fd109-period-teaser"] button'))} />
            </div>}
          </section>
          <section {...panel("palaces")} className="fd109-block" data-free-result-block="palaces">
            <p className="eyebrow">07</p><h2 id="heading-palaces">{t("freeResult.palaces", { count: others.length })}</h2>
            <div className="fd109-map">{others.map((palace) => <button key={palace.id} className="fd109-map-row"
              type="button" data-testid="fd109-palace-preview" onClick={(event) => openPreview(palace.id.split(".").pop()!, event.currentTarget, "palaces")}>
              <span className="fd109-row-heading"><strong>{palace.name}</strong>{score(palace)}</span>
              <span>{palace.facts}</span><span className="fd109-state">{t("freeResult.locked")}</span>
            </button>)}</div>
          </section>
          <section {...panel("topics")} className="fd109-block" data-free-result-block="topics">
            <p className="eyebrow">08</p><h2 id="heading-topics">{t("tabs.topics")}</h2><p>{t("freeResult.topicDescription")}</p>
            <div className="fd109-map">{model.topics.map((topic) => <button key={topic.id} className="fd109-map-row"
              data-topic-id={topic.id} type="button" onClick={(event) => openPreview(topic.id, event.currentTarget, "topics")}>
              <strong>{topic.title}</strong><span>{topic.question}</span>
              <span>{topic.primaryPalaces.map((id) => presentation.palace(id)).join(" · ")}</span>
              <span className="fd109-state">{t("freeResult.locked")}</span>
            </button>)}</div>
          </section>
          <section className="fd109-completion" data-free-result-block="completion" data-completion-tabs="overview topics"
            data-testid="fd109-completion" ref={completionRef}>
            <p className="eyebrow">09 · {t("freeResult.complete")}</p>
            <h2>{model.gift ? t("freeResult.giftBridge") : t("freeResult.bridge")}</h2>
            <p>{model.gift ? t("freeResult.giftBridgeDescription") : t("freeResult.bridgeDescription")}</p>
            <Link className="button" href={offerHref} onClick={trackDoor}>{t("freeResult.choose")}</Link>
          </section>
          <section {...panel("evidence")} className="fd109-block" data-free-result-block="evidence">
            <h2 id="heading-evidence">{t("tabs.evidence")}</h2>
            <p>{t("evidenceTab.subtitle")}</p>
            <div className="evidence-cards-matrix">
              {Object.entries(EVIDENCE_SUFFIX_TO_CANONICAL_ID).map(([suffix, evidenceId], index) => (
                <article className="evidence-matrix-card" key={evidenceId}>
                  <div className="matrix-card-head">
                    <span className="matrix-badge">{t("evidenceTab.sourceLabel")} 0{index + 1}</span>
                    <h3>{presentation.evidence(suffix)}</h3>
                  </div>
                  <div className="matrix-card-action">
                    <EvidenceDrawer chart={chart} chartId={chartId} locale={locale} evidenceId={evidenceId} loadEvidence={loadEvidence}
                      isOpen={view.tab === "evidence" && view.open === suffix}
                      onOpenChange={(open) => navigate("evidence", open ? CANONICAL_ID_TO_EVIDENCE_SUFFIX[evidenceId] : undefined)} />
                  </div>
                </article>
              ))}
            </div>
          </section>
        </div>
      </div>
      <div className="fd109-sticky" data-testid="fd109-sticky" hidden={!askEligible}>
        <span>{t("freeResult.stickyContext")}</span><Link className="button" href={offerHref} onClick={trackDoor}>{t("freeResult.choose")}</Link>
      </div>
      <dialog className={`fd109-preview${modalId === "chart" ? " fd109-chart-fullscreen" : ""}`} data-testid="fd109-preview-dialog"
        ref={dialogRef} aria-labelledby="fd109-preview-title" onCancel={(event) => { event.preventDefault(); closeModal(); }}
        onClick={(event) => { if (event.target === event.currentTarget) closeModal(); }}>
        <div>
          <span className="fd109-sheet-handle" aria-hidden="true" />
          <button className="fd109-close" autoFocus type="button" onClick={closeModal}>{modalId === "chart" ? t("freeResult.sheetClose") : t("freeResult.close")}</button>
          <h2 id="fd109-preview-title">{modalId === "chart" ? t("freeResult.enlargeChart") : periodPreview ? t("freeResult.periodTitle") : previewTopic?.title ?? previewPalace?.name ?? t("freeResult.preview")}</h2>
          {modalId === "chart" ? <ZiweiChartSheet chart={chart} birthSummary={birthSummary} locale={locale}
            selectedPalaceId={selectedChartPalace} onSelectPalace={setSelectedChartPalace} /> : <>
            {periodPreview && model.periodTeaser && <SecureLockedPreview title={t("freeResult.periodTitle")} locale={locale} clippedSentences={model.periodTeaser.sentences} lengthHint={5} />}
            {previewPalace && <>{score(previewPalace)}<p>{previewPalace.facts}</p></>}
            {previewTopic && <><p>{previewTopic.question}</p><ul>{[...previewTopic.primaryPalaces, ...previewTopic.supportingPalaces].map((id) => {
              const palace = model.palaces.find((item) => item.id === id);
              return palace ? <li key={id}><strong>{palace.name}</strong> · {score(palace)}<p>{palace.facts}</p></li> : null;
            })}</ul></>}
            <ReportScoreExplainer t={reportT} />
            <p>{t("freeResult.previewDescription")}</p>
            <div className="fd109-locked-region"><span>{t("freeResult.locked")}</span><p>{t("freeResult.deepReadingLocked")}</p></div>
            {previewSku ? <ContextualUnlock key={previewId} chartId={chartId} chartVersionId={chartVersionId}
              locale={locale} sku={previewSku} offerHref={offerHref} onDoor={trackDoor} /> :
              <Link className="button" href={offerHref} onClick={trackDoor}>{t("freeResult.choose")}</Link>}
          </>}
        </div>
      </dialog>
    </div>
  );
}
