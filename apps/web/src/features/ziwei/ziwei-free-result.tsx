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
import { buildClosingHook } from "./ziwei-closing-hook";
import { ZiweiSupportPalaces, type SupportPalace } from "./ziwei-support-palaces";
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
function desktopSnapshot() { return window.matchMedia("(min-width: 1024px)").matches; }
// The chart is the stage above the tabs, so it is no longer a tab; ?tab=chart (and the default) reads as overview.
const STAGE_TABS = CANONICAL_RESULT_TABS.filter((tab) => tab !== "chart" && tab !== "evidence");
const mobileAnchors: Record<ZiweiResultTab, string> = {
  chart: "free-result-board", overview: "panel-overview", "nam-nay": "panel-nam-nay",
  palaces: "panel-palaces", topics: "panel-topics", evidence: "panel-overview",
};
const DRAWER_HINT_ID = "fd109-palace-drawer-title";

export function ZiweiFreeResult({
  chart, birthSummary, chartId, chartVersionId, basePath, locale, initialState, model, signInHref, loadEvidence, recordEngagement,
}: ZiweiFreeResultProps) {
  const t = useTranslations("ziwei");
  const reportT = useTranslations("reports");
  const presentation = ziweiPresentation(locale);
  const desktop = useSyncExternalStore(subscribeDesktop, desktopSnapshot, () => false);
  const [spyTab, setSpyTab] = useState<ZiweiResultTab | null>(null);
  const [askEligible, setAskEligible] = useState(false);
  // FE-3 / N7: tab, preview and sheet are local state (instant), the address bar is synced with the native
  // History API (no server round trip). popstate restores state for Back/Forward.
  const [view, setView] = useState<ResultView>(initialState);
  const activeTab: ZiweiResultTab = view.tab === "chart" || view.tab === "evidence" ? "overview" : view.tab;
  const chartExpanded = view.sheet === "chart";
  const palaceDrawer = view.sheet === "palace";
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
  const modalId = previewId ? `preview:${previewId}` : chartExpanded ? "chart" : palaceDrawer ? "palace" : undefined;
  const offerHref = `${basePath}/chon-luan-giai`;
  const scoreMap = new Map(model.palaces.map((palace) => [palace.id, { score: palace.score }]));

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

  // Phone: the page is one scroll, so the chip of the section in view is highlighted.
  useEffect(() => {
    if (desktop) return;
    const ids = STAGE_TABS.map((tab) => [tab, `panel-${tab}`] as const);
    let frame = 0;
    const update = () => {
      frame = 0;
      let current: ZiweiResultTab | null = null;
      for (const [tab, id] of ids) {
        const node = document.getElementById(id);
        if (node && node.getBoundingClientRect().top <= 140) current = tab;
      }
      setSpyTab(current);
    };
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(update); };
    window.addEventListener("scroll", onScroll, { passive: true });
    update();
    return () => { window.removeEventListener("scroll", onScroll); if (frame) cancelAnimationFrame(frame); };
  }, [desktop]);

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
  useEffect(() => {
    if (desktop && palaceDrawer) closeModal();
    // closeModal reads the latest view; only the breakpoint crossing should trigger it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [desktop]);

  function tabKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const count = STAGE_TABS.length;
    const next = event.key === "ArrowRight" ? (index + 1) % count
      : event.key === "ArrowLeft" ? (index + count - 1) % count
      : event.key === "Home" ? 0 : event.key === "End" ? count - 1 : null;
    if (next === null) return;
    event.preventDefault();
    navigate(STAGE_TABS[next]!);
    tabListRef.current?.querySelectorAll<HTMLButtonElement>("[role=tab]")[next]?.focus();
  }
  function panel(tab: ZiweiResultTab) {
    return {
      id: `panel-${tab}`, "data-tab": tab, role: desktop ? "tabpanel" : "region",
      "aria-labelledby": desktop ? `tab-${tab}` : `heading-${tab}`,
      "aria-hidden": desktop && activeTab !== tab ? true : undefined, tabIndex: -1,
    };
  }
  function score(palace: typeof selected) {
    return <span className="fd109-score">{palace.score} · {reportT(`reader.score_band_${palace.band}`)}</span>;
  }
  const drawerPalace = chart.palaces.find((palace) => palace.id === selectedChartPalace);
  const drawerTitle = drawerPalace
    ? `${presentation.palace(drawerPalace.id)} (${drawerPalace.heavenlyStemId ? `${presentation.stem(drawerPalace.heavenlyStemId)} ` : ""}${presentation.branch(drawerPalace.earthlyBranchId)})`
    : presentation.palace(selectedChartPalace);
  function selectStagePalace(palaceId: string) {
    setSelectedChartPalace(palaceId);
    if (desktop) return;
    const trigger = document.querySelector<HTMLButtonElement>(`#free-result-board [data-palace-id="${palaceId}"]`);
    openSheet("palace", trigger);
  }
  const supportPalaces: SupportPalace[] = model.palaces.map((palace) => ({
    id: palace.id, name: palace.name, score: palace.score, band: palace.band,
    stars: chart.palaces.find((item) => item.id === palace.id)?.stars.filter((star) => star.category === "major")
      .map((star) => presentation.star(star.id)).join(", ") || t("freeResult.supportNoMajor"),
  }));
  const supportLabels = {
    strongTitle: t("freeResult.supportStrong"), weakTitle: t("freeResult.supportWeak"), weakNote: t("freeResult.supportWeakNote"),
    allTitle: t("freeResult.supportAll"), midpoint: t("freeResult.supportMidpoint"), viewOnChart: t("freeResult.supportViewOnChart"),
    band: (band: SupportPalace["band"]) => reportT(`reader.score_band_${band}`),
    card: (palace: SupportPalace) => t("freeResult.supportCard", { name: palace.name, band: reportT(`reader.score_band_${palace.band}`), score: palace.score }),
  };
  function focusPalaceOnChart(palaceId: string) {
    selectStagePalace(palaceId);
    if (desktop) document.getElementById("free-result-board")?.scrollIntoView({ block: "start", behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  }
  const closingHook = buildClosingHook({
    chart, lockedPalaceIds: model.palaces.filter((palace) => palace.id !== model.selectedPalaceId).map((palace) => palace.id),
    annual: model.annual ? { year: model.annual.year, caution: model.annual.caution } : null,
  });
  const lowerPalace = (id: string) => { const label = presentation.palace(id); return locale === "vi" ? label.replace(/^Cung /u, "cung ") : label; };
  const closingText = closingHook ? {
    count: closingHook.lockedCount,
    facts: new Intl.ListFormat(locale, { style: "long", type: "conjunction" }).format(closingHook.facts.map((fact) => {
      switch (fact.kind) {
        case "hoa": return t("freeResult.closingFactHoa", { palace: lowerPalace(fact.palaceId), star: presentation.star(fact.starId), hoa: presentation.transformation(fact.transformationId) });
        case "empty": return t("freeResult.closingFactEmpty", { palace: lowerPalace(fact.palaceId) });
        case "pair": return t("freeResult.closingFactPair", { palace: lowerPalace(fact.palaceId), stars: new Intl.ListFormat(locale, { style: "long", type: "conjunction" }).format(fact.starIds.map((id) => presentation.star(id))) });
        case "alone": return t("freeResult.closingFactAlone", { palace: lowerPalace(fact.palaceId), star: presentation.star(fact.starId) });
        case "months": return t("freeResult.closingFactMonths", { year: fact.year, count: fact.count });
      }
    })),
  } : null;
  const inspectorEvidence = selectedChartPalace === chart.soulPalaceId ? "life-palace" : selectedChartPalace === chart.bodyPalaceId ? "body-palace" : undefined;
  function inspector() {
    return <>
      <ZiweiChart chart={chart} birthSummary={birthSummary} locale={locale}
        selectedPalaceId={selectedChartPalace} onSelectPalace={setSelectedChartPalace} hideBoard />
      {inspectorEvidence && <button className="fd109-evidence-link" type="button" data-testid="fd109-inspector-evidence"
        onClick={() => navigate("overview", inspectorEvidence)}>{t("freeResult.inspectorEvidence")}</button>}
    </>;
  }

  return (
    <div className="fd109 container" data-active-tab={activeTab} data-testid="fd109-free-result">
      <section className="fd109-stage" data-free-result-block="chart" aria-label={t("tabs.chart")} id="free-result-board" tabIndex={-1}>
        <span className="fd109-corner fd109-corner-tl" aria-hidden="true" />
        <span className="fd109-corner fd109-corner-tr" aria-hidden="true" />
        <span className="fd109-corner fd109-corner-bl" aria-hidden="true" />
        <span className="fd109-corner fd109-corner-br" aria-hidden="true" />
        <div className="fd109-stage-board">
          <button className="fd109-enlarge" data-testid="fd109-chart-enlarge" type="button"
            onClick={(event) => openSheet("chart", event.currentTarget)}>{t("freeResult.enlargeChart")}</button>
          <ZiweiChart chart={chart} birthSummary={birthSummary} locale={locale} density="compact" hideInspector
            selectedPalaceId={selectedChartPalace} onSelectPalace={selectStagePalace} />
        </div>
        <aside className="fd109-stage-inspector" data-testid="fd109-stage-inspector" aria-label={t("freeResult.detailToggle")}>
          {inspector()}
        </aside>
      </section>
      <div className="fd109-divider" aria-hidden="true" />
      <div className="fd109-tabs" role="tablist" aria-label={t("tabs.ariaLabel")} ref={tabListRef}>
        {STAGE_TABS.map((tab, index) => (
          <button key={tab} id={`tab-${tab}`} role="tab" aria-controls={`panel-${tab}`}
            aria-selected={tab === (desktop ? activeTab : spyTab ?? activeTab)} tabIndex={tab === activeTab ? 0 : -1}
            onClick={() => navigate(tab)} onKeyDown={(event) => tabKeyDown(event, index)} type="button">{t(`tabs.${tab}`)}</button>
        ))}
      </div>
      <div className="fd109-layout">
        <div className="fd109-main">
          <section {...panel("overview")}>
            <section className="fd109-radar" data-testid="fd109-radar">
              <ReportPalaceRadar snapshot={{ palaces: model.palaces.map((palace) => ({ palaceId: palace.id })) }} scores={scoreMap} t={reportT} locale={locale} />
            </section>
            <section className="fd109-gift" data-free-result-block="insights">
              <p className="eyebrow">02</p><h2 id="heading-overview">{t("freeResult.insights")}</h2>
              {chart.provisional && <p role="status">{t("provisional.insightsDisclaimer")}</p>}
              <p className="fd109-source-note">{t("freeResult.structuralOverview")}</p>
              <div className="fd109-overview-prose" data-testid="fd109-long-overview">
                {model.overview.sections.map(section => <article key={section.id} data-overview-section={section.id}>
                  <h3>{section.title}</h3>{section.paragraphs.map((paragraph, index) => <p key={index}>{paragraph}</p>)}
                </article>)}
              </div>
              <PartFeedback locale={locale} chartId={chartId} partId="structural-overview" sku="free-result" />
              {model.isGuest && <div className="fd109-save"><p>{t("freeResult.saveDescription")}</p>
                <Link className="button button-secondary" href={signInHref}>{t("freeResult.save")}</Link></div>}
            </section>
            <section className="fd109-block" data-free-result-block="scores">
            <p className="eyebrow">03</p><h2 id="heading-scores">{t("freeResult.scores")}</h2>
            <p>{t("freeResult.scoreDescription")}</p>
            <ZiweiSupportPalaces palaces={supportPalaces} labels={supportLabels} onFocus={focusPalaceOnChart} />
            <ReportScoreExplainer t={reportT} />
          </section>
            {model.gift ? (
              <>
                <FreePalaceGiftBlock gift={model.gift} chartId={chartId} locale={locale} remainingPalaces={others.length} score={score(selected)} />
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
          <section className="fd109-block" data-free-result-block="evidence" data-testid="fd109-evidence-row" aria-labelledby="fd109-evidence-title">
            <h2 id="fd109-evidence-title">{t("freeResult.evidenceRowTitle")}</h2>
            <p>{t("evidenceTab.subtitle")}</p>
            <ul className="fd109-evidence-row">
              {Object.entries(EVIDENCE_SUFFIX_TO_CANONICAL_ID).map(([suffix, evidenceId]) => (
                <li key={evidenceId}>
                  <strong>{presentation.evidence(suffix)}</strong>
                  <EvidenceDrawer chart={chart} chartId={chartId} locale={locale} evidenceId={evidenceId} loadEvidence={loadEvidence}
                    isOpen={activeTab === "overview" && view.open === suffix}
                    onOpenChange={(open) => navigate("overview", open ? CANONICAL_ID_TO_EVIDENCE_SUFFIX[evidenceId] : undefined)} />
                </li>
              ))}
            </ul>
          </section>
          <section className="fd109-completion" data-free-result-block="completion" data-completion-tabs="overview topics"
            data-testid="fd109-completion" ref={completionRef}>
            <p className="eyebrow">{t("freeResult.complete")}</p>
            <h2>{closingText ? t("freeResult.closingTitle", { count: closingText.count }) : model.gift ? t("freeResult.giftBridge") : t("freeResult.bridge")}</h2>
            <p data-testid="fd109-closing-hook">{closingText ? t("freeResult.closingBody", { facts: closingText.facts }) : model.gift ? t("freeResult.giftBridgeDescription") : t("freeResult.bridgeDescription")}</p>
            <Link className="button" href={offerHref} onClick={trackDoor}>{closingText ? t("freeResult.closingCta") : t("freeResult.choose")}</Link>
          </section>
        </div>
      </div>
      <div className="fd109-sticky" data-testid="fd109-sticky" hidden={!askEligible}>
        <span>{t("freeResult.stickyContext")}</span><Link className="button" href={offerHref} onClick={trackDoor}>{t("freeResult.choose")}</Link>
      </div>
      <dialog className={`fd109-preview${modalId === "chart" ? " fd109-chart-fullscreen" : ""}${modalId === "palace" ? " fd109-palace-drawer" : ""}`} data-testid="fd109-preview-dialog"
        ref={dialogRef} aria-labelledby={modalId === "palace" ? DRAWER_HINT_ID : "fd109-preview-title"} onCancel={(event) => { event.preventDefault(); closeModal(); }}
        onClick={(event) => { if (event.target === event.currentTarget) closeModal(); }}>
        <div>
          <span className="fd109-sheet-handle" aria-hidden="true" />
          <button className="fd109-close" autoFocus type="button" onClick={closeModal}>{modalId === "chart" || modalId === "palace" ? t("freeResult.sheetClose") : t("freeResult.close")}</button>
          <h2 id={modalId === "palace" ? DRAWER_HINT_ID : "fd109-preview-title"}>{modalId === "palace" ? drawerTitle : modalId === "chart" ? t("freeResult.enlargeChart") : periodPreview ? t("freeResult.periodTitle") : previewTopic?.title ?? previewPalace?.name ?? t("freeResult.preview")}</h2>
          {modalId === "chart" ? <ZiweiChartSheet chart={chart} birthSummary={birthSummary} locale={locale}
            selectedPalaceId={selectedChartPalace} onSelectPalace={setSelectedChartPalace} /> : modalId === "palace" ? inspector() : <>
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
