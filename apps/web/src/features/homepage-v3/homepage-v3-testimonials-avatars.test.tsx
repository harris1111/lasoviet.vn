import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import manifest from "../../../public/images/troi-nam/manifest.json";
import { TroiNamTestimonials } from "../troi-nam/troi-nam-testimonials";
import { HomepageV3Testimonials } from "./homepage-v3-testimonials-section";
import { ROTATION_QUEUE, TESTIMONIALS, testimonialMonogram } from "./homepage-v3-testimonials";

// Follow the existing SSR renderer harness; do not introduce a DOM environment.
vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock("./homepage-v3-go-wizard", () => ({
  HomepageV3GoWizard: ({ children, className }: { children: ReactNode; className?: string }) =>
    createElement("a", { href: "#lap-la-so", className }, children),
}));

const EXPECTED_ASSETS = {
  "01": "C01", "02": "C02", "03": "C03", "04": "C04", "05": "C00",
  "06": "C05", "07": "C06", "08": "C07", "09": "C08", "10": "C09",
  "11": "C10", "12": "C11", "13": "C12", "14": "C13", "15": "C14",
} as const;

function rowCards(html: string): string[] {
  return (html.match(/<article\b[\s\S]*?<\/article>/g) ?? [])
    .filter((card) => card.includes("hv3-tt-card-row"));
}

describe("testimonial portrait presentation", () => {
  it("keeps original monogram markup when no avatars are supplied", () => {
    const html = renderToStaticMarkup(createElement(HomepageV3Testimonials));
    const cards = rowCards(html);
    expect(cards).toHaveLength(15);
    expect(html).not.toContain("hv3-tt-avatar");
    for (const item of TESTIMONIALS) {
      const card = cards.find((candidate) => candidate.includes(item.name));
      expect(card).toContain(`<span aria-hidden="true" class="hv3-tt-mono">${testimonialMonogram(item.name)}</span>`);
      expect(card).toContain(`class="hv3-tt-name">${item.name}`);
      expect(card).toContain(`class="hv3-tt-city">${item.city}`);
    }
  });

  it("pairs all fifteen portraits with their reader ids in the queue's nonnumeric order", () => {
    const html = renderToStaticMarkup(createElement(TroiNamTestimonials));
    const cards = rowCards(html);
    expect(cards).toHaveLength(15);
    expect(html).not.toContain("hv3-tt-mono");
    for (const [index, id] of ROTATION_QUEUE.entries()) {
      const item = TESTIMONIALS.find((reader) => reader.id === id)!;
      const asset = manifest[EXPECTED_ASSETS[id as keyof typeof EXPECTED_ASSETS]];
      const card = cards[index]!;
      expect(card).toContain(`class="hv3-tt-name">${item.name}`);
      expect(card).toContain(`src="${asset.src}"`);
      expect(card).toContain('class="hv3-tt-avatar"');
      expect(card).toMatch(/srcset="[^"]*96w\.webp 96w[^"]*"/i);
      expect(card).toContain('sizes="48px"');
      expect(card).toContain(`width="${asset.width}"`);
      expect(card).toContain(`height="${asset.height}"`);
      expect(card).toContain('alt=""');
      expect(card).toContain('loading="lazy"');
      expect(card).toContain('decoding="async"');
      expect(card).toContain('lang="vi"');
    }
  });

  it("uses the supplied entry and falls back to the original monogram for a partial map", () => {
    const avatars = {
      "05": { src: "/reader-05.webp", srcSet: "/reader-05-96.webp 96w", width: 384, height: 384 },
    };
    const html = renderToStaticMarkup(createElement(HomepageV3Testimonials, { avatars }));
    const cards = rowCards(html);
    for (const item of TESTIMONIALS) {
      const card = cards.find((candidate) => candidate.includes(item.name))!;
      if (item.id === "05") {
        expect(card).toContain('src="/reader-05.webp"');
        expect(card).toMatch(/srcset="\/reader-05-96\.webp 96w"/i);
        expect(card).toContain('width="384"');
        expect(card).toContain('height="384"');
        expect(card).not.toContain("hv3-tt-mono");
      } else {
        expect(card).toContain(`<span aria-hidden="true" class="hv3-tt-mono">${testimonialMonogram(item.name)}</span>`);
        expect(card).not.toContain("hv3-tt-avatar");
      }
    }
  });

  it("retains monograms for an empty avatar map", () => {
    const original = renderToStaticMarkup(createElement(HomepageV3Testimonials));
    const empty = renderToStaticMarkup(createElement(HomepageV3Testimonials, { avatars: {} }));
    expect(empty).toBe(original);
  });
});
