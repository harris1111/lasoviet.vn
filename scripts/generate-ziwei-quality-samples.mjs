import { existsSync, mkdirSync, readFileSync, realpathSync, statSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

import {
  normalizeBirthProfile,
  buildComprehensiveZiweiFacts,
  buildComprehensiveKnowledgePacks,
  writeComprehensiveZiweiReport,
  validateComprehensiveZiweiReport,
  createOpenAiCompatibleAdapter,
  createAiProductionGate,
} from "../packages/backend/dist/index.js";
import {
  IztroAdapter,
  iztroDefaultConfig,
} from "../packages/engine-adapters/dist/index.js";
import {
  renderComprehensiveZiweiHtml,
} from "../packages/backend/dist/reports/comprehensive-report-html.js";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(SCRIPT_DIR, "..");
const CORPUS_PATH = resolve(REPO_ROOT, "content/knowledge/vi/ziwei/comprehensive-report.v3.json");

// 10 Deterministic Synthetic Candidate Birth Inputs (covering diverse dates, branches, genders)
const SYNTHETIC_CANDIDATE_POOL = [
  { date: "1990-05-15", time: "06:30", gender: "male" },   // Life=Dần, Body=Thiên Di
  { date: "1988-11-20", time: "14:15", gender: "female" }, // Life=Thìn, Body=Phúc Đức (Cơ Nguyệt Đồng Lương)
  { date: "1993-01-12", time: "16:20", gender: "female" }, // Life=Tỵ, Body=Quan Lộc (Sát Phá Lang)
  { date: "1999-09-09", time: "09:30", gender: "male" },   // Life=Mão, Body=Phu Thê
  { date: "1986-06-18", time: "11:50", gender: "male" },   // Life=Tý, Body=Mệnh (Tam Kỳ Gia Hội)
  { date: "1995-03-08", time: "20:45", gender: "male" },   // Life=Tỵ, Body=Tài Bạch
  { date: "1984-07-25", time: "02:10", gender: "female" }, // Life=Ngọ, Body=Phúc Đức
  { date: "2001-12-05", time: "22:15", gender: "female" }, // Life=Tý, Body=Phu Thê
  { date: "1997-04-30", time: "04:20", gender: "male" },   // Life=Dần, Body=Quan Lộc
  { date: "1991-08-14", time: "18:00", gender: "female" }, // Life=Thân, Body=Thiên Di
];

function createLocalCorpusRetriever(chunks) {
  return async function retrieve(query) {
    const scored = [];
    const queryWords = query.text.toLowerCase().split(/\s+/).filter((w) => w.length > 1);

    for (const chunk of chunks) {
      const meta = chunk.metadata;
      let score = 0;

      // Metadata priorities 1-7
      if (query.patternIds && query.patternIds.some((id) => meta.patterns?.includes(id))) score += 100;
      if (query.palaceIds && query.palaceIds.some((id) => meta.palaces?.includes(id))) score += 40;
      if (query.starIds && query.starIds.some((id) => meta.stars?.includes(id))) score += 30;
      if (query.transformationIds && query.transformationIds.some((id) => meta.transformations?.includes(id))) score += 20;
      if (query.brightnessIds && query.brightnessIds.some((id) => meta.brightness?.includes(id))) score += 10;
      if (query.relationIds && query.relationIds.some((id) => meta.relations?.includes(id))) score += 8;
      if (query.topics && query.topics.some((id) => meta.topics?.includes(id))) score += 4;

      // Lexical overlap priority 8
      let lexicalMatches = 0;
      const contentLower = chunk.content.toLowerCase();
      for (const w of queryWords) {
        if (contentLower.includes(w)) lexicalMatches += 1;
      }
      const lexicalScore = queryWords.length > 0 ? lexicalMatches / queryWords.length : 0;
      const totalScore = score + lexicalScore;

      if (totalScore > 0) {
        scored.push({
          score: totalScore,
          passage: {
            id: chunk.passageId,
            passageId: chunk.passageId,
            documentId: "ziwei-comprehensive-report-vi",
            discipline: "ziwei",
            locale: "vi",
            reportSections: chunk.reportSections,
            knowledgeVersion: "ziwei.comprehensive.knowledge.v3",
            content: chunk.content,
            contentHash: chunk.contentHash,
            sourceAttribution: "Lá Số Việt Zi Wei Corpus Editorial Board",
            permittedUse: "reference_rewrite",
            metadata: chunk.metadata,
          },
          passageId: chunk.passageId,
        });
      }
    }

    scored.sort((a, b) => b.score - a.score || a.passageId.localeCompare(b.passageId, "en"));
    return scored.map((s) => s.passage);
  };
}

async function evaluateCandidatePool(candidates, adapter) {
  const evaluated = [];

  for (let i = 0; i < candidates.length; i++) {
    const c = candidates[i];
    const profileRes = normalizeBirthProfile({
      version: 1,
      calendar: { kind: "solar", date: c.date },
      time: { precision: "exact_minute", localTime: c.time },
      timezone: { ianaZone: "Asia/Ho_Chi_Minh" },
      placeLabel: "Hà Nội",
      gender: c.gender,
      consentVersion: "2026-09-01",
      locale: "vi",
    });
    if (!profileRes.ok) {
      throw new Error(`Candidate ${i + 1} normalization failed: ${profileRes.error.code}`);
    }

    const chartRes = await adapter.calculate({ birthProfile: profileRes.value }, iztroDefaultConfig);
    if (!chartRes.ok) {
      throw new Error(`Candidate ${i + 1} calculation failed`);
    }

    const facts = buildComprehensiveZiweiFacts(chartRes.output);
    const lifePalace = facts.palaces.find((p) => p.isLifePalace);
    const bodyPalace = facts.palaces.find((p) => p.isBodyPalace);
    const emptyPalaces = facts.palaces.filter(
      (p) => p.stars.filter((s) => s.type === "principal").length === 0,
    );
    const brightnesses = new Set(
      facts.palaces.flatMap((p) => p.stars.map((s) => s.brightness)).filter(Boolean),
    );

    evaluated.push({
      candidateId: `candidate-${i + 1}`,
      facts,
      lifeBranch: lifePalace.earthlyBranchId,
      bodyPalace: bodyPalace.palaceId,
      patterns: facts.patterns.map((p) => p.id),
      emptyPalacesCount: emptyPalaces.length,
      brightnesses: Array.from(brightnesses),
      transformations: facts.transformations.map((t) => t.id),
    });
  }

  // Greedy selection of 5 charts satisfying all coverage constraints
  const selected = [];
  const seenLifeBranches = new Set();
  const seenBodyPalaces = new Set();

  for (const item of evaluated) {
    if (selected.length === 5) break;
    if (seenLifeBranches.has(item.lifeBranch)) continue;
    if (seenBodyPalaces.has(item.bodyPalace)) continue;

    selected.push(item);
    seenLifeBranches.add(item.lifeBranch);
    seenBodyPalaces.add(item.bodyPalace);
  }

  if (selected.length !== 5) {
    throw new Error(
      `BLOCKED: Candidate pool could not select 5 charts with distinct Life/Body placements (got ${selected.length})`,
    );
  }

  // Verify collective coverage constraints across selected charts
  const allPatterns = new Set(selected.flatMap((s) => s.patterns));
  const allTransformations = new Set(selected.flatMap((s) => s.transformations));
  const allBrightnesses = new Set(selected.flatMap((s) => s.brightnesses));
  const totalEmptyPalaces = selected.reduce((acc, s) => acc + s.emptyPalacesCount, 0);

  const hasFavorable =
    allBrightnesses.has("ziwei.brightness.exalted") ||
    allBrightnesses.has("ziwei.brightness.prosperous") ||
    allBrightnesses.has("ziwei.brightness.favorable");
  const hasDifficult =
    allBrightnesses.has("ziwei.brightness.weak") ||
    allBrightnesses.has("ziwei.brightness.unfavorable");

  if (!hasFavorable || !hasDifficult) {
    throw new Error("BLOCKED: Coverage constraint failed: selected charts must cover both favorable and difficult brightness");
  }

  if (allTransformations.size < 4) {
    throw new Error("BLOCKED: Coverage constraint failed: selected charts must cover all four transformations");
  }

  if (allPatterns.size < 2) {
    throw new Error("BLOCKED: Coverage constraint failed: selected charts must cover at least two supported named patterns");
  }

  if (totalEmptyPalaces === 0) {
    throw new Error("BLOCKED: Coverage constraint failed: selected charts must cover at least one sparse principal-star palace");
  }

  return {
    selected: selected.map((s, idx) => ({
      sampleId: `SAMPLE-${String(idx + 1).padStart(2, "0")}`,
      facts: s.facts,
      lifeBranch: s.lifeBranch,
      bodyPalace: s.bodyPalace,
      patterns: s.patterns,
      emptyPalacesCount: s.emptyPalacesCount,
    })),
    aggregateCoverage: {
      candidatesEvaluated: evaluated.length,
      samplesSelected: selected.length,
      distinctLifeBranches: seenLifeBranches.size,
      distinctBodyPalaces: seenBodyPalaces.size,
      patternsCount: allPatterns.size,
      patternsList: Array.from(allPatterns).sort(),
      transformationsCount: allTransformations.size,
      favorableBrightnessCovered: hasFavorable,
      difficultBrightnessCovered: hasDifficult,
      totalEmptyPalacesAcrossSamples: totalEmptyPalaces,
    },
  };
}

function parseCliArguments() {
  const args = process.argv.slice(2);
  const isPrepareOnly = args.includes("--prepare-only");
  const isExecuteProvider = args.includes("--execute-provider");
  const outputDirIdx = args.indexOf("--output-dir");
  const outputDir = outputDirIdx !== -1 ? args[outputDirIdx + 1] : undefined;

  return {
    prepareOnly: isPrepareOnly || !isExecuteProvider,
    executeProvider: isExecuteProvider,
    outputDir,
  };
}

function validatePrivateOutputDirectory(outputDir) {
  if (!outputDir) {
    throw new Error("Missing required --output-dir <path> argument for provider execution");
  }

  if (!isAbsolute(outputDir)) {
    throw new Error("BLOCKED: --output-dir must be an absolute path outside the repository root");
  }

  const resolved = resolve(outputDir);
  if (resolved === REPO_ROOT || resolved.startsWith(REPO_ROOT + sep)) {
    throw new Error("BLOCKED: --output-dir must reside outside the canonical repository root");
  }

  if (existsSync(resolved)) {
    const stat = statSync(resolved);
    if (!stat.isDirectory()) {
      throw new Error("BLOCKED: --output-dir target exists and is not a directory");
    }
    const real = realpathSync(resolved);
    if (real === REPO_ROOT || real.startsWith(REPO_ROOT + sep)) {
      throw new Error("BLOCKED: --output-dir symlink target resolves inside the repository root");
    }
  } else {
    mkdirSync(resolved, { recursive: true, mode: 0o700 });
  }

  return resolved;
}

function checkProviderEnvironment() {
  const REQUIRED_ENV_VARS = [
    "AI_BASE_URL",
    "AI_API_KEY",
    "AI_MODEL",
    "AI_TIMEOUT",
    "AI_MAX_RETRIES",
    "AI_FEATURE_JSON_SCHEMA",
    "AI_FEATURE_TOOL_CALLING",
    "AI_PRODUCTION_ENABLED",
  ];

  const missing = [];
  for (const key of REQUIRED_ENV_VARS) {
    const val = process.env[key];
    if (typeof val !== "string" || val.trim().length === 0) {
      missing.push(key);
    }
  }

  if (missing.length > 0) {
    return {
      ready: false,
      reason: `Missing required environment variable(s): ${missing.join(", ")}`,
      missing,
    };
  }

  if (process.env.AI_FEATURE_JSON_SCHEMA !== "true") {
    return { ready: false, reason: "AI_FEATURE_JSON_SCHEMA must be set to 'true'" };
  }

  if (process.env.AI_PRODUCTION_ENABLED !== "true") {
    return { ready: false, reason: "AI_PRODUCTION_ENABLED must be set to 'true'" };
  }

  return { ready: true };
}

async function main() {
  const cli = parseCliArguments();

  // Load and validate committed V3 corpus manifest
  if (!existsSync(CORPUS_PATH)) {
    throw new Error(`Committed V3 corpus not found at ${CORPUS_PATH}`);
  }
  const manifest = JSON.parse(readFileSync(CORPUS_PATH, "utf8"));
  if (!Array.isArray(manifest.chunks) || manifest.chunks.length === 0) {
    throw new Error("Committed V3 corpus has invalid or empty chunk manifest");
  }
  const retriever = createLocalCorpusRetriever(manifest.chunks);

  // Initialize deterministic engine adapter
  const adapter = new IztroAdapter();

  // Evaluate candidate pool and select 5 synthetic charts
  const { selected, aggregateCoverage } = await evaluateCandidatePool(SYNTHETIC_CANDIDATE_POOL, adapter);

  // Prepare knowledge packs for each selected sample (19 packs per sample)
  const preparedSamples = [];
  let totalPassagesAcrossAllSamples = 0;

  for (const s of selected) {
    const knowledgePacks = await buildComprehensiveKnowledgePacks(s.facts, retriever);
    const samplePassages = knowledgePacks.reduce((acc, p) => acc + p.passages.length, 0);
    totalPassagesAcrossAllSamples += samplePassages;

    preparedSamples.push({
      sampleId: s.sampleId,
      facts: s.facts,
      knowledgePacks,
      packsCount: knowledgePacks.length,
      passagesCount: samplePassages,
    });
  }

  // Handle Provider Execution Guard
  if (cli.executeProvider) {
    const envCheck = checkProviderEnvironment();
    if (!envCheck.ready) {
      console.error(`BLOCKED: Provider execution blocked: ${envCheck.reason}`);
      process.exit(1);
    }

    const privateOutputDir = validatePrivateOutputDirectory(cli.outputDir);

    let totalHttpRequests = 0;
    const countingFetch = async (url, init) => {
      totalHttpRequests += 1;
      return await fetch(url, init);
    };

    const aiProvider = createOpenAiCompatibleAdapter({
      baseUrl: process.env.AI_BASE_URL,
      apiKey: process.env.AI_API_KEY,
      modelId: process.env.AI_MODEL,
      timeoutMs: Number.parseInt(process.env.AI_TIMEOUT, 10) || 45000,
      retryCount: 0,
      productionGate: createAiProductionGate("approved"),
      fetchImpl: countingFetch,
    });

    const metrics = [];

    for (const sample of preparedSamples) {
      let generateStructuredCalls = 0;
      const wrappedProvider = {
        generateStructured: async (req) => {
          generateStructuredCalls += 1;
          return await aiProvider.generateStructured(req);
        },
      };

      const prevHttpCount = totalHttpRequests;
      const startTime = Date.now();

      const writerResult = await writeComprehensiveZiweiReport(
        { comprehensiveFacts: sample.facts, knowledgePacks: sample.knowledgePacks },
        wrappedProvider,
      );

      const durationMs = Date.now() - startTime;
      const sampleHttpRequests = totalHttpRequests - prevHttpCount;

      if (!writerResult.ok) {
        throw new Error(`Sample ${sample.sampleId} generation failed: ${writerResult.error.code}`);
      }

      const report = writerResult.value.report;
      const validation = validateComprehensiveZiweiReport(report, sample.facts);
      const html = renderComprehensiveZiweiHtml(report);

      // Compute Vietnamese words
      const textToCount = [
        report.overview.narrative,
        report.coreAxis.narrative,
        ...report.keyConfigurations.map((k) => k.narrative),
        ...report.palaceReadings.map((p) => p.narrative),
        ...report.thematicSynthesis.map((t) => t.narrative),
        report.strengthsAndTensions.narrative,
        ...report.practicalDirection,
      ].join(" ");
      const wordCount = textToCount.trim().split(/\s+/).filter(Boolean).length;

      // Write private artifacts (never added to Git)
      const sampleBaseName = sample.sampleId.toLowerCase();
      writeFileSync(join(privateOutputDir, `${sampleBaseName}-report.json`), JSON.stringify(report, null, 2), {
        encoding: "utf8",
        mode: 0o600,
      });
      writeFileSync(join(privateOutputDir, `${sampleBaseName}-report.html`), html, {
        encoding: "utf8",
        mode: 0o600,
      });

      metrics.push({
        sampleId: sample.sampleId,
        durationMs,
        providerCalls: generateStructuredCalls,
        httpRequests: sampleHttpRequests,
        wordCount,
        validatorOk: validation.ok,
        twelvePalacesComplete: report.palaceReadings.length === 12,
        fourThemesComplete: report.thematicSynthesis.length === 4,
        htmlGenerated: Boolean(html && html.length > 0),
      });
    }

    // Write private review worksheet
    const worksheetContent = `# Zi Wei V3 Output Quality Human Review Worksheet

| Sample ID | Facts Correct (1-5) | Naturalness (1-5) | Specificity (1-5) | Cross-Palace Synthesis (1-5) | Low Repetition (1-5) | Useful Priorities (1-5) | No Mechanical Copy (1-5) |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
${metrics.map((m) => `| ${m.sampleId} | | | | | | | |`).join("\n")}
`;
    writeFileSync(join(privateOutputDir, "review-worksheet.md"), worksheetContent, {
      encoding: "utf8",
      mode: 0o600,
    });

    console.log("=== Zi Wei V3 Provider Quality Generation Summary ===");
    console.log(`Samples Generated: ${metrics.length}`);
    for (const m of metrics) {
      console.log(
        `[${m.sampleId}] Duration: ${m.durationMs}ms | Calls: ${m.providerCalls} | HTTP: ${m.httpRequests} | Words: ${m.wordCount} | Valid: ${m.validatorOk} | 12 Palaces: ${m.twelvePalacesComplete} | 4 Themes: ${m.fourThemesComplete}`,
      );
    }
    return;
  }

  // Safe prepare-only output: aggregate metrics only, zero credentials/private paths/birth data
  console.log("=== Zi Wei V3 Output Quality Sample Preparation Summary ===");
  console.log("Execution Mode: prepare-only (deterministic local calculation & pack building)");
  console.log(`Candidate Pool Evaluated: ${aggregateCoverage.candidatesEvaluated}`);
  console.log(`Samples Selected: ${aggregateCoverage.samplesSelected}`);
  console.log(`Sample IDs: ${preparedSamples.map((s) => s.sampleId).join(", ")}`);
  console.log(`Distinct Life Palace Placements: ${aggregateCoverage.distinctLifeBranches}/5`);
  console.log(`Distinct Body Palace Placements: ${aggregateCoverage.distinctBodyPalaces}/5`);
  console.log(`Supported Named Patterns Covered (${aggregateCoverage.patternsCount}): ${aggregateCoverage.patternsList.join(", ")}`);
  console.log(`Four Transformations Covered: ${aggregateCoverage.transformationsCount}/4`);
  console.log(`Favorable Brightness Values Covered: ${aggregateCoverage.favorableBrightnessCovered ? "YES" : "NO"}`);
  console.log(`Difficult Brightness Values Covered: ${aggregateCoverage.difficultBrightnessCovered ? "YES" : "NO"}`);
  console.log(`Sparse Principal-Star Palaces Covered: YES (total ${aggregateCoverage.totalEmptyPalacesAcrossSamples} empty palaces across samples)`);
  console.log(`Knowledge Packs Prepared: ${preparedSamples.length * 19} (19 per sample)`);
  console.log(`Total Knowledge Passages Prepared: ${totalPassagesAcrossAllSamples}`);
  console.log("Network Calls: 0");
  console.log("Private Report Files Committed: 0");
  console.log("Provider Execution Status: BLOCKED (AI environment credentials unset)");
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
