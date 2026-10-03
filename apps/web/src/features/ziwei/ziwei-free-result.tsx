"use client";

import { useEffect, useRef, useState, useSyncExternalStore, type KeyboardEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import type { NormalizedZiweiChartV1, ZiweiBirthSummaryV1, ZiweiEvidenceViewV1 } from "@lasoviet/contracts";
import { sendBrowserAnalyticsEvent } from "../../analytics/browser-analytics";
import { createFreeResultAnalytics } from "./free-result-analytics";
import { createEngagementReporter } from "./free-palace-engagement-reporter";
import { FreePalaceGiftBlock } from "./free-palace-gift-block";
import { EvidenceDrawer } from "../evidence/evidence-drawer";
import { ReportPalaceRadar, ReportScoreExplainer } from "../reports/report-chart-visuals";
import { PartFeedback } from "../reports/part-feedback";
import { ZiweiChart } from "./ziwei-chart";
import type { FreeResultModel } from "./ziwei-free-result-model";
import { ziweiPresentation, type ZiweiPresentationLocale } from "./ziwei-presentation";
import {
  CANONICAL_RESULT_TABS, CANONICAL_ID_TO_EVIDENCE_SUFFIX,
  EVIDENCE_SUFFIX_TO_CANONICAL_ID, buildCanonicalTabUrl,
  type ParsedResultTabState, type ZiweiResultTab,
} from "./ziwei-tabs-state";

export type ZiweiFreeResultProps = {
  chart: NormalizedZiweiChartV1;
  birthSummary?: ZiweiBirthSummaryV1;
  chartId: string;
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
const mobileAnchors: Record<ZiweiResultTab, string> = {
  chart: "free-result-board", overview: "panel-overview", "nam-nay": "panel-nam-nay",
  palaces: "panel-palaces", topics: "panel-topics", evidence: "panel-evidence",
};

export function ZiweiFreeResult({
  chart, birthSummary, chartId, basePath, locale, initialState, model, signInHref, loadEvidence, recordEngagement,
}: ZiweiFreeResultProps) {
  const t = useTranslations("ziwei");
  const reportT = useTranslations("reports");
  const presentation = ziweiPresentation(locale);
  const router = useRouter();
  const desktop = useSyncExternalStore(subscribeDesktop, desktopSnapshot, () => false);
  const [askEligible, setAskEligible] = useState(false);
  const [chartExpanded, setChartExpanded] = useState(false);
  const [selectedChartPalace, setSelectedChartPalace] = useState<string>(chart.soulPalaceId);
  const analyticsRef = useRef(createFreeResultAnalytics(locale, model.gift ? "validated_artifact" : "structural"));
  const completionRef = useRef<HTMLElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const tabListRef = useRef<HTMLDivElement>(null);
  const selected = model.palaces.find((palace) => palace.id === model.selectedPalaceId)!;
  const others = model.palaces.filter((palace) => palace.id !== selected.id);
  const previewTopic = initialState.tab === "topics" ? model.topics.find((topic) => topic.id === initialState.open) : undefined;
  const previewPalace = (initialState.tab === "palaces" || initialState.tab === "topics")
    ? model.palaces.find((palace) => palace.id === `ziwei.palace.${initialState.open}`) : undefined;
  const previewId = previewTopic?.id ?? previewPalace?.id;
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
    const emit = (event: ReturnType<typeof tracker.door>) => {
      if (event) void sendBrowserAnalyticsEvent(event.name, event.properties);
    };
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        const section = entry.target.getAttribute("data-free-result-block");
        if (!section) continue;
        if (entry.isIntersecting && entry.target.getClientRects().length > 0) {
          visible.set(section, entry.target);
          emit(tracker.visible(section, performance.now(), document.visibilityState === "visible"));
        } else { visible.delete(section); tracker.hidden(section); }
      }
    }, { threshold: 0.2 });
    document.querySelectorAll('[data-free-result-block="gift"], [data-free-result-block="insights"], [data-free-result-block="completion"]').forEach((node) => observer.observe(node));
    const tick = () => {
      for (const [section, node] of visible) {
        if (!node.getClientRects().length || document.visibilityState !== "visible") tracker.hidden(section);
        else {
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
        document.getElementById(mobileAnchors[initialState.tab])?.focus({ preventScroll: true });
      }
    };
    media.addEventListener("change", focusOnResize);
    return () => media.removeEventListener("change", focusOnResize);
  }, [initialState.tab]);

  useEffect(() => {
    if (window.matchMedia("(min-width: 1024px)").matches || initialState.open) return;
    const frame = requestAnimationFrame(() => {
      document.getElementById(mobileAnchors[initialState.tab])?.scrollIntoView({ block: "start" });
    });
    return () => cancelAnimationFrame(frame);
    // Opening/closing a modal must not re-run the section anchor scroll.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialState.tab]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog || !modalId) return;
    const tabs = tabListRef.current;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    if (!dialog.open) dialog.showModal();
    if (modalId.startsWith("preview:")) queueMicrotask(() => setAskEligible(true));
    return () => {
      dialog.close();
      document.body.style.overflow = previousOverflow;
      const trigger = triggerRef.current;
      const activeTab = tabs?.querySelector<HTMLButtonElement>('[aria-selected="true"]');
      const target = trigger?.isConnected && trigger.getClientRects().length ? trigger
        : activeTab?.getClientRects().length ? activeTab : document.getElementById(mobileAnchors[initialState.tab]);
      target?.focus({ preventScroll: true });
    };
  }, [modalId, initialState.tab]);

  const engagementRef = useRef(createEngagementReporter(recordEngagement));
  function navigate(tab: ZiweiResultTab, open?: string) {
    // A genuine user action (tab click, preview or evidence open): report each tab once, fire-and-forget.
    engagementRef.current.report(tab);
    router.push(buildCanonicalTabUrl(basePath, { tab, open }), { scroll: false });
  }
  function openPreview(id: string, trigger: HTMLButtonElement, tab: "palaces" | "topics") {
    triggerRef.current = trigger;
    setChartExpanded(false);
    setAskEligible(true);
    navigate(tab, id);
  }
  function closeModal() {
    if (previewId) navigate(initialState.tab);
    else setChartExpanded(false);
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
      "aria-hidden": desktop && initialState.tab !== tab ? true : undefined, tabIndex: -1,
    };
  }
  function score(palace: typeof selected) {
    return <span className="fd109-score">{palace.score} · {reportT(`reader.score_band_${palace.band}`)}</span>;
  }
  function chartView() {
    return <ZiweiChart chart={chart} birthSummary={birthSummary} locale={locale}
      selectedPalaceId={selectedChartPalace} onSelectPalace={setSelectedChartPalace} />;
  }

  return (
    <div className="fd109 container" data-active-tab={initialState.tab} data-testid="fd109-free-result">
      <div className="fd109-tabs" role="tablist" aria-label={t("tabs.ariaLabel")} ref={tabListRef}>
        {CANONICAL_RESULT_TABS.map((tab, index) => (
          <button key={tab} id={`tab-${tab}`} role="tab" aria-controls={`panel-${tab}`}
            aria-selected={tab === initialState.tab} tabIndex={tab === initialState.tab ? 0 : -1}
            onClick={() => navigate(tab)} onKeyDown={(event) => tabKeyDown(event, index)} type="button">{t(`tabs.${tab}`)}</button>
        ))}
      </div>
      <div className="fd109-layout">
        <aside className="fd109-chart" data-free-result-block="chart" aria-label={t("tabs.chart")} id="free-result-board" tabIndex={-1}>
          <button className="fd109-enlarge" data-testid="fd109-chart-enlarge" type="button"
            onClick={(event) => { triggerRef.current = event.currentTarget; setChartExpanded(true); }}>{t("freeResult.enlargeChart")}</button>
          {chartView()}
        </aside>
        <div className="fd109-main">
          <section {...panel("overview")}>
            <section className="fd109-gift" data-free-result-block="insights">
              <p className="eyebrow">02</p><h2 id="heading-overview">{t("freeResult.insights")}</h2>
              {chart.provisional && <p role="status">{t("provisional.insightsDisclaimer")}</p>}
              {model.insights.map((insight, index) => <article key={insight.id}>
                <h3>{insight.title}</h3><p>{insight.description}</p>
                <PartFeedback locale={locale} chartId={chartId} partId={insight.id} sku="free-result" />
                {insight.evidenceId && CANONICAL_ID_TO_EVIDENCE_SUFFIX[insight.evidenceId] &&
                  <EvidenceDrawer chart={chart} chartId={chartId} locale={locale} evidenceId={insight.evidenceId}
                    loadEvidence={loadEvidence} isOpen={false} onOpenChange={(open) => {
                      if (open) navigate("evidence", CANONICAL_ID_TO_EVIDENCE_SUFFIX[insight.evidenceId!]);
                    }} />}
                {index === 0 && model.isGuest && <div className="fd109-save">
                  <p>{t("freeResult.saveDescription")}</p>
                  <Link className="button button-secondary" href={signInHref}>{t("freeResult.save")}</Link>
                </div>}
              </article>)}
            </section>
            {model.gift ? (
              <>
                <FreePalaceGiftBlock gift={model.gift} chartId={chartId} locale={locale} remainingPalaces={others.length} score={score(selected)} />
                <ReportScoreExplainer t={reportT} />
              </>
            ) : (
              <section className="fd109-gift" data-free-result-block="free-palace" data-palace-id={selected.id}>
                <p className="eyebrow">06 · {t("freeResult.structuralPreview")}</p><h2>{selected.name}</h2>
                {score(selected)}<p>{selected.facts}</p><p>{t("freeResult.fallback")}</p>
                {model.giftPreparing && <p role="status" data-testid="fd109-gift-preparing">{t("freeResult.giftPreparing", { name: selected.name })}</p>}
                <ReportScoreExplainer t={reportT} />
              </section>
            )}
          </section>
          <section {...panel("chart")} className="fd109-block" data-free-result-block="scores">
            <p className="eyebrow">03</p><h2 id="heading-chart">{t("freeResult.scores")}</h2>
            <p>{t("freeResult.scoreDescription")}</p>
            <ReportPalaceRadar snapshot={{ palaces: model.palaces.map((palace) => ({ palaceId: palace.id })) }} scores={scoreMap} t={reportT} locale={locale} />
            <p>{t("freeResult.strongest", { name: strongest.name })} · {score(strongest)}</p>
            <p>{t("freeResult.weakest", { name: weakest.name })} · {score(weakest)}</p>
            <ul className="fd109-score-list">{model.palaces.map((palace) => <li key={palace.id}><span>{palace.name}</span>{score(palace)}</li>)}</ul>
            <ReportScoreExplainer t={reportT} />
          </section>
          <section {...panel("nam-nay")} className="fd109-block" data-free-result-block="year">
            <p className="eyebrow">04</p><h2 id="heading-nam-nay">{t("freeResult.year")}{model.annual ? ` ${model.annual.year}` : ""}</h2>
            {model.annual ? <><div className="fd109-counts">
              <p><strong>{model.annual.caution}</strong>{t("freeResult.cautionMonths")}</p>
              <p><strong>{model.annual.favorable}</strong>{t("freeResult.favorableMonths")}</p>
              <p><strong>{model.annual.neutral}</strong>{t("freeResult.neutralMonths")}</p>
            </div><p>{t("freeResult.monthsMasked")}</p></> : <p>{t("freeResult.yearUnavailable")}</p>}
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
                      isOpen={initialState.tab === "evidence" && initialState.open === suffix}
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
          <button className="fd109-close" autoFocus type="button" onClick={closeModal}>{t("freeResult.close")}</button>
          <h2 id="fd109-preview-title">{modalId === "chart" ? t("freeResult.enlargeChart") : previewTopic?.title ?? previewPalace?.name ?? t("freeResult.preview")}</h2>
          {modalId === "chart" ? <div className="fd109-chart-pan">{chartView()}</div> : <>
            {previewPalace && <>{score(previewPalace)}<p>{previewPalace.facts}</p></>}
            {previewTopic && <><p>{previewTopic.question}</p><ul>{[...previewTopic.primaryPalaces, ...previewTopic.supportingPalaces].map((id) => {
              const palace = model.palaces.find((item) => item.id === id);
              return palace ? <li key={id}><strong>{palace.name}</strong> · {score(palace)}<p>{palace.facts}</p></li> : null;
            })}</ul></>}
            <ReportScoreExplainer t={reportT} />
            <p>{t("freeResult.previewDescription")}</p>
            <div className="fd109-locked-region"><span>{t("freeResult.locked")}</span><p>{t("freeResult.deepReadingLocked")}</p></div>
            <Link className="button" href={offerHref} onClick={trackDoor}>{t("freeResult.choose")}</Link>
          </>}
        </div>
      </dialog>
    </div>
  );
}
