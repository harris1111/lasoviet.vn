"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
  type KeyboardEvent,
  type MouseEvent,
} from "react";
import { useTranslations } from "next-intl";

import { HomepageV3GoWizard } from "./homepage-v3-go-wizard";
import { advanceRotation, createRotation, type RotationState } from "./homepage-v3-testimonial-rotation";
import {
  ROTATION_QUEUE,
  TESTIMONIALS,
  TESTIMONIAL_GROUPS,
  TESTIMONIAL_LABELS,
  testimonialById,
  testimonialMonogram,
  type Testimonial,
  type TestimonialGroup,
} from "./homepage-v3-testimonials";

type Filter = "all" | TestimonialGroup;

const ROTATE_MS = 6000;
const LEAVE_MS = 260;
const ENTER_MS = 420;
const QUEUE_ITEMS = ROTATION_QUEUE.map((id) => testimonialById(id)).filter((item): item is Testimonial => Boolean(item));

function useMedia(query: string, serverValue: boolean): boolean {
  const subscribe = useCallback(
    (notify: () => void) => {
      const list = window.matchMedia(query);
      list.addEventListener("change", notify);
      return () => list.removeEventListener("change", notify);
    },
    [query],
  );
  return useSyncExternalStore(subscribe, () => window.matchMedia(query).matches, () => serverValue);
}

function subscribeVisibility(notify: () => void) {
  document.addEventListener("visibilitychange", notify);
  return () => document.removeEventListener("visibilitychange", notify);
}

function useInView<T extends HTMLElement>(threshold: number) {
  const [node, setNode] = useState<T | null>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    if (!node || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(([entry]) => setInView(Boolean(entry?.isIntersecting)), { threshold });
    observer.observe(node);
    return () => observer.disconnect();
  }, [node, threshold]);
  return [setNode, inView] as const;
}

/**
 * Six equal cards that reveal on scroll and then change one card at a time, so every one of the
 * 15 quotes gets shown. Mobile gets one swipeable row of all 15. Reader quotes stay in Vietnamese
 * on both locales, so quote and attribution carry lang="vi".
 */
export function HomepageV3Testimonials() {
  const t = useTranslations("homepage-v3.testimonials");
  const [expanded, setExpanded] = useState(false);
  const [filter, setFilter] = useState<Filter>("all");
  const [openId, setOpenId] = useState<string | null>(null);
  const [paused, setPaused] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [rowTouched, setRowTouched] = useState(false);
  const [phase, setPhase] = useState<{ slot: number; kind: "out" | "in" } | null>(null);

  const reduced = useMedia("(prefers-reduced-motion: reduce)", false);
  const mobile = useMedia("(max-width: 767px)", false);
  const wide = useMedia("(min-width: 1024px)", true);
  const pageVisible = useSyncExternalStore(subscribeVisibility, () => document.visibilityState === "visible", () => true);
  const slotCount = wide ? 6 : 4;

  const [rotation, setRotation] = useState<RotationState>(() => createRotation(ROTATION_QUEUE, 6));
  const [setGridNode, gridInView] = useInView<HTMLDivElement>(0.35);
  const [setRowNode, rowInView] = useInView<HTMLDivElement>(0.5);
  const rowRef = useRef<HTMLDivElement | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);

  // Tablet shows four slots; rebuild the rotation when the breakpoint changes.
  const [builtFor, setBuiltFor] = useState(6);
  if (builtFor !== slotCount) {
    setBuiltFor(slotCount);
    setRotation(createRotation(ROTATION_QUEUE, slotCount));
  }

  const blocked = reduced || paused || hovered || Boolean(openId) || expanded || !pageVisible;
  const gridRunning = !mobile && gridInView && !blocked;
  const rowRunning = mobile && rowInView && !rowTouched && !blocked;

  // The interval owns its own copy of the rotation; React state only drives what is painted.
  const rotationRef = useRef<RotationState>(rotation);
  useEffect(() => {
    if (!gridRunning) return;
    const timers: number[] = [];
    const interval = window.setInterval(() => {
      const base = rotationRef.current.slots.length === slotCount ? rotationRef.current : createRotation(ROTATION_QUEUE, slotCount);
      const next = advanceRotation(base);
      rotationRef.current = next;
      if (next.changedSlot === null) return;
      const slot = next.changedSlot;
      // Leave with the old quote, then swap and enter. The card frame never moves.
      setPhase({ slot, kind: "out" });
      timers.push(
        window.setTimeout(() => {
          setRotation(next);
          setPhase({ slot, kind: "in" });
          timers.push(window.setTimeout(() => setPhase(null), ENTER_MS));
        }, LEAVE_MS),
      );
    }, ROTATE_MS);
    return () => {
      window.clearInterval(interval);
      timers.forEach((id) => window.clearTimeout(id));
      setPhase(null);
    };
  }, [gridRunning, slotCount]);

  useEffect(() => {
    if (!rowRunning) return;
    const interval = window.setInterval(() => {
      const row = rowRef.current;
      const card = row?.firstElementChild as HTMLElement | null;
      if (!row || !card) return;
      const step = card.offsetWidth + 16;
      const atEnd = row.scrollLeft + row.clientWidth >= row.scrollWidth - 8;
      row.scrollTo({ left: atEnd ? 0 : row.scrollLeft + step, behavior: "smooth" });
    }, ROTATE_MS);
    return () => window.clearInterval(interval);
  }, [rowRunning]);

  const dialog = openId ? testimonialById(openId) : undefined;
  const visible = TESTIMONIALS.filter((item) => filter === "all" || item.group === filter);
  const slots = rotation.slots.map((id) => testimonialById(id)).filter((item): item is Testimonial => Boolean(item));

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

  function scrollRow(direction: 1 | -1) {
    setRowTouched(true);
    const row = rowRef.current;
    const card = row?.firstElementChild as HTMLElement | null;
    row?.scrollBy({ left: direction * ((card?.offsetWidth ?? 300) + 16), behavior: reduced ? "auto" : "smooth" });
  }

  function card(item: Testimonial, variant: "slot" | "row" | "list", index: number) {
    const cardPhase = variant === "slot" && phase?.slot === index ? phase.kind : undefined;
    return (
      <article
        key={variant === "slot" ? `slot-${index}` : `${variant}-${item.id}`}
        className={`hv3-tt-card hv3-tt-card-${variant}`}
        data-reveal={variant === "slot" ? "" : undefined}
        data-glow={variant === "list" ? undefined : ""}
        style={{ "--i": index } as CSSProperties}
        onClick={(event) => open(item.id, event)}
      >
        {index === 0 && variant !== "list" ? <span aria-hidden="true" className="hv3-tt-mark" /> : null}
        <div className="hv3-tt-body" data-phase={cardPhase}>
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
        </div>
      </article>
    );
  }

  const showPause = !reduced && !expanded;

  return (
    <div className="hv3-container hv3-tt">
      <div className="hv3-tt-head">
        <div>
          <p className="hv3-eyebrow">{t("eyebrow")}</p>
          <h2 className="hv3-h2" id="hv3-tt-title" data-reveal="title">
            {t("titleA")}
            <br />
            {t("titleB")}
          </h2>
        </div>
        <p className="hv3-tt-lead">{t("lead")}</p>
      </div>

      <div
        ref={setGridNode}
        className="hv3-tt-grid"
        role="region"
        aria-roledescription={t("rotationLabel")}
        aria-labelledby="hv3-tt-title"
        aria-live="off"
        onPointerEnter={() => setHovered(true)}
        onPointerLeave={() => setHovered(false)}
        onFocus={() => setHovered(true)}
        onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setHovered(false); }}
      >
        {slots.map((item, index) => card(item, "slot", index))}
      </div>

      <div className="hv3-tt-rowwrap" aria-labelledby="hv3-tt-title" role="region">
        <div
          ref={(node) => { rowRef.current = node; setRowNode(node); }}
          className="hv3-tt-row"
          onPointerDown={() => setRowTouched(true)}
          onWheel={() => setRowTouched(true)}
        >
          {QUEUE_ITEMS.map((item, index) => card(item, "row", index))}
        </div>
        <div className="hv3-tt-arrows">
          <button type="button" aria-label={t("prev")} onClick={() => scrollRow(-1)}>←</button>
          <button type="button" aria-label={t("next")} onClick={() => scrollRow(1)}>→</button>
        </div>
      </div>

      <div className="hv3-tt-actions">
        <div className="hv3-tt-actions-left">
          <button type="button" className="hv3-tt-more" aria-expanded={expanded} aria-controls="hv3-tt-extra" onClick={() => setExpanded((current) => !current)}>
            {expanded ? t("less") : t("more")}
          </button>
          {showPause ? (
            <button type="button" className="hv3-tt-pause" aria-pressed={paused} onClick={() => setPaused((current) => !current)}>
              <span aria-hidden="true" className="hv3-tt-pause-icon" data-paused={paused} />
              {paused ? t("play") : t("pause")}
            </button>
          ) : null}
        </div>
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
          <div aria-live="polite" className="hv3-tt-list" key={filter}>
            {visible.map((item, index) => card(item, "list", index))}
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
