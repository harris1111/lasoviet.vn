import { describe, expect, it } from "vitest";
import { routeRegistry } from "@lasoviet/config";
import { loadPublicContentRepository } from "../../apps/web/src/features/content/public-content-repository";
import { resolvePublicRoute } from "../../apps/web/src/features/content/public-route-resolver";
import {
  sampleBirthSummary,
  sampleChart,
  samplePreview,
} from "../../apps/web/src/features/content/sample-ziwei-data";
import {
  sampleTopicsVi,
  sampleTopicsEn,
} from "../../apps/web/src/features/content/sample-topics-data";

describe("Sample Report Route and Contract (UI-06 / FD-065)", () => {
  const repository = loadPublicContentRepository(routeRegistry);

  it("resolves /bao-cao-mau/tu-vi route with sample-report template", () => {
    const result = resolvePublicRoute("/bao-cao-mau/tu-vi", {
      routes: routeRegistry,
      contentRepository: repository,
    });

    expect(result.kind).toBe("render");
    if (result.kind === "render") {
      expect(result.route.template).toBe("sample-report");
      expect(result.route.discipline).toBe("tu-vi");
      expect(result.locale).toBe("vi");
      expect(result.content.title).toBeDefined();

      // Ensure no outdated 79.000 or VND anywhere in content
      const contentStr = JSON.stringify(result.content);
      expect(contentStr).not.toContain("79.000");
      expect(contentStr).not.toContain("79,000");
      expect(contentStr).not.toContain("79000");
      expect(contentStr).not.toContain("₫");
      expect(contentStr).not.toContain("VND");
    }
  });

  it("resolves /en/bao-cao-mau/tu-vi localized route", () => {
    const result = resolvePublicRoute("/en/bao-cao-mau/tu-vi", {
      routes: routeRegistry,
      contentRepository: repository,
    });

    expect(result.kind).toBe("render");
    if (result.kind === "render") {
      expect(result.route.template).toBe("sample-report");
      expect(result.locale).toBe("en");
      expect(result.content.title).toBeDefined();
    }
  });

  it("provides valid anonymized sample chart fixture", () => {
    // Anonymized person: female, 15/06/1992, Hanoi
    expect(sampleBirthSummary.gender).toBe("female");
    expect(sampleBirthSummary.normalizedCalendar.date).toBe("1992-06-15");
    expect(sampleBirthSummary.placeLabel).toBe("Hà Nội");
    expect(sampleBirthSummary.displayName).toBe("Bản mẫu");
    expect(sampleBirthSummary.displayName).not.toContain("Nguyễn Tấn Đời");

    // 12 palaces present in normalized chart
    expect(sampleChart.palaces.length).toBe(12);
    expect(sampleChart.soulPalaceId).toBe("ziwei.palace.life");
    expect(sampleChart.bodyPalaceId).toBe("ziwei.palace.wealth");

    // Free identity preview valid
    expect(samplePreview.insights.length).toBe(3);
    expect(samplePreview.strengthSignal).toBeDefined();
    expect(samplePreview.tensionSignal).toBeDefined();
  });

  it("provides 2 fully open sample topics and locked previews for remaining topics", () => {
    // VI topics
    expect(sampleTopicsVi.career.isOpen).toBe(true);
    expect(sampleTopicsVi.wealth.isOpen).toBe(true);
    expect(sampleTopicsVi.career.prose.length).toBeGreaterThan(0);
    expect(sampleTopicsVi.wealth.prose.length).toBeGreaterThan(0);
    expect(sampleTopicsVi.career.byline).toBe("Lá Số Việt biên tập");
    expect(sampleTopicsVi.wealth.byline).toBe("Lá Số Việt biên tập");

    // Locked topics have excerpts
    expect(sampleTopicsVi.life.isOpen).toBe(false);
    expect(sampleTopicsVi.spouse.isOpen).toBe(false);
    expect(sampleTopicsVi.spouse.lockedExcerpt).toBeDefined();

    // EN topics
    expect(sampleTopicsEn.career.isOpen).toBe(true);
    expect(sampleTopicsEn.wealth.isOpen).toBe(true);
    expect(sampleTopicsEn.career.byline).toBe("Edited by Lá Số Việt");
  });
});
