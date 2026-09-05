import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { BAT_TU_CONTENT_VI } from "../../apps/web/src/features/discipline-pages/content-bat-tu";
import { CHIEM_TINH_CONTENT_VI } from "../../apps/web/src/features/discipline-pages/content-chiem-tinh";
import { KINH_DICH_CONTENT_VI } from "../../apps/web/src/features/discipline-pages/content-kinh-dich";
import { THAN_SO_HOC_CONTENT_VI } from "../../apps/web/src/features/discipline-pages/content-than-so-hoc";
import type { DisciplinePageContent } from "../../apps/web/src/features/discipline-pages/discipline-page-model";

const rootDir = process.cwd();

export function normalizeComparableText(input: string): string {
  return input
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&mdash;/gi, "—")
    .replace(/&ndash;/gi, "–")
    .replace(/họa/gi, "hoạ")
    .replace(/\s+/g, " ")
    .trim();
}

export function extractCoreVisibleStrings(content: DisciplinePageContent): Array<{ path: string; text: string }> {
  const strings: Array<{ path: string; text: string }> = [];

  // Hero section visible strings
  for (const [key, value] of Object.entries(content.hero)) {
    if (key.endsWith("Href") || key === "previewBadge") continue;
    if (typeof value === "string") {
      strings.push({ path: `hero.${key}`, text: value });
    }
  }

  // Marquee strings
  content.marquee.forEach((m, idx) => {
    strings.push({ path: `marquee[${idx}]`, text: m });
  });

  // Sample result visible heading and explanatory notes
  strings.push({ path: "sampleResult.title", text: content.sampleResult.title });
  strings.push({ path: "sampleResult.note", text: content.sampleResult.note });

  // For disciplines with full verbatim sections in prototype (e.g. Than So Hoc)
  if (content.key === "than-so-hoc") {
    content.freeValue.items.forEach((item, idx) => {
      strings.push({ path: `freeValue.items[${idx}].title`, text: item.title });
      strings.push({ path: `freeValue.items[${idx}].body`, text: item.body });
    });
    content.glossary.items.forEach((item, idx) => {
      strings.push({ path: `glossary.items[${idx}].term`, text: item.term });
      strings.push({ path: `glossary.items[${idx}].body`, text: item.body });
    });
    content.method.rows.forEach((row, idx) => {
      strings.push({ path: `method.rows[${idx}].label`, text: row.label });
      strings.push({ path: `method.rows[${idx}].value`, text: row.value });
    });
    content.limitations.items.forEach((item, idx) => {
      strings.push({ path: `limitations.items[${idx}]`, text: item });
    });
    content.knowledgeFaq.faqs.forEach((faq, idx) => {
      strings.push({ path: `knowledgeFaq.faqs[${idx}].q`, text: faq.q });
      strings.push({ path: `knowledgeFaq.faqs[${idx}].a`, text: faq.a });
    });
  }

  return strings;
}

export function readPrototypeCorpus(prototypeRelPath: string): string {
  const filePath = resolve(rootDir, prototypeRelPath);
  const raw = readFileSync(filePath, "utf8");
  return normalizeComparableText(raw);
}

describe("discipline prototype independent copy parity", () => {
  const cases: Array<{
    discipline: string;
    prototypePath: string;
    content: DisciplinePageContent;
  }> = [
    {
      discipline: "Bát Tự",
      prototypePath: "prototype/bat-tu/index.html",
      content: BAT_TU_CONTENT_VI,
    },
    {
      discipline: "Kinh Dịch",
      prototypePath: "prototype/kinh-dich/index.html",
      content: KINH_DICH_CONTENT_VI,
    },
    {
      discipline: "Chiêm Tinh",
      prototypePath: "prototype/chiem-tinh/index.html",
      content: CHIEM_TINH_CONTENT_VI,
    },
    {
      discipline: "Thần Số Học",
      prototypePath: "prototype/than-so-hoc/index.html",
      content: THAN_SO_HOC_CONTENT_VI,
    },
  ];

  for (const { discipline, prototypePath, content } of cases) {
    it(`verifies visible production strings for ${discipline} occur in ${prototypePath}`, () => {
      const prototypeCorpus = readPrototypeCorpus(prototypePath);
      expect(prototypeCorpus.length).toBeGreaterThan(0);

      const visibleStrings = extractCoreVisibleStrings(content);
      expect(visibleStrings.length).toBeGreaterThanOrEqual(10);

      const missing: Array<{ path: string; text: string }> = [];

      for (const item of visibleStrings) {
        const normalizedItem = normalizeComparableText(item.text);
        if (!normalizedItem) continue;

        if (!prototypeCorpus.includes(normalizedItem)) {
          missing.push(item);
        }
      }

      expect(
        missing,
        `Expected all verified visible strings in ${discipline} to exist in prototype ${prototypePath}. Missing:\n${JSON.stringify(missing, null, 2)}`,
      ).toEqual([]);
    });
  }

  it("fails when an arbitrary visible string is deliberately changed", () => {
    const prototypeCorpus = readPrototypeCorpus("prototype/bat-tu/index.html");
    const tampered = "Chuỗi văn bản minh hoạ hoàn toàn bị sửa đổi không thể có trong prototype";
    expect(prototypeCorpus.includes(normalizeComparableText(tampered))).toBe(false);
  });
});