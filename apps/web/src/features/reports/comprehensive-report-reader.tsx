"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import type {
  ComprehensiveReportTier2PublicContentV1,
  ReportComprehensiveReadyViewV1,
} from "@lasoviet/contracts";

import { ArtifactImage } from "../../components/artifact-image";

export type ComprehensiveReportReaderProps = {
  locale: "vi";
  report: ReportComprehensiveReadyViewV1;
};

function isTier2Content(
  content: ReportComprehensiveReadyViewV1["content"],
): content is ComprehensiveReportTier2PublicContentV1 {
  return "keyConfigurations" in content && Array.isArray((content as any).keyConfigurations);
}

const FONT_CLASSES = ["reader-font-sm", "reader-font-md", "reader-font-lg"] as const;

export function ComprehensiveReportReader({ report }: ComprehensiveReportReaderProps) {
  const t = useTranslations("reports");

  const [fontIdx, setFontIdx] = useState<number>(1);
  const [activeSectionIdx, setActiveSectionIdx] = useState<number>(0);
  const [tocOpen, setTocOpen] = useState<boolean>(false);
  const [progressPct, setProgressPct] = useState<number>(0);

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

  const tocSections = useMemo(() => {
    if (!isTier2) {
      return [
        { id: "section-overview", title: report.content.overview.title },
        { id: "section-core-axis", title: report.content.coreAxis.title },
        { id: "section-strengths-tensions", title: report.content.strengthsAndTensions.title },
        { id: "section-practical-direction", title: "Định Hướng Và Hành Động Thực Tế" },
      ];
    }
    return [
      { id: "section-overview", title: report.content.overview.title },
      { id: "section-core-axis", title: report.content.coreAxis.title },
      { id: "section-key-configurations", title: "Cấu Trúc Và Cách Cục Trọng Yếu" },
      { id: "section-palace-readings", title: "Luận Giải Chi Tiết Mười Hai Cung" },
      { id: "section-thematic-synthesis", title: "Tổng Hợp Các Lĩnh Vực Đời Sống" },
      { id: "section-strengths-tensions", title: report.content.strengthsAndTensions.title },
      { id: "section-practical-direction", title: "Định Hướng Và Hành Động Thực Tế" },
    ];
  }, [report.content, isTier2]);

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

  // Section observer for TOC tracking
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const idx = tocSections.findIndex((s) => s.id === entry.target.id);
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
  }, [tocSections]);

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

  const activeSection = tocSections[activeSectionIdx] ?? tocSections[0];

  return (
    <div className={`report-reader-root ${FONT_CLASSES[fontIdx]}`}>
      <a href="#main" className="skip-link">
        {t("reader.skip_to_main")}
      </a>

      {/* STICKY COMPACT HEADER */}
      <header className="report-reader-header">
        <div className="report-header-inner">
          <div className="report-header-brand">
            <span className="report-header-eyebrow">BÁO CÁO LUẬN GIẢI TOÀN DIỆN</span>
            <h1 className="report-header-title">Báo Cáo Luận Giải Toàn Diện Tử Vi</h1>
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
            {tocSections.map((sec, i) => {
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
              alt="Bìa báo cáo luận giải Tử Vi — ảnh vật phẩm sơn mài"
              desktop="/images/lasoviet/frontispiece-bao-cao-luan-giai-tu-vi.webp"
            />
          </div>

          <div className="report-intro-meta">
            <p className="eyebrow">BÁO CÁO LUẬN GIẢI TOÀN DIỆN · TỬ VI ĐẨU SỐ</p>
            <h2 className="report-doc-title">Báo Cáo Luận Giải Toàn Diện Tử Vi</h2>
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
              <div className="report-section-narrative">
                <p>{report.content.overview.narrative}</p>
              </div>
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
              <div className="report-section-narrative">
                <p>{report.content.coreAxis.narrative}</p>
              </div>
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
                        <p className="report-subcard-narrative">{config.narrative}</p>
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
                  <div className="report-subcard-group">
                    {report.content.palaceReadings.map((palace) => (
                      <article key={palace.palaceId} id={`palace-${palace.palaceId.replace("ziwei.palace.", "")}`} className="report-subcard">
                        <h4 className="report-subcard-title">{palace.title}</h4>
                        <p className="report-subcard-narrative">{palace.narrative}</p>
                      </article>
                    ))}
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
                        <p className="report-subcard-narrative">{theme.narrative}</p>
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
              <div className="report-section-narrative">
                <p>{report.content.strengthsAndTensions.narrative}</p>
              </div>
            </section>

            {/* Practical Direction: 04 in Tier-1, 07 in Tier-2 */}
            <section
              id="section-practical-direction"
              data-report-section
              className="report-section-block"
            >
              <div className="report-section-header">
                <span className="report-section-numeral">{isTier2 ? "07" : "04"}</span>
                <h3 className="report-section-title">Định Hướng Và Hành Động Thực Tế</h3>
              </div>
              <ul className="report-directions-list">
                {report.content.practicalDirection.map((direction, index) => (
                  <li key={index}>{direction}</li>
                ))}
              </ul>
            </section>
          </div>

          <div className="report-end-marker" aria-hidden="true">
            <span>{t("reader.end_of_report")}</span>
          </div>
        </main>

        {/* RIGHT READING PROGRESS RAIL (Desktop) */}
        <aside className="report-evidence-rail" aria-label={t("reader.toc_title")}>
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
              {tocSections.map((sec, i) => (
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
