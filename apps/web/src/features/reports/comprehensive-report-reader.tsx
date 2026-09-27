"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import type {
  ComprehensiveReportTier2PublicContentV1,
  ComprehensiveReportTier2PublicContentV3,
  ReportComprehensiveReadyViewV1,
  ReportComprehensiveV3ReadyViewV1,
} from "@lasoviet/contracts";

import { ArtifactImage } from "../../components/artifact-image";
import { useReportReaderAnalytics } from "./report-analytics";
import { ReportDecadalTimeline, ReportMiniChart, ReportStarChips } from "./report-chart-visuals";
import { ReportNarrative } from "./report-narrative";
import { splitLeadSentence, splitNarrative } from "./report-paragraphs";
import { resolveActiveSectionIndex } from "./report-reading-position";

export type ComprehensiveReportReaderProps = {
  locale?: "vi" | "en";
  report: ReportComprehensiveReadyViewV1 | ReportComprehensiveV3ReadyViewV1;
};

function isTier2Content(
  content: ComprehensiveReportReaderProps["report"]["content"],
): content is ComprehensiveReportTier2PublicContentV1 {
  return "keyConfigurations" in content && Array.isArray((content as any).keyConfigurations);
}

function isV4_1Tier2Content(
  content: ComprehensiveReportReaderProps["report"]["content"],
): content is ComprehensiveReportTier2PublicContentV3 {
  return "birthTimeSensitivity" in content;
}

const FONT_CLASSES = ["reader-font-sm", "reader-font-md", "reader-font-lg"] as const;

export function ComprehensiveReportReader({
  locale = "vi",
  report,
}: ComprehensiveReportReaderProps) {
  const t = useTranslations("reports");

  const [fontIdx, setFontIdx] = useState<number>(1);
  const [activeSectionIdx, setActiveSectionIdx] = useState<number>(0);
  const [tocOpen, setTocOpen] = useState<boolean>(false);
  const [progressPct, setProgressPct] = useState<number>(0);
  const [readSectionIds, setReadSectionIds] = useState<Set<string>>(new Set());
  const [resumeSection, setResumeSection] = useState<{ id: string; title: string } | null>(null);
  const [showShareToast, setShowShareToast] = useState<boolean>(false);

  const tocOpenerRef = useRef<HTMLButtonElement | null>(null);
  const tocDialogRef = useRef<HTMLDivElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);

  const fontLabels = useMemo(
    () => [
      t("reader.font_size_small"),
      t("reader.font_size_medium"),
      t("reader.font_size_large"),
    ],
    [t],
  );

  const isTier2 = isTier2Content(report.content);
  const v4_1Content =
    report.contentVersion === "ziwei-comprehensive.v3" && isV4_1Tier2Content(report.content)
      ? report.content
      : null;

  const chartSnapshot =
    "chartSnapshot" in report && report.chartSnapshot ? report.chartSnapshot : null;
  const snapshotPalace = (palaceId: string | undefined) =>
    chartSnapshot && palaceId
      ? chartSnapshot.palaces.find((p) => p.palaceId === palaceId) ?? null
      : null;
  const lifePalace = chartSnapshot?.palaces.find((p) => p.isLife) ?? null;
  const bodyPalace = chartSnapshot?.palaces.find((p) => p.isBody) ?? null;
  const currentCycle = chartSnapshot?.decadal.cycles.find(
    (c) => c.ordinal === chartSnapshot.decadal.currentOrdinal,
  );
  const decadalPalace = snapshotPalace(currentCycle?.palaceId);
  const annualPalace = snapshotPalace(chartSnapshot?.annual.palaceId);

  const [openPalaces, setOpenPalaces] = useState<Set<string>>(
    () =>
      new Set(
        isTier2Content(report.content)
          ? report.content.palaceReadings.slice(0, 2).map((p) => p.palaceId)
          : [],
      ),
  );
  const palaceCount = isTier2Content(report.content) ? report.content.palaceReadings.length : 0;
  const allPalacesOpen = palaceCount > 0 && openPalaces.size === palaceCount;
  const setPalaceOpen = (palaceId: string, open: boolean) => {
    setOpenPalaces((prev) => {
      if (prev.has(palaceId) === open) return prev;
      const next = new Set(prev);
      if (open) next.add(palaceId);
      else next.delete(palaceId);
      return next;
    });
  };
  const toggleAllPalaces = () => {
    if (!isTier2Content(report.content)) return;
    setOpenPalaces(
      allPalacesOpen ? new Set() : new Set(report.content.palaceReadings.map((p) => p.palaceId)),
    );
  };

  // Printing and PDF export must include every palace.
  useEffect(() => {
    const openAll = () => {
      document.querySelectorAll<HTMLDetailsElement>(".report-palace-card").forEach((card) => {
        card.open = true;
      });
    };
    window.addEventListener("beforeprint", openAll);
    return () => window.removeEventListener("beforeprint", openAll);
  }, []);

  const tocSections = useMemo(() => {
    if (!isTier2) {
      return [
        { id: "section-overview", title: report.content.overview.title },
        { id: "section-core-axis", title: report.content.coreAxis.title },
        { id: "section-strengths-tensions", title: report.content.strengthsAndTensions.title },
        { id: "section-practical-direction", title: "Định Hướng Và Hành Động Thực Tế" },
      ];
    }
    const sections = [
      { id: "section-overview", title: report.content.overview.title },
      { id: "section-core-axis", title: report.content.coreAxis.title },
      { id: "section-key-configurations", title: "Cấu Trúc Và Cách Cục Trọng Yếu" },
      { id: "section-palace-readings", title: "Luận Giải Chi Tiết Mười Hai Cung" },
      { id: "section-thematic-synthesis", title: "Tổng Hợp Các Lĩnh Vực Đời Sống" },
      { id: "section-strengths-tensions", title: report.content.strengthsAndTensions.title },
    ];
    if (v4_1Content) {
      sections.push(
        { id: "section-current-decadal", title: v4_1Content.currentDecadal.title },
        { id: "section-annual-snapshot", title: v4_1Content.annualSnapshot.title },
        { id: "section-birth-time-sensitivity", title: v4_1Content.birthTimeSensitivity.title },
      );
    }
    sections.push({ id: "section-practical-direction", title: "Định Hướng Và Hành Động Thực Tế" });
    return sections;
  }, [report.content, isTier2, v4_1Content]);

  useReportReaderAnalytics({
    sku: report.sku,
    reportVersion: report.contentVersion,
    activeSectionId: tocSections[activeSectionIdx]?.id,
    progressPercent: progressPct,
  });

  // Restore font size from localStorage
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
      // Ignore storage errors
    }
  };

  // Restore reading progress & saved section from localStorage
  useEffect(() => {
    const reportId = report.reportId;
    try {
      // Restore previously read sections
      const savedRead = localStorage.getItem(`lsv-reader-read-${reportId}`);
      if (savedRead) {
        const parsed = JSON.parse(savedRead);
        if (Array.isArray(parsed) && parsed.length > 0) {
          queueMicrotask(() => {
            setReadSectionIds(new Set(parsed));
          });
        }
      }

      // Check last active section for "Đọc tiếp" resume chip
      const savedActiveId = localStorage.getItem(`lsv-reader-active-${reportId}`);
      if (savedActiveId) {
        const found = tocSections.find((s) => s.id === savedActiveId);
        if (found) {
          queueMicrotask(() => {
            setResumeSection({ id: found.id, title: found.title });
          });
        }
      }

      // Restore scroll position
      const savedScroll = localStorage.getItem(`lsv-reader-scroll-${reportId}`);
      if (savedScroll) {
        const pct = Number.parseFloat(savedScroll);
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
  }, [report.reportId, tocSections]);

  // Scroll-based section tracking: works for sections taller than the viewport.
  useEffect(() => {
    const reportId = report.reportId;
    let frame = 0;
    const update = () => {
      frame = 0;
      const tops = tocSections.map((section) => {
        const el = document.getElementById(section.id);
        return el ? el.getBoundingClientRect().top : Number.POSITIVE_INFINITY;
      });
      const doc = document.documentElement;
      const atBottom = window.innerHeight + window.scrollY >= doc.scrollHeight - 4;
      const idx = resolveActiveSectionIndex(tops, window.innerHeight, atBottom);
      if (idx < 0) return;
      const section = tocSections[idx]!;
      setActiveSectionIdx(idx);
      setReadSectionIds((prev) => {
        if (prev.has(section.id)) return prev;
        const next = new Set(prev);
        next.add(section.id);
        try {
          localStorage.setItem(`lsv-reader-read-${reportId}`, JSON.stringify(Array.from(next)));
          localStorage.setItem(`lsv-reader-active-${reportId}`, section.id);
        } catch {
          // Local storage failure must not block reading
        }
        return next;
      });
    };
    const schedule = () => {
      if (frame === 0) frame = requestAnimationFrame(update);
    };
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    schedule();
    return () => {
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      if (frame !== 0) cancelAnimationFrame(frame);
    };
  }, [tocSections, report.reportId]);

  // Mobile TOC Dialog Keyboard Lifecycle
  useEffect(() => {
    if (!tocOpen) return;

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

  const scrollToSection = (idx: number) => {
    const target = tocSections[idx];
    if (!target) return;
    const el = document.getElementById(target.id);
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

  const scrollToUpgrade = () => {
    const el = document.getElementById("nang-cap");
    if (el) {
      const top = el.getBoundingClientRect().top + window.scrollY - 72;
      window.scrollTo({ top, behavior: "smooth" });
    }
  };

  const handleResumeReading = () => {
    if (!resumeSection) return;
    const idx = tocSections.findIndex((s) => s.id === resumeSection.id);
    if (idx !== -1) {
      scrollToSection(idx);
    }
    setResumeSection(null);
  };

  const handlePrint = () => {
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  const handleShare = async () => {
    if (typeof window === "undefined") return;
    const url = window.location.href;
    const title = report.sku === "ZIWEI-NATAL-EXCERPT-P0"
      ? "Luận giải Bản mệnh Tử Vi — Lá Số Việt"
      : "Luận giải Tử Vi toàn diện — Lá Số Việt";

    if (navigator.share) {
      try {
        await navigator.share({ title, url });
        return;
      } catch {
        // Fallback to clipboard
      }
    }

    try {
      await navigator.clipboard.writeText(url);
      setShowShareToast(true);
      setTimeout(() => setShowShareToast(false), 3000);
    } catch {
      // Ignore clipboard error
    }
  };

  const readCount = tocSections.filter((section) => readSectionIds.has(section.id)).length;
  const totalCount = tocSections.length;
  const activeSection = tocSections[activeSectionIdx] ?? tocSections[0];

  // Khối nâng cấp chỉ xuất hiện sau khi người đọc đã đọc ít nhất 1 phần hoặc cuộn tới cuối bài
  const canShowUpgrade = readSectionIds.size >= 1 || progressPct >= 20;

  return (
    <div className={`report-reader-root ${FONT_CLASSES[fontIdx]}`}>
      {/* TOP PROGRESS READBAR */}
      <div className="reader-readbar" aria-hidden="true">
        <i style={{ width: `${progressPct}%` }} />
      </div>

      <a href="#main" className="skip-link">
        {t("reader.skip_to_main")}
      </a>

      {/* STICKY COMPACT HEADER */}
      <header className="report-reader-header">
        <div className="report-header-inner">
          <div className="report-header-brand">
            <span className="report-header-eyebrow">
              {isTier2 ? "BÁO CÁO LUẬN GIẢI TOÀN DIỆN" : "BÁO CÁO BẢN MỆNH VÀ TIỀM NĂNG"}
            </span>
            <h1 className="report-header-title">
              {isTier2 ? "Báo Cáo Luận Giải Toàn Diện Tử Vi" : "Luận Giải Bản Mệnh Tử Vi"}
            </h1>
          </div>

          <div className="report-header-controls">
            {/* Font size controls */}
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
              <span className="report-font-label">{fontLabels[fontIdx]}</span>
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
              className="report-mobile-toc-btn report-mobile-toc-trigger"
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

      <div className="container" style={{ maxWidth: 1200, marginInline: "auto", paddingInline: 16 }}>
        {/* PAGE METADATA & ACTIONS HEADER */}
        <section className="report-head">
          <div>
            <h1>{isTier2 ? "Báo Cáo Luận Giải Toàn Diện Tử Vi" : "Luận Giải Bản Mệnh Tử Vi"}</h1>
            <p>
              {locale === "en"
                ? "Personalized Zi Wei Reading · Lifetime access in your private library."
                : "Bản luận giải theo lá số · Lưu trữ trọn đời trong thư viện cá nhân."}
            </p>
          </div>
          <div className="report-tools">
            <button
              type="button"
              className="report-tool-btn report-mobile-toc-trigger"
              onClick={() => setTocOpen(true)}
            >
              <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="3" y1="12" x2="21" y2="12"/>
                <line x1="3" y1="6" x2="21" y2="6"/>
                <line x1="3" y1="18" x2="21" y2="18"/>
              </svg>
              {t("reader.open_toc")}
            </button>
            <button
              type="button"
              className="report-tool-btn"
              onClick={handlePrint}
            >
              <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              {t("reader.print_pdf")}
            </button>
            <button
              type="button"
              className="report-tool-btn"
              onClick={handleShare}
            >
              <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="18" cy="5" r="3"/>
                <circle cx="6" cy="12" r="3"/>
                <circle cx="18" cy="19" r="3"/>
                <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
                <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
              </svg>
              {showShareToast ? t("reader.share_copied") : t("reader.share")}
            </button>
          </div>
        </section>

        {/* RESUME READING BANNER */}
        {resumeSection && (
          <div className="report-resume-bar" role="status">
            <p>
              {t("reader.resume_reading_title", { section: resumeSection.title })}
            </p>
            <button
              type="button"
              className="btn-resume"
              onClick={handleResumeReading}
            >
              {t("reader.resume_reading_action")}
            </button>
          </div>
        )}

        {/* MAIN 2-COLUMN LAYOUT */}
        <div className="report-reader-layout">
          {/* LEFT TOC SIDEBAR (Desktop) */}
          <nav className="report-toc-sidebar report-toc-rail" aria-label={t("reader.toc_title")}>
            <p className="report-toc-count">
              {t("reader.read_progress_count", { read: readCount, total: totalCount })}
            </p>
            <div className="report-toc-track">
              <i style={{ width: `${(readCount / totalCount) * 100}%` }} />
            </div>

            <ol className="report-toc-ol report-toc-list">
              {tocSections.map((sec, i) => {
                const isCurrent = i === activeSectionIdx;
                const isDone = readSectionIds.has(sec.id);
                const numeral = String(i + 1).padStart(2, "0");
                return (
                  <li key={sec.id}>
                    <button
                      type="button"
                      className={`report-toc-btn report-toc-item ${isCurrent ? "is-active" : ""}`}
                      onClick={() => scrollToSection(i)}
                      aria-current={isCurrent ? "true" : undefined}
                    >
                      <span className={`report-toc-mk ${isDone ? "done" : ""}`}>
                        {isDone ? (
                          <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        ) : null}
                      </span>
                      <span className="report-toc-title">
                        <span className="report-toc-numeral">{numeral}</span>
                        {" "}
                        {sec.title}
                      </span>
                    </button>
                  </li>
                );
              })}

              {/* Locked items for Tier-1 (without numeral span to preserve tests) */}
              {!isTier2 && (
                <>
                  <li>
                    <button
                      type="button"
                      className="report-toc-btn locked"
                      onClick={scrollToUpgrade}
                    >
                      <span className="report-toc-mk lock">
                        <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                          <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                        </svg>
                      </span>
                      <span className="report-toc-title">12 cung chi tiết</span>
                    </button>
                  </li>
                  <li>
                    <button
                      type="button"
                      className="report-toc-btn locked"
                      onClick={scrollToUpgrade}
                    >
                      <span className="report-toc-mk lock">
                        <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                          <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                        </svg>
                      </span>
                      <span className="report-toc-title">Đại vận & các năm hạn</span>
                    </button>
                  </li>
                </>
              )}
            </ol>
          </nav>

          {/* CENTER READING COLUMN */}
          <main id="main" className="report-reading-column report-article-read">
            {/* Frontispiece */}
            <div className="report-frontispiece">
              <ArtifactImage
                alt={t("reader.frontispiece_alt")}
                desktop="/images/lasoviet/frontispiece-bao-cao-luan-giai-tu-vi.webp"
              />
            </div>

            <div className="report-intro-meta">
              <p className="eyebrow">
                {isTier2 ? "BÁO CÁO LUẬN GIẢI TOÀN DIỆN · TỬ VI ĐẨU SỐ" : "BẢN MỆNH VÀ TIỀM NĂNG · TỬ VI ĐẨU SỐ"}
              </p>
              <h2 className="report-doc-title">
                {isTier2 ? "Báo Cáo Luận Giải Toàn Diện Tử Vi" : "Luận Giải Bản Mệnh Tử Vi"}
              </h2>
            </div>

            {/* Rendered groups in canonical sequence */}
            <div className="report-sections-stream">
              {/* 1. Overview */}
              <section
                id="section-overview"
                data-report-section
                className="report-section-block"
              >
                <div className="report-section-header">
                  <span className="report-section-numeral">01</span>
                  <h3 className="report-section-title">{report.content.overview.title}</h3>
                </div>
                {lifePalace && <ReportStarChips palace={lifePalace} t={t} />}
                <ReportNarrative className="report-section-narrative" text={report.content.overview.narrative} />
              </section>

              {/* 2. Core Axis */}
              <section
                id="section-core-axis"
                data-report-section
                className="report-section-block"
              >
                <div className="report-section-header">
                  <span className="report-section-numeral">02</span>
                  <h3 className="report-section-title">{report.content.coreAxis.title}</h3>
                </div>
                {bodyPalace && <ReportStarChips palace={bodyPalace} t={t} />}
                <ReportNarrative className="report-section-narrative" text={report.content.coreAxis.narrative} />
              </section>

              {/* Tier-2 only sections */}
              {isTier2Content(report.content) && (
                <>
                  {/* 3. Key Configurations */}
                  <section
                    id="section-key-configurations"
                    data-report-section
                    className="report-section-block"
                  >
                    <div className="report-section-header">
                      <span className="report-section-numeral">03</span>
                      <h3 className="report-section-title">Cấu Trúc Và Cách Cục Trọng Yếu</h3>
                    </div>
                    <div className="report-subcard-group">
                      {report.content.keyConfigurations.map((config, index) => (
                        <article key={index} className="report-subcard">
                          <h4 className="report-subcard-title">{config.title}</h4>
                          <ReportNarrative className="report-subcard-narrative" text={config.narrative} />
                        </article>
                      ))}
                    </div>
                  </section>

                  {/* 4. Twelve Palace Readings */}
                  <section
                    id="section-palace-readings"
                    data-report-section
                    className="report-section-block"
                  >
                    <div className="report-section-header">
                      <span className="report-section-numeral">04</span>
                      <h3 className="report-section-title">Luận Giải Chi Tiết Mười Hai Cung</h3>
                    </div>
                    <div className="report-palace-tools">
                      <button
                        type="button"
                        className="report-palace-toggle-all"
                        onClick={toggleAllPalaces}
                        aria-pressed={allPalacesOpen}
                      >
                        {allPalacesOpen ? t("reader.palaces_collapse_all") : t("reader.palaces_expand_all")}
                      </button>
                    </div>
                    <div className="report-subcard-group">
                      {report.content.palaceReadings.map((palace) => {
                        const palaceData = snapshotPalace(palace.palaceId);
                        return (
                          <details
                            key={palace.palaceId}
                            id={`palace-${palace.palaceId.replace("ziwei.palace.", "")}`}
                            className="report-subcard report-palace-card"
                            open={openPalaces.has(palace.palaceId)}
                            onToggle={(event) => setPalaceOpen(palace.palaceId, event.currentTarget.open)}
                          >
                            <summary className="report-palace-summary">
                              {chartSnapshot && (
                                <ReportMiniChart snapshot={chartSnapshot} palaceId={palace.palaceId} t={t} />
                              )}
                              <span className="report-subcard-title">{palace.title}</span>
                              <span className="report-palace-lead">
                                {splitLeadSentence(splitNarrative(palace.narrative)[0] ?? "").lead}
                              </span>
                            </summary>
                            {palaceData && <ReportStarChips palace={palaceData} t={t} />}
                            <ReportNarrative
                              className="report-subcard-narrative"
                              text={palace.narrative}
                              lead={false}
                            />
                          </details>
                        );
                      })}
                    </div>
                  </section>

                  {/* 5. Four Thematic Synthesis Sections */}
                  <section
                    id="section-thematic-synthesis"
                    data-report-section
                    className="report-section-block"
                  >
                    <div className="report-section-header">
                      <span className="report-section-numeral">05</span>
                      <h3 className="report-section-title">Tổng Hợp Các Lĩnh Vực Đời Sống</h3>
                    </div>
                    <div className="report-subcard-group">
                      {report.content.thematicSynthesis.map((theme) => (
                        <article key={theme.id} id={`theme-${theme.id}`} className="report-subcard">
                          <h4 className="report-subcard-title">{theme.title}</h4>
                          <ReportNarrative className="report-subcard-narrative" text={theme.narrative} />
                        </article>
                      ))}
                    </div>
                  </section>
                </>
              )}

              {/* Strengths and Tensions: 03 in Tier-1, 06 in Tier-2 */}
              <section
                id="section-strengths-tensions"
                data-report-section
                className="report-section-block"
              >
                <div className="report-section-header">
                  <span className="report-section-numeral">{isTier2 ? "06" : "03"}</span>
                  <h3 className="report-section-title">{report.content.strengthsAndTensions.title}</h3>
                </div>
                <ReportNarrative className="report-section-narrative" text={report.content.strengthsAndTensions.narrative} />
              </section>

              {/* Tier 1 In-Reader Upgrade Box: Only rendered after reading meaningful content */}
              {!isTier2 && canShowUpgrade && (
                <div className="report-upgrade-box" id="nang-cap">
                  <h3>{t("reader.upgrade_title")}</h3>
                  <p>{t("reader.upgrade_desc")}</p>

                  <div className="report-upgrade-map">
                    <div className="report-upgrade-map-col">
                      <h4>{t("reader.unlocked_map_title")}</h4>
                      <ul>
                        <li>✓ {report.content.overview.title}</li>
                        <li>✓ {report.content.coreAxis.title}</li>
                        <li>✓ {report.content.strengthsAndTensions.title}</li>
                        <li>✓ Định hướng thực tế</li>
                      </ul>
                    </div>
                    <div className="report-upgrade-map-col">
                      <h4>{t("reader.locked_map_title")}</h4>
                      <ul>
                        <li>🔒 12 cung chi tiết</li>
                        <li>🔒 Cấu trúc trọng yếu</li>
                        <li>🔒 4 lĩnh vực đời sống</li>
                        <li>🔒 Đại vận và lưu niên</li>
                      </ul>
                    </div>
                  </div>

                  <p className="report-upgrade-deadline">
                    {t("reader.upgrade_price_notice")}
                  </p>

                  <div className="report-upgrade-row">
                    <a className="btn-upgrade" href="/nap-la">
                      {t("reader.upgrade_cta")}
                    </a>
                  </div>
                </div>
              )}

              {v4_1Content && (
                <>
                  <section
                    id="section-current-decadal"
                    data-report-section
                    className="report-section-block"
                  >
                    <div className="report-section-header">
                      <span className="report-section-numeral">07</span>
                      <h3 className="report-section-title">{v4_1Content.currentDecadal.title}</h3>
                    </div>
                    {chartSnapshot && <ReportDecadalTimeline snapshot={chartSnapshot} t={t} />}
                    {decadalPalace && <ReportStarChips palace={decadalPalace} t={t} />}
                    <ReportNarrative className="report-section-narrative" text={v4_1Content.currentDecadal.narrative} />
                  </section>

                  <section
                    id="section-annual-snapshot"
                    data-report-section
                    className="report-section-block"
                  >
                    <div className="report-section-header">
                      <span className="report-section-numeral">08</span>
                      <h3 className="report-section-title">{v4_1Content.annualSnapshot.title}</h3>
                    </div>
                    {annualPalace && <ReportStarChips palace={annualPalace} t={t} />}
                    <ReportNarrative className="report-section-narrative" text={v4_1Content.annualSnapshot.narrative} />
                  </section>

                  <section
                    id="section-birth-time-sensitivity"
                    data-report-section
                    className="report-section-block report-birth-time-sensitivity"
                  >
                    <div className="report-section-header">
                      <span className="report-section-numeral">09</span>
                      <h3 className="report-section-title">{v4_1Content.birthTimeSensitivity.title}</h3>
                    </div>
                    <div className="report-sensitivity-factors">
                      <article className="report-sensitivity-factor report-sensitivity-factor-stable">
                        <h4 className="report-sensitivity-factor-title">
                          {v4_1Content.birthTimeSensitivity.stableFactors.title}
                        </h4>
                        <ReportNarrative lead={false} text={v4_1Content.birthTimeSensitivity.stableFactors.narrative} />
                      </article>
                      <article className="report-sensitivity-factor report-sensitivity-factor-sensitive">
                        <h4 className="report-sensitivity-factor-title">
                          {v4_1Content.birthTimeSensitivity.sensitiveFactors.title}
                        </h4>
                        <ReportNarrative lead={false} text={v4_1Content.birthTimeSensitivity.sensitiveFactors.narrative} />
                      </article>
                    </div>
                  </section>
                </>
              )}

              {/* Practical Direction: 04 in Tier-1, 07 in V1 Tier-2, 10 in V4.1 Tier-2 */}
              <section
                id="section-practical-direction"
                data-report-section
                className="report-section-block"
              >
                <div className="report-section-header">
                  <span className="report-section-numeral">{v4_1Content ? "10" : isTier2 ? "07" : "04"}</span>
                  <h3 className="report-section-title">Định Hướng Và Hành Động Thực Tế</h3>
                </div>
                {report.contentVersion === "ziwei-comprehensive.v3" ? (
                  <ol className="report-action-cards">
                    {report.content.practicalDirection.map((direction, index) => (
                      <li key={index} className="report-action-card">
                        <h4 className="report-action-title">{direction.recommendation}</h4>
                        <p>
                          <span className="report-action-label">{t("reader.action_why")}</span>{" "}
                          {direction.rationale}
                        </p>
                        <p>
                          <span className="report-action-label">{t("reader.action_avoid")}</span>{" "}
                          {direction.avoid}
                        </p>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <ul className="report-directions-list">
                    {report.content.practicalDirection.map((direction, index) => (
                      <li key={index}>{direction}</li>
                    ))}
                  </ul>
                )}
              </section>
            </div>

            <div className="report-end-marker" aria-hidden="true">
              <span>{t("reader.end_of_report")}</span>
            </div>
          </main>
        </div>
      </div>

      {/* MOBILE TOC SHEET (Modal / Dialog) */}
      {tocOpen && (
        <div
          ref={tocDialogRef}
          role="dialog"
          aria-modal="true"
          aria-label={t("reader.toc_title")}
          className="report-sheet-overlay report-mobile-toc-dialog"
        >
          <div
            className="report-sheet-scrim report-mobile-toc-backdrop"
            onClick={closeTocAndRestoreFocus}
          />
          <div className="report-sheet-panel report-mobile-toc-panel">
            <div className="report-sheet-handle" />
            <div className="report-sheet-header report-mobile-toc-header">
              <span className="report-rail-heading">{t("reader.toc_title")}</span>
              <button
                ref={closeButtonRef}
                type="button"
                className="report-sheet-close report-mobile-toc-close"
                onClick={closeTocAndRestoreFocus}
                aria-label={t("reader.close_toc")}
              >
                ✕
              </button>
            </div>
            <ol className="report-toc-ol report-mobile-toc-list">
              {tocSections.map((sec, i) => {
                const numeral = String(i + 1).padStart(2, "0");
                const isDone = readSectionIds.has(sec.id);
                return (
                  <li key={sec.id}>
                    <button
                      type="button"
                      className="report-toc-btn report-mobile-toc-item"
                      onClick={() => {
                        scrollToSection(i);
                        closeTocAndRestoreFocus();
                      }}
                    >
                      <span className={`report-toc-mk ${isDone ? "done" : ""}`}>
                        {isDone ? (
                          <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        ) : null}
                      </span>
                      <span className="report-toc-title">
                        <span className="report-toc-numeral">{numeral}</span>
                        {" "}
                        {sec.title}
                      </span>
                    </button>
                  </li>
                );
              })}
              {!isTier2 && (
                <>
                  <li>
                    <button
                      type="button"
                      className="report-toc-btn locked report-mobile-toc-item"
                      onClick={() => {
                        scrollToUpgrade();
                        closeTocAndRestoreFocus();
                      }}
                    >
                      <span className="report-toc-mk lock">
                        <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                          <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                        </svg>
                      </span>
                      <span className="report-toc-title">12 cung chi tiết</span>
                    </button>
                  </li>
                  <li>
                    <button
                      type="button"
                      className="report-toc-btn locked report-mobile-toc-item"
                      onClick={() => {
                        scrollToUpgrade();
                        closeTocAndRestoreFocus();
                      }}
                    >
                      <span className="report-toc-mk lock">
                        <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                          <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                        </svg>
                      </span>
                      <span className="report-toc-title">Đại vận & các năm hạn</span>
                    </button>
                  </li>
                </>
              )}
            </ol>
          </div>
        </div>
      )}
    </div>
  );
}
