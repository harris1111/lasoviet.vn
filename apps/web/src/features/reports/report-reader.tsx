"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import type {
  EvidenceItemV1,
  ReportReadyViewV1,
} from "@lasoviet/contracts";

import { ArtifactImage } from "../../components/artifact-image";
import { ziweiPresentation } from "../ziwei/ziwei-presentation";

export type ReportReaderProps = {
  locale: "vi" | "en";
  report: ReportReadyViewV1;
};

const FONT_CLASSES = ["reader-font-sm", "reader-font-md", "reader-font-lg"] as const;

export function ReportReader({ locale, report }: ReportReaderProps) {
  const t = useTranslations("reports");
  const presentation = ziweiPresentation(locale);

  const [fontIdx, setFontIdx] = useState<number>(1);
  const [activeSectionIdx, setActiveSectionIdx] = useState<number>(0);
  const [tocOpen, setTocOpen] = useState<boolean>(false);
  const [progressPct, setProgressPct] = useState<number>(0);

  const tocOpenerRef = useRef<HTMLButtonElement | null>(null);
  const tocDialogRef = useRef<HTMLDivElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);

  const fontLabels = useMemo(() => [
    t("reader.font_size_small"),
    t("reader.font_size_medium"),
    t("reader.font_size_large"),
  ], [t]);

  const evidenceMap = useMemo(() => {
    const map = new Map<string, EvidenceItemV1>();
    for (const item of report.evidence) {
      map.set(item.id, item);
    }
    return map;
  }, [report.evidence]);

  const sections = report.content.sections;

  // Font size local storage restoration
  useEffect(() => {
    try {
      const saved = localStorage.getItem("lsv-font-idx");
      if (saved !== null) {
        const val = Number.parseInt(saved, 10);
        if (val >= 0 && val <= 2) {
          queueMicrotask(() => {
            setFontIdx(val);
          });
        }
      }
    } catch {
      // Local storage failure must not block reading
    }
  }, []);

  const changeFontIdx = (newIdx: number) => {
    const clamped = Math.max(0, Math.min(2, newIdx));
    setFontIdx(clamped);
    try {
      localStorage.setItem("lsv-font-idx", String(clamped));
    } catch {
      // Local storage failure ignored
    }
  };

  // Scroll progress & reading position restoration
  useEffect(() => {
    const reportId = report.reportId;
    try {
      const saved = localStorage.getItem(`lsv-reader-scroll-${reportId}`);
      if (saved) {
        const pct = Number.parseFloat(saved);
        if (!Number.isNaN(pct) && pct > 0) {
          setTimeout(() => {
            const doc = document.documentElement;
            const top = (pct / 100) * (doc.scrollHeight - doc.clientHeight);
            if (top > 0) {
              window.scrollTo({ top, behavior: "auto" });
            }
          }, 150);
        }
      }
    } catch {
      // Ignore storage errors
    }

    let timer: ReturnType<typeof setTimeout> | null = null;
    const handleScroll = () => {
      const doc = document.documentElement;
      const totalScrollable = doc.scrollHeight - doc.clientHeight;
      const pct = totalScrollable > 0 ? (doc.scrollTop / totalScrollable) * 100 : 0;
      const clamped = Math.min(100, Math.max(0, pct));
      setProgressPct(clamped);

      if (timer !== null) {
        clearTimeout(timer);
      }
      timer = setTimeout(() => {
        try {
          localStorage.setItem(`lsv-reader-scroll-${reportId}`, String(clamped));
        } catch {
          // Ignore storage errors
        }
      }, 200);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (timer !== null) {
        clearTimeout(timer);
      }
    };
  }, [report.reportId]);

  // Section observer for TOC & rail tracking
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const idx = sections.findIndex((s) => s.id === entry.target.id);
            if (idx !== -1) {
              setActiveSectionIdx(idx);
            }
          }
        }
      },
      { rootMargin: "-25% 0px -60% 0px", threshold: 0 },
    );

    const elements = document.querySelectorAll("[data-report-section]");
    elements.forEach((el) => observer.observe(el));

    return () => {
      observer.disconnect();
    };
  }, [sections]);

  // Mobile TOC Dialog Keyboard Lifecycle
  useEffect(() => {
    if (!tocOpen) return;

    // Initial focus inside dialog
    closeButtonRef.current?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setTocOpen(false);
        tocOpenerRef.current?.focus();
        return;
      }

      if (e.key === "Tab") {
        const dialog = tocDialogRef.current;
        if (!dialog) return;

        const focusable = dialog.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        );
        if (focusable.length === 0) return;

        const first = focusable[0]!;
        const last = focusable[focusable.length - 1]!;

        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [tocOpen]);

  const closeTocAndRestoreFocus = () => {
    setTocOpen(false);
    tocOpenerRef.current?.focus();
  };

  const activeSection = sections[activeSectionIdx] ?? sections[0];
  const activeSectionEvidence = useMemo(() => {
    if (!activeSection) return [];
    const ids = new Set<string>();
    for (const c of activeSection.claims) {
      for (const eid of c.evidenceIds) {
        ids.add(eid);
      }
    }
    return Array.from(ids)
      .map((id) => evidenceMap.get(id))
      .filter((item): item is EvidenceItemV1 => item !== undefined);
  }, [activeSection, evidenceMap]);

  const scrollToSection = (idx: number) => {
    const targetSection = sections[idx];
    if (!targetSection) return;
    const el = document.getElementById(targetSection.id);
    if (el) {
      const top = el.getBoundingClientRect().top + window.scrollY - 72;
      const prefersReducedMotion =
        typeof window !== "undefined" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      window.scrollTo({
        top,
        behavior: prefersReducedMotion ? "auto" : "smooth",
      });
    }
    setActiveSectionIdx(idx);
  };

  const createdDateStr = useMemo(() => {
    try {
      const date = new Date(report.provenance.createdAt);
      return date.toLocaleDateString(locale === "en" ? "en-US" : "vi-VN", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      });
    } catch {
      return report.provenance.createdAt;
    }
  }, [report.provenance.createdAt, locale]);

  return (
    <div className={`report-reader-root ${FONT_CLASSES[fontIdx]}`}>
      <a href="#main" className="skip-link">
        {t("reader.skip_to_main")}
      </a>

      {/* STICKY COMPACT HEADER */}
      <header className="report-reader-header">
        <div className="report-header-inner">
          <div className="report-header-brand">
            <span className="report-header-eyebrow">{t("reader.eyebrow")}</span>
            <h1 className="report-header-title">{t("reader.title")}</h1>
          </div>

          <div className="report-header-controls">
            {/* Font size segmented choices */}
            <div
              className="report-font-control"
              role="group"
              aria-label={t("reader.font_size_label")}
            >
              <button
                type="button"
                className="report-font-btn"
                onClick={() => changeFontIdx(fontIdx - 1)}
                disabled={fontIdx === 0}
                aria-label={t("reader.font_size_decrease")}
              >
                A-
              </button>
              <span className="report-font-label">
                {fontLabels[fontIdx]}
              </span>
              <button
                type="button"
                className="report-font-btn"
                onClick={() => changeFontIdx(fontIdx + 1)}
                disabled={fontIdx === 2}
                aria-label={t("reader.font_size_increase")}
              >
                A+
              </button>
            </div>

            {/* Mobile TOC Button */}
            <button
              ref={tocOpenerRef}
              type="button"
              className="report-mobile-toc-btn"
              onClick={() => setTocOpen(!tocOpen)}
              aria-expanded={tocOpen}
              aria-label={t("reader.open_toc")}
            >
              <span className="report-toc-icon" aria-hidden="true">
                ☰
              </span>
              <span>{t("reader.open_toc")}</span>
            </button>
          </div>
        </div>
      </header>

      {/* MAIN 3-COLUMN / RESPONSIVE LAYOUT */}
      <div className="report-layout-grid">
        {/* LEFT TOC RAIL (Desktop) */}
        <nav className="report-toc-rail" aria-label={t("reader.toc_title")}>
          <div className="report-rail-heading">{t("reader.toc_title")}</div>
          <ol className="report-toc-list">
            {sections.map((sec, i) => {
              const isCurrent = i === activeSectionIdx;
              const numeral = String(i + 1).padStart(2, "0");
              return (
                <li key={sec.id}>
                  <button
                    type="button"
                    className={`report-toc-item ${isCurrent ? "is-active" : ""}`}
                    onClick={() => scrollToSection(i)}
                    aria-current={isCurrent ? "true" : undefined}
                  >
                    <span className="report-toc-numeral">{numeral}</span>
                    <span className="report-toc-title">{sec.title}</span>
                  </button>
                </li>
              );
            })}
          </ol>
        </nav>

        {/* CENTER READING COLUMN */}
        <main id="main" className="report-reading-column">
          {/* Frontispiece */}
          <div className="report-frontispiece">
            <ArtifactImage
              alt={t("reader.frontispiece_alt")}
              desktop="/images/lasoviet/frontispiece-bao-cao-luan-giai-tu-vi.webp"
            />
          </div>

          <div className="report-intro-meta">
            <p className="eyebrow">{t("reader.eyebrow")} · {t("reader.version_label", { version: "1.0" })}</p>
            <h2 className="report-doc-title">{t("reader.title")}</h2>
            <p className="report-doc-date">
              {t("reader.created_prefix")} {createdDateStr} · {t("reader.based_on")}
            </p>
          </div>

          {/* Canonical AI Disclosure */}
          <div className="report-ai-disclosure" role="note">
            <p>{t("reader.ai_disclosure")}</p>
          </div>

          {/* 11 Canonical Sections in stored order */}
          <div className="report-sections-stream">
            {sections.map((section, index) => {
              const numeral = String(index + 1).padStart(2, "0");
              return (
                <section
                  key={section.id}
                  id={section.id}
                  data-report-section
                  className="report-section-block"
                >
                  <div className="report-section-header">
                    <span className="report-section-numeral">{numeral}</span>
                    <h3 className="report-section-title">{section.title}</h3>
                  </div>

                  <div className="report-section-narrative">
                    <p>{section.narrative}</p>
                  </div>

                  {/* Section Claims with Evidence Triggers */}
                  {section.claims.length > 0 && (
                    <div className="report-claims-group">
                      {section.claims.map((claim) => (
                        <article key={claim.id} className="report-claim-card">
                          <p className="report-claim-statement">{claim.text}</p>

                          <div className="report-claim-evidence-row">
                            {claim.evidenceIds.map((eid) => {
                              const ev = evidenceMap.get(eid);
                              if (!ev) return null;
                              return (
                                <details key={ev.id} className="report-evidence-inline-details">
                                  <summary className="report-evidence-summary-btn">
                                    <span className="report-evidence-icon" aria-hidden="true">
                                      ✦
                                    </span>
                                    <span>
                                      {t("reader.evidence_action")}: {presentation.evidence(ev.id)}
                                    </span>
                                  </summary>
                                  <div className="report-evidence-popover">
                                    <h4 className="report-evidence-title">
                                      {presentation.evidence(ev.id)}
                                    </h4>
                                    <dl className="report-evidence-spec">
                                      <dt>{t("reader.confidence")}</dt>
                                      <dd>{presentation.confidence(ev.confidence)}</dd>

                                      <dt>{t("reader.interpretation_bounds")}</dt>
                                      <dd>{ev.interpretationBounds.join(" ")}</dd>

                                      <dt>{t("reader.fact_references")}</dt>
                                      <dd>{ev.factReferences.map((f) => presentation.fact(f)).join(", ")}</dd>

                                      <dt>{t("reader.observable_actions")}</dt>
                                      <dd>{ev.allowedActionCategories.map((a) => presentation.action(a)).join(", ")}</dd>

                                      {ev.limitations.length > 0 && (
                                        <>
                                          <dt>{t("reader.limitations")}</dt>
                                          <dd>{ev.limitations.map((l) => presentation.limitation(l)).join("; ")}</dd>
                                        </>
                                      )}
                                    </dl>
                                  </div>
                                </details>
                              );
                            })}
                          </div>

                          {/* Claim Suggested Actions */}
                          {claim.suggestedActions.length > 0 && (
                            <div className="report-claim-actions">
                              <span className="report-meta-label">{t("reader.suggested_actions_title")}:</span>
                              <ul>
                                {claim.suggestedActions.map((act, ai) => (
                                  <li key={ai}>{act.text}</li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {/* Claim Limitations */}
                          {claim.limitations.length > 0 && (
                            <div className="report-claim-limits">
                              <span className="report-meta-label">{t("reader.limitations_title")}:</span>
                              <ul>
                                {claim.limitations.map((lim, li) => (
                                  <li key={li}>{lim}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </article>
                      ))}
                    </div>
                  )}
                </section>
              );
            })}
          </div>

          {/* Reflection Questions */}
          {report.content.reflectionQuestions.length > 0 && (
            <section className="report-reflection-section" aria-label={t("reader.reflection_title")}>
              <h3 className="report-reflection-heading">{t("reader.reflection_title")}</h3>
              <ol className="report-reflection-list">
                {report.content.reflectionQuestions.map((q, qi) => (
                  <li key={qi}>{q}</li>
                ))}
              </ol>
            </section>
          )}

          {/* Summary Actions */}
          {report.content.summaryActions.length > 0 && (
            <section className="report-summary-actions-section" aria-label={t("reader.summary_actions_title")}>
              <h3 className="report-summary-actions-heading">{t("reader.summary_actions_title")}</h3>
              <ul className="report-summary-actions-list">
                {report.content.summaryActions.map((act, ai) => (
                  <li key={ai}>{act}</li>
                ))}
              </ul>
            </section>
          )}

          {/* Professional Advice Disclaimer */}
          <section className="report-disclaimer-section" role="note">
            <p>{report.content.professionalAdviceDisclaimer}</p>
          </section>

          <div className="report-end-marker" aria-hidden="true">
            <span>{t("reader.end_of_report")}</span>
          </div>

          {/* Safe Provenance Footer */}
          <footer className="report-provenance-footer">
            <h4 className="report-provenance-title">{t("reader.provenance_heading")}</h4>
            <div className="report-provenance-grid">
              <div>{t("reader.provenance_method")}</div>
              <div>
                {t("reader.provenance_rule")}: <code>{report.provenance.ruleVersion}</code>
              </div>
              <div>
                {t("reader.provenance_evidence")}: <code>v{report.provenance.evidenceVersion}</code>
              </div>
              <div>
                {t("reader.provenance_knowledge")}: <code>{report.provenance.knowledgeVersion}</code>
              </div>
              <div>
                {t("reader.provenance_template")}: <code>{report.provenance.templateVersion}</code>
              </div>
              <div>
                {t("reader.provenance_created")}: <code>{report.provenance.createdAt}</code>
              </div>
            </div>
          </footer>
        </main>

        {/* RIGHT EVIDENCE CONTEXT RAIL (Desktop) */}
        <aside className="report-evidence-rail" aria-label={t("reader.evidence_eyebrow")}>
          <div className="report-progress-bar-wrap">
            <div
              className="report-progress-bar-fill"
              style={{ width: `${progressPct}%` }}
            />
          </div>

          <div className="report-rail-active-section">
            <span className="report-rail-heading">
              {t("reader.viewing", { numeral: String(activeSectionIdx + 1).padStart(2, "0") })}
            </span>
            <div className="report-rail-section-title">{activeSection?.title}</div>
          </div>

          <div className="report-rail-evidence-card">
            <p className="eyebrow">{t("reader.evidence_eyebrow")}</p>
            {activeSectionEvidence.length === 0 ? (
              <p className="report-rail-empty-note">
                {t("reader.no_evidence_for_section")}
              </p>
            ) : (
              activeSectionEvidence.map((ev) => (
                <div key={ev.id} className="report-rail-evidence-item">
                  <h4>{presentation.evidence(ev.id)}</h4>
                  <dl className="report-evidence-spec">
                    <dt>{t("reader.confidence")}</dt>
                    <dd>{presentation.confidence(ev.confidence)}</dd>
                    <dt>{t("reader.interpretation_bounds")}</dt>
                    <dd>{ev.interpretationBounds.join(" ")}</dd>
                    <dt>{t("reader.fact_references")}</dt>
                    <dd>{ev.factReferences.map((f) => presentation.fact(f)).join(", ")}</dd>
                  </dl>
                </div>
              ))
            )}
            <p className="report-rail-disclaimer">{t("reader.reading_rail_note")}</p>
          </div>
        </aside>
      </div>

      {/* MOBILE TOC SHEET (Modal / Dialog) */}
      {tocOpen && (
        <div
          ref={tocDialogRef}
          role="dialog"
          aria-modal="true"
          aria-label={t("reader.toc_title")}
          className="report-mobile-toc-dialog"
        >
          <div
            className="report-mobile-toc-backdrop"
            onClick={closeTocAndRestoreFocus}
          />
          <div className="report-mobile-toc-panel">
            <div className="report-mobile-toc-header">
              <span className="report-rail-heading">{t("reader.toc_title")}</span>
              <button
                ref={closeButtonRef}
                type="button"
                className="report-mobile-toc-close"
                onClick={closeTocAndRestoreFocus}
                aria-label={t("reader.close_toc")}
              >
                ✕
              </button>
            </div>
            <ol className="report-mobile-toc-list">
              {sections.map((sec, i) => (
                <li key={sec.id}>
                  <button
                    type="button"
                    className="report-mobile-toc-item"
                    onClick={() => {
                      scrollToSection(i);
                      closeTocAndRestoreFocus();
                    }}
                  >
                    <span className="report-toc-numeral">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span>{sec.title}</span>
                  </button>
                </li>
              ))}
            </ol>
          </div>
        </div>
      )}
    </div>
  );
}
