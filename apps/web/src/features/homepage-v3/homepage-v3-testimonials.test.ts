import { describe, expect, it } from "vitest";

import {
  EXCERPT_MAX,
  ROTATION_QUEUE,
  TESTIMONIALS,
  TESTIMONIAL_GROUPS,
  TESTIMONIAL_LABELS,
  testimonialById,
  testimonialMonogram,
} from "./homepage-v3-testimonials";

describe("testimonials data", () => {
  it("has 15 unique ids 01 to 15", () => {
    expect(TESTIMONIALS).toHaveLength(15);
    expect(TESTIMONIALS.map((item) => item.id)).toEqual(Array.from({ length: 15 }, (_, i) => String(i + 1).padStart(2, "0")));
  });

  it("uses a contiguous excerpt of the full quote", () => {
    for (const item of TESTIMONIALS) {
      expect(item.quote.includes(item.excerpt), `excerpt of ${item.id}`).toBe(true);
      expect(item.excerpt.length).toBeGreaterThan(20);
    }
  });

  it("puts every quote in one of the four groups and fills each group", () => {
    for (const item of TESTIMONIALS) expect(TESTIMONIAL_GROUPS).toContain(item.group);
    for (const group of TESTIMONIAL_GROUPS) {
      expect(TESTIMONIALS.some((item) => item.group === group), group).toBe(true);
    }
  });

  it("keeps attribution and decoded ampersands intact", () => {
    for (const item of TESTIMONIALS) {
      expect(item.header.startsWith(item.name)).toBe(true);
      expect(item.header).not.toContain("&amp;");
    }
    expect(testimonialById("06")?.header).toContain("F&B");
  });

  it("keeps every card excerpt short enough for equal cards", () => {
    for (const item of TESTIMONIALS) expect(item.excerpt.length, item.id).toBeLessThanOrEqual(EXCERPT_MAX);
  });

  it("never puts the unverifiable figures on a card", () => {
    for (const item of TESTIMONIALS) expect(item.excerpt).not.toMatch(/80–90%|triệt để/);
  });

  it("rotation queue lists all 15 ids once, opening with 13, 12, 09, 01", () => {
    expect([...ROTATION_QUEUE].sort()).toEqual(TESTIMONIALS.map((item) => item.id).sort());
    expect(ROTATION_QUEUE.slice(0, 4)).toEqual(["13", "12", "09", "01"]);
    expect(testimonialById("13")?.name).toBe("Lê Thị Kim Oanh");
  });

  it("first six cards cover all four groups", () => {
    const groups = new Set(ROTATION_QUEUE.slice(0, 6).map((id) => testimonialById(id)?.group));
    expect(groups.size).toBe(4);
  });

  it("builds a two-letter monogram", () => {
    expect(testimonialMonogram("Hoàng Tuấn Anh")).toBe("TA");
    expect(testimonialMonogram("Lê Thu Hà")).toBe("TH");
  });
});
