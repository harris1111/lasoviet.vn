import { describe, expect, it } from "vitest";

import {
  resolveRelatedPalaceSuggestion,
} from "./guarantee-feedback.service.js";

describe("Guarantee and feedback service", () => {
  describe("resolveRelatedPalaceSuggestion", () => {
    it("returns opposite palace for life / overview / excerpt", () => {
      const result = resolveRelatedPalaceSuggestion("section-overview");
      expect(result.palaceId).toBe("ziwei.palace.travel");
      expect(result.palaceName).toBe("Cung Thiên Di");
      expect(result.relationType).toBe("opposite");
    });

    it("returns opposite palace for wealth", () => {
      const result = resolveRelatedPalaceSuggestion("ziwei.palace.wealth");
      expect(result.palaceId).toBe("ziwei.palace.fortune");
      expect(result.palaceName).toBe("Cung Phúc Đức");
      expect(result.relationType).toBe("opposite");
    });

    it("returns opposite palace for career", () => {
      const result = resolveRelatedPalaceSuggestion("ziwei.palace.career");
      expect(result.palaceId).toBe("ziwei.palace.spouse");
      expect(result.palaceName).toBe("Cung Phu Thê");
      expect(result.relationType).toBe("opposite");
    });

    it("returns opposite palace for spouse", () => {
      const result = resolveRelatedPalaceSuggestion("ziwei.palace.spouse");
      expect(result.palaceId).toBe("ziwei.palace.career");
      expect(result.palaceName).toBe("Cung Quan Lộc");
      expect(result.relationType).toBe("opposite");
    });

    it("returns opposite palace for children", () => {
      const result = resolveRelatedPalaceSuggestion("ziwei.palace.children");
      expect(result.palaceId).toBe("ziwei.palace.property");
      expect(result.palaceName).toBe("Cung Điền Trạch");
      expect(result.relationType).toBe("opposite");
    });

    it("returns complementary palace for general sections", () => {
      const result = resolveRelatedPalaceSuggestion("section-practical-direction");
      expect(result.palaceId).toBe("ziwei.palace.fortune");
      expect(result.palaceName).toBe("Cung Phúc Đức");
      expect(result.relationType).toBe("complementary");
    });
  });

});
