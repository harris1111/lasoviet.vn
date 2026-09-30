import { scrollProgress, type ScrollRange } from "./troi-nam-motion-math";

export type TroiNamProgressSnapshot = Readonly<{
  progress: number;
  range: Readonly<ScrollRange>;
  rangeValid: boolean;
  reducedMotion: boolean;
}>;

export type TroiNamProgressController = {
  read(): TroiNamProgressSnapshot;
  refresh(): void;
  subscribe(listener: (value: TroiNamProgressSnapshot) => void): () => void;
  dispose(): void;
};

const owners = new WeakMap<HTMLElement, TroiNamProgressController>();
const ATTRIBUTE = "data-troi-nam-progress";

/** Opt-in measurement only: no scroll interception, hidden styles, renderer or continuous RAF. */
export function createTroiNamProgress(root: HTMLElement): TroiNamProgressController | null {
  if (owners.has(root)) throw new Error("Trời Nam progress already has an owner for this root.");
  const doc = root.ownerDocument;
  const view = doc.defaultView;
  const hero = root.querySelector<HTMLElement>('[data-troi-nam-block="hero"]');
  const explore = root.querySelector<HTMLElement>('[data-troi-nam-block="explore"]');
  if (!view || !hero || !explore) return null;

  const previous = root.getAttribute(ATTRIBUTE);
  const media = view.matchMedia?.("(prefers-reduced-motion: reduce)");
  const listeners = new Set<(value: TroiNamProgressSnapshot) => void>();
  let disposed = false;
  let frame = 0;
  let needsMeasure = true;
  let range: ScrollRange = { start: 0, end: 0 };
  let snapshot: TroiNamProgressSnapshot;

  function paint() {
    frame = 0;
    if (disposed) return;
    if (needsMeasure) {
      range = {
        start: hero!.getBoundingClientRect().top + view!.scrollY,
        end: explore!.getBoundingClientRect().top + view!.scrollY,
      };
      needsMeasure = false;
    }
    const next: TroiNamProgressSnapshot = Object.freeze({
      progress: scrollProgress(view!.scrollY, range),
      range: Object.freeze({ ...range }),
      rangeValid: Number.isFinite(range.start) && Number.isFinite(range.end) && range.end > range.start,
      reducedMotion: media?.matches ?? false,
    });
    const changed = !snapshot || next.progress !== snapshot.progress ||
      next.reducedMotion !== snapshot.reducedMotion || next.rangeValid !== snapshot.rangeValid ||
      next.range.start !== snapshot.range.start || next.range.end !== snapshot.range.end;
    snapshot = next;
    if (!changed) return;
    root.setAttribute(ATTRIBUTE, String(snapshot.progress));
    root.dispatchEvent(new view!.CustomEvent("troi-nam:progress", { detail: snapshot }));
    for (const listener of listeners) listener(snapshot);
  }

  function schedule() {
    if (!disposed && doc.visibilityState !== "hidden" && !frame) frame = view!.requestAnimationFrame(paint);
  }

  function refresh() {
    needsMeasure = true;
    schedule();
  }

  function visibility() {
    if (doc.visibilityState === "hidden") {
      if (frame) view!.cancelAnimationFrame(frame);
      frame = 0;
    } else refresh();
  }

  const observer = typeof view.ResizeObserver === "function" ? new view.ResizeObserver(refresh) : null;
  const controller: TroiNamProgressController = {
    read: () => snapshot,
    refresh,
    subscribe(listener) {
      // Scene consumers must catch update failures and restore their static fallback.
      if (disposed) return () => {};
      listeners.add(listener);
      listener(snapshot);
      return () => { listeners.delete(listener); };
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      if (frame) view.cancelAnimationFrame(frame);
      frame = 0;
      observer?.disconnect();
      view.removeEventListener("scroll", schedule);
      view.removeEventListener("resize", refresh);
      view.removeEventListener("pageshow", refresh);
      view.removeEventListener("hashchange", refresh);
      doc.removeEventListener("visibilitychange", visibility);
      media?.removeEventListener("change", schedule);
      listeners.clear();
      if (previous === null) root.removeAttribute(ATTRIBUTE);
      else root.setAttribute(ATTRIBUTE, previous);
      owners.delete(root);
    },
  };

  owners.set(root, controller);
  // Initial geometry is synchronous: restored/deep-linked scroll is available before lazy scene loading.
  paint();
  view.addEventListener("scroll", schedule, { passive: true });
  view.addEventListener("resize", refresh);
  view.addEventListener("pageshow", refresh);
  view.addEventListener("hashchange", refresh);
  doc.addEventListener("visibilitychange", visibility);
  media?.addEventListener("change", schedule);
  observer?.observe(root);
  observer?.observe(hero);
  observer?.observe(explore);
  void doc.fonts?.ready.then(refresh, () => {});
  return controller;
}
