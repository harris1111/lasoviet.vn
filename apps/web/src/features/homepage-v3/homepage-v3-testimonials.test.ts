import { describe, expect, it } from "vitest";

import {
  FEATURED_TESTIMONIAL,
  SECONDARY_TESTIMONIALS,
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

  it("opens with 13, then 12, 09, 01", () => {
    expect(testimonialById(FEATURED_TESTIMONIAL)?.name).toBe("Lê Thị Kim Oanh");
    expect(SECONDARY_TESTIMONIALS.map((id) => testimonialById(id)?.name)).toEqual(["Đỗ Mỹ Hạnh", "Bùi Phương Linh", "Hoàng Tuấn Anh"]);
    expect(Object.keys(TESTIMONIAL_LABELS).sort()).toEqual(["01", "09", "12", "13"]);
  });

  it("builds a two-letter monogram", () => {
    expect(testimonialMonogram("Hoàng Tuấn Anh")).toBe("TA");
    expect(testimonialMonogram("Lê Thu Hà")).toBe("TH");
  });
});
