"use client";

import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type MouseEvent } from "react";
import { useTranslations } from "next-intl";

import { HomepageV3GoWizard } from "./homepage-v3-go-wizard";
import {
  FEATURED_TESTIMONIAL,
  SECONDARY_TESTIMONIALS,
  TESTIMONIALS,
  TESTIMONIAL_GROUPS,
  TESTIMONIAL_LABELS,
  testimonialById,
  testimonialMonogram,
  type Testimonial,
  type TestimonialGroup,
} from "./homepage-v3-testimonials";

type Filter = "all" | TestimonialGroup;

/** Reader quotes stay in Vietnamese on both locales, so quote and attribution carry lang="vi". */
export function HomepageV3Testimonials() {
  const t = useTranslations("homepage-v3.testimonials");
  const [expanded, setExpanded] = useState(false);
  const [filter, setFilter] = useState<Filter>("all");
  const [openId, setOpenId] = useState<string | null>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);

  const featured = testimonialById(FEATURED_TESTIMONIAL);
  const secondary = SECONDARY_TESTIMONIALS.map((id) => testimonialById(id)).filter((item): item is Testimonial => Boolean(item));
  const dialog = openId ? testimonialById(openId) : undefined;
  const visible = TESTIMONIALS.filter((item) => filter === "all" || item.group === filter);

  const labelFor = (item: Testimonial) => {
    const key = TESTIMONIAL_LABELS[item.id];
    return key ? t(key) : t(`group.${item.group}`);
  };

  function open(id: string, event: MouseEvent<HTMLElement>) {
    const button = event.currentTarget.matches("button") ? event.currentTarget : event.currentTarget.querySelector("button");
    returnFocus.current = button;
    setOpenId(id);
  }

  function close() {
    setOpenId(null);
    const target = returnFocus.current;
    window.setTimeout(() => target?.focus(), 0);
  }

  useEffect(() => {
    if (!openId) return;
    closeRef.current?.focus();
    const onKey = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpenId(null);
        const target = returnFocus.current;
        window.setTimeout(() => target?.focus(), 0);
      }
    };
    document.body.classList.add("hv3-tt-lock");
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.classList.remove("hv3-tt-lock");
      window.removeEventListener("keydown", onKey);
    };
  }, [openId]);

  // The dialog has one control, so Tab simply stays on it.
  function trapTab(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Tab") {
      event.preventDefault();
      closeRef.current?.focus();
    }
  }

  function scrollTrack(direction: 1 | -1) {
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    trackRef.current?.scrollBy({ left: direction * 300, behavior: reduce ? "auto" : "smooth" });
  }

  function card(item: Testimonial, variant: "featured" | "secondary" | "list", index = 0) {
    return (
      <article
        key={`${variant}-${item.id}`}
        className={`hv3-tt-card hv3-tt-${variant}`}
        data-reveal={variant === "list" ? undefined : ""}
        style={{ "--i": index } as CSSProperties}
        onClick={(event) => open(item.id, event)}
      >
        {variant === "featured" ? <span aria-hidden="true" className="hv3-tt-mark" /> : null}
        <span className="hv3-tt-label">{labelFor(item)}</span>
        <p className="hv3-tt-quote" lang="vi">“{item.excerpt}”</p>
        <div className="hv3-tt-foot">
          <div className="hv3-tt-who">
            <span aria-hidden="true" className="hv3-tt-mono">{testimonialMonogram(item.name)}</span>
            <div lang="vi">
              <div className="hv3-tt-name">{item.name}</div>
              <div className="hv3-tt-city">{item.city}</div>
            </div>
          </div>
          <button type="button" className="hv3-tt-read" aria-label={t("readFullAria", { name: item.name })} onClick={(event) => { event.stopPropagation(); open(item.id, event); }}>
            {t("readFull")}
          </button>
        </div>
      </article>
    );
  }

  return (
    <div className="hv3-container hv3-tt">
      <div className="hv3-tt-head">
        <div>
          <p className="hv3-eyebrow">{t("eyebrow")}</p>
          <h2 className="hv3-h2" id="hv3-tt-title">
            {t("titleA")}
            <br />
            {t("titleB")}
          </h2>
        </div>
        <p className="hv3-tt-lead">{t("lead")}</p>
      </div>

      <div className="hv3-tt-grid" aria-labelledby="hv3-tt-title" role="region">
        {featured ? card(featured, "featured") : null}
        <div className="hv3-tt-side">
          <div ref={trackRef} className="hv3-tt-track">
            {secondary.map((item, index) => card(item, "secondary", index + 1))}
          </div>
          <div className="hv3-tt-arrows">
            <button type="button" aria-label={t("prev")} onClick={() => scrollTrack(-1)}>←</button>
            <button type="button" aria-label={t("next")} onClick={() => scrollTrack(1)}>→</button>
          </div>
        </div>
      </div>

      <div className="hv3-tt-actions">
        <button type="button" className="hv3-tt-more" aria-expanded={expanded} aria-controls="hv3-tt-extra" onClick={() => setExpanded((current) => !current)}>
          {expanded ? t("less") : t("more")}
        </button>
        <HomepageV3GoWizard className="hv3-tt-start">{t("start")}</HomepageV3GoWizard>
      </div>

      {expanded ? (
        <div id="hv3-tt-extra" className="hv3-tt-extra">
          <div role="group" aria-label={t("filterLabel")} className="hv3-tt-filters">
            {(["all", ...TESTIMONIAL_GROUPS] as const).map((key) => {
              const count = key === "all" ? TESTIMONIALS.length : TESTIMONIALS.filter((item) => item.group === key).length;
              return (
                <button key={key} type="button" aria-pressed={filter === key} onClick={() => setFilter(key)}>
                  {key === "all" ? t("filterAll") : t(`group.${key}`)} · {count}
                </button>
              );
            })}
          </div>
          <div aria-live="polite" className="hv3-tt-list">
            {visible.map((item) => card(item, "list"))}
          </div>
        </div>
      ) : null}

      {dialog ? (
        <div className="hv3-tt-overlay" onClick={close}>
          <div role="dialog" aria-modal="true" aria-labelledby="hv3-tt-dialog-title" className="hv3-tt-dialog" onClick={(event) => event.stopPropagation()} onKeyDown={trapTab}>
            <div className="hv3-tt-dialog-head">
              <div>
                <span className="hv3-eyebrow">{t("dialogEyebrow")}</span>
                <strong id="hv3-tt-dialog-title" lang="vi">{dialog.name}</strong>
              </div>
              <button ref={closeRef} type="button" aria-label={t("close")} onClick={close}>×</button>
            </div>
            <blockquote lang="vi">“{dialog.quote}”</blockquote>
            <p className="hv3-tt-attrib" lang="vi">{dialog.header}</p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
