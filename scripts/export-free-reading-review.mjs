import { writeFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { createHash } from "node:crypto";
import { IztroAdapter } from "../packages/engine-adapters/dist/index.js";
import { compileFreeStructuralOverview, compileFreeStructuralPalace } from "../packages/backend/dist/ziwei/free-structural-overview.js";
import { buildFreeReadingFacts } from "../packages/backend/dist/ziwei/free-reading-facts.js";
import { compileFreeReadingFallback } from "../packages/backend/dist/ziwei/free-reading-fallback.js";
import { checkFreeReadingQuality, summarizeFreeReadingLength } from "../packages/backend/dist/ziwei/free-reading-quality.js";
import { buildFreeReadingPrompt } from "../packages/backend/dist/ziwei/free-reading-prompt.js";
import { selectFreeReadingCards } from "../packages/backend/dist/ziwei/free-reading-cards.js";

// Reproducible synthetic input only. No provider, database, customer or frontend integration.
const fixtures = [
  ["principal-star", "1992-06-15", "08:30", "male"],
  ["empty-palace", "1975-02-04", "04:00", "female"],
  ["provisional-time", "2000-12-31", null, "male"],
];
const samples = [];
for (const [id, date, localTime, gender] of fixtures) {
  const time = localTime ? { precision: "exact_minute", localTime } : { precision: "unknown" };
  const profile = { version: 1,
    originalInput: { version: 1, calendar: { kind: "solar", date }, time, timezone: { offsetMinutes: 420 }, gender, consentVersion: "synthetic" },
    normalizedCalendar: { kind: "solar", date }, normalizedTime: time,
    timezoneProvenance: { source: "offset", offsetMinutes: 420 }, normalizationWarnings: [], limitations: [] };
  const calculated = await new IztroAdapter().calculateWithPrivateSnapshot({ birthProfile: profile });
  if (!calculated.result.ok) throw new Error("SYNTHETIC_ENGINE_FAILED");
  const chart = calculated.result.output;
  const focusPalaceId = id === "empty-palace" ? chart.palaces.find(p => !p.stars.some(s => s.category === "major"))?.id : chart.soulPalaceId;
  if (!focusPalaceId) throw new Error("SYNTHETIC_FOCUS_UNAVAILABLE");
  const locales = {};
  for (const locale of ["vi", "en"]) {
    const facts = buildFreeReadingFacts({ chart, focusPalaceId, locale });
    const draft = compileFreeReadingFallback(facts);
    const prompt = buildFreeReadingPrompt(facts);
    const quality = checkFreeReadingQuality({ content: draft, source: facts });
    if (!quality.ok) throw new Error(`SYNTHETIC_COPY_CHECK_FAILED:${id}:${locale}`);
    locales[locale] = { facts, cards: selectFreeReadingCards(facts),
      old: { overview: compileFreeStructuralOverview(chart, locale), focus: compileFreeStructuralPalace(chart, focusPalaceId, locale) },
      draft: { sourceKind: "rule_v2_draft", accepted: false, content: draft },
      quality, length: summarizeFreeReadingLength(draft), versions: prompt.versions,
      promptSha256: createHash("sha256").update(JSON.stringify(prompt)).digest("hex") };
  }
  samples.push({ id, synthetic: true, focusPalaceId, provisional: chart.provisional === true, locales });
}
const output = resolve(process.argv[2] ?? "plan/evidence/lsv82-offline/synthetic-comparisons.json");
await mkdir(dirname(output), { recursive: true });
await writeFile(output, JSON.stringify({ purpose: "Owner/Claude old-versus-draft copy review; lexical findings do not certify semantic or editorial acceptance",
  providerCalls: 0, customerData: false, accepted: false, samples }, null, 2) + "\n");
console.log(JSON.stringify({ output, samples: samples.map(s => ({ id: s.id,
  locales: Object.fromEntries(Object.entries(s.locales).map(([locale, v]) => [locale, { quality: v.quality, length: v.length }])) })), providerCalls: 0 }));
