"use client";

import { useLayoutEffect, useRef, useState, type CSSProperties } from "react";

import { computeMarqueeGeometry } from "./homepage-v3-marquee-geometry";

export interface MarqueeItem {
  text: string;
  href: string;
}

/**
 * Continuous chip row. Measures one label cycle, repeats it until a group is wider than the viewport,
 * then renders two identical groups so a -50% slide loops without a gap.
 * Only the first cycle is in the Tab order and the accessibility tree; the copies stay clickable.
 */
export function HomepageV3Marquee({ items, reverse = false }: { items: ReadonlyArray<MarqueeItem>; reverse?: boolean }) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLSpanElement>(null);
  const [geometry, setGeometry] = useState({ copies: 1, seconds: 40, ready: false });

  useLayoutEffect(() => {
    const viewport = viewportRef.current;
    const measure = measureRef.current;
    if (!viewport || !measure) return;
    let disposed = false;
    const update = () => {
      if (disposed) return;
      const next = computeMarqueeGeometry(viewport.getBoundingClientRect().width, measure.getBoundingClientRect().width);
      if (!next) return;
      setGeometry((prev) =>
        prev.ready && prev.copies === next.copies && Math.abs(prev.seconds - next.seconds) < 0.1 ? prev : { ...next, ready: true },
      );
    };
    const observer = new ResizeObserver(update);
    observer.observe(viewport);
    observer.observe(measure);
    void document.fonts?.ready?.then(update);
    update();
    return () => {
      disposed = true;
      observer.disconnect();
    };
  }, [items]);

  const group = (groupIndex: number) => (
    <span className="hv3-marquee-group" aria-hidden={groupIndex === 0 ? undefined : true} key={groupIndex}>
      {Array.from({ length: geometry.copies }, (_, cycleIndex) => {
        const primary = groupIndex === 0 && cycleIndex === 0;
        return (
          <span className="hv3-marquee-cycle" aria-hidden={primary ? undefined : true} key={cycleIndex}>
            {items.map((item, index) => (
              <a href={item.href} key={`${item.href}-${index}`} tabIndex={primary ? undefined : -1}>
                {item.text}
              </a>
            ))}
          </span>
        );
      })}
    </span>
  );

  return (
    <div className="hv3-marquee" ref={viewportRef}>
      <span className="hv3-marquee-measure" aria-hidden="true">
        <span className="hv3-marquee-cycle" ref={measureRef}>
          {items.map((item, index) => (
            <span className="hv3-marquee-chip" key={`${item.href}-${index}`}>
              {item.text}
            </span>
          ))}
        </span>
      </span>
      <div
        className={reverse ? "hv3-marquee-track hv3-marquee-reverse" : "hv3-marquee-track"}
        data-ready={geometry.ready}
        style={{ "--marquee-duration": `${geometry.seconds}s` } as CSSProperties}
      >
        {group(0)}
        {group(1)}
      </div>
    </div>
  );
}
