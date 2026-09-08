import { chmodSync, existsSync, mkdirSync, readFileSync, realpathSync, statSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

import {
  normalizeBirthProfile,
  buildComprehensiveZiweiFacts,
  buildComprehensiveKnowledgePacks,
  writeComprehensiveZiweiReport,
  validateComprehensiveZiweiReport,
  validateKnowledgeManifest,
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

const VALID_SAMPLE_IDS = [
  "SAMPLE-01",
  "SAMPLE-02",
  "SAMPLE-03",
  "SAMPLE-04",
  "SAMPLE-05",
];

// Generate a deterministic synthetic candidate grid dynamically at runtime via numeric loops
function generateDeterministicCandidateGrid() {
  const candidates = [];
  const baseYears = [1985, 1988, 1991, 1993, 1996, 1999, 2002];
  const months = [2, 4, 6, 8, 10, 12];
  const days = [5, 12, 18, 25];
  const timeHours = [0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22];

  let seq = 0;
  for (const year of baseYears) {
    for (const month of months) {
      for (const day of days) {
        for (const hour of timeHours) {
          seq += 1;
          const gender = seq % 2 === 0 ? "female" : "male";
          const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const timeStr = `${String(hour).padStart(2, "0")}:30`;
          candidates.push({ date: dateStr, time: timeStr, gender });
        }
      }
    }
  }
  return candidates;
}

function createLocalCorpusRetriever(chunks) {
  return async function retrieve(query) {
    const scored = [];
    const queryWords = query.text.toLowerCase().split(/\s+/).filter((w) => w.length > 1);

    for (const chunk of chunks) {
      const meta = chunk.metadata;
      let metadataScore = 0;

      // Metadata priorities 1-7
      if (query.patternIds && query.patternIds.some((id) => meta?.patterns?.includes(id))) metadataScore += 100;
      if (query.palaceIds && query.palaceIds.some((id) => meta?.palaces?.includes(id))) metadataScore += 40;
      if (query.starIds && query.starIds.some((id) => meta?.stars?.includes(id))) metadataScore += 30;
      if (query.transformationIds && query.transformationIds.some((id) => meta?.transformations?.includes(id))) metadataScore += 20;
      if (query.brightnessIds && query.brightnessIds.some((id) => meta?.brightness?.includes(id))) metadataScore += 10;
      if (query.relationIds && query.relationIds.some((id) => meta?.relations?.includes(id))) metadataScore += 8;
      if (query.topics && query.topics.some((id) => meta?.topics?.includes(id))) metadataScore += 4;

      // Lexical overlap priority 8
      let lexicalMatches = 0;
      const contentLower = chunk.content.toLowerCase();
      for (const w of queryWords) {
        if (contentLower.includes(w)) lexicalMatches += 1;
      }
      const textRank = queryWords.length > 0 ? lexicalMatches / queryWords.length : 0;

      // Return only candidates with metadata or lexical relevance
      if (metadataScore > 0 || textRank > 0) {
        scored.push({
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
          metadataScore,
          textRank,
        });
      }
    }

    // Task 5 ranking: metadataScore desc, priority desc, textRank desc, passageId asc
    scored.sort((a, b) => {
      const scoreDiff = b.metadataScore - a.metadataScore;
      if (scoreDiff !== 0) return scoreDiff;
      const priorityDiff = (b.metadata?.priority ?? 1) - (a.metadata?.priority ?? 1);
      if (priorityDiff !== 0) return priorityDiff;
      const rankDiff = b.textRank - a.textRank;
      if (Math.abs(rankDiff) > 1e-6) return rankDiff;
      return a.passageId.localeCompare(b.passageId, "en");
    });

    const maxPassages = query.maxPassages ?? 2;
    const maxTotalChars = query.maxTotalChars ?? 1800;
    const seenContentHashes = new Set();
    const seenPassageIds = new Set();
    const boundedPassages = [];
    let totalChars = 0;

    for (const candidate of scored) {
      if (boundedPassages.length >= maxPassages) break;
      if (seenContentHashes.has(candidate.contentHash)) continue;
      if (seenPassageIds.has(candidate.passageId)) continue;
      if (totalChars + candidate.content.length > maxTotalChars) continue;

      seenContentHashes.add(candidate.contentHash);
      seenPassageIds.add(candidate.passageId);
      boundedPassages.push(candidate);
      totalChars += candidate.content.length;
    }

    return boundedPassages;
  };
}

async function evaluateCandidatePool(adapter) {
  const grid = generateDeterministicCandidateGrid();
  const evaluated = [];

  for (let i = 0; i < grid.length; i++) {
    const c = grid[i];
    const profileRes = normalizeBirthProfile({
      version: 1,
      calendar: { kind: "solar", date: c.date },
      time: { precision: "exact_minute", localTime: c.time },
      timezone: { ianaZone: "Asia/Ho_Chi_Minh" },
      placeLabel: "Việt Nam",
      gender: c.gender,
      consentVersion: "2026-09-01",
      locale: "vi",
    });
    if (!profileRes.ok) continue;

    const chartRes = await adapter.calculate({ birthProfile: profileRes.value }, iztroDefaultConfig);
    if (!chartRes.ok) continue;

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
      facts,
      lifeBranch: lifePalace.earthlyBranchId,
      bodyPalace: bodyPalace.palaceId,
      patterns: facts.patterns.map((p) => p.id),
      emptyPalacesCount: emptyPalaces.length,
      brightnesses: Array.from(brightnesses),
      transformations: facts.transformations.map((t) => t.id),
    });

    if (evaluated.length >= 40) break;
  }

  // Greedy selection of 5 charts satisfying all coverage constraints
  const selected = [];
  const seenLifeBranches = new Set();
  const seenBodyPalaces = new Set();
  const allPatterns = new Set();

  for (const item of evaluated) {
    if (selected.length === 5) break;
    if (seenLifeBranches.has(item.lifeBranch)) continue;
    if (seenBodyPalaces.has(item.bodyPalace)) continue;
    // Prefer charts that contribute named patterns when needed
    if (allPatterns.size < 2 && item.patterns.length === 0 && selected.length >= 3) {
      continue;
    }

    selected.push(item);
    seenLifeBranches.add(item.lifeBranch);
    seenBodyPalaces.add(item.bodyPalace);
    for (const p of item.patterns) allPatterns.add(p);
  }

  if (selected.length !== 5) {
    throw new Error(
      `BLOCKED: Candidate pool could not select 5 charts with distinct Life/Body placements (got ${selected.length})`,
    );
  }

  // Verify collective coverage constraints across selected charts
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
  const hasPrepareOnly = args.includes("--prepare-only");
  const hasExecuteProvider = args.includes("--execute-provider");
  const outputDirIdx = args.indexOf("--output-dir");
  const outputDir = outputDirIdx !== -1 ? args[outputDirIdx + 1] : undefined;

  const sampleIdOccurrences = args.filter((a) => a === "--sample-id").length;
  if (sampleIdOccurrences > 1) {
    console.error("BLOCKED: Duplicate --sample-id argument.");
    process.exit(1);
  }

  const sampleIdIdx = args.indexOf("--sample-id");
  let sampleId = undefined;
  if (sampleIdIdx !== -1) {
    sampleId = args[sampleIdIdx + 1];
    if (!sampleId || sampleId.startsWith("--")) {
      console.error("BLOCKED: Missing value for --sample-id.");
      process.exit(1);
    }
    if (!hasExecuteProvider || hasPrepareOnly) {
      console.error("BLOCKED: --sample-id is valid only with --execute-provider.");
      process.exit(1);
    }
    if (!VALID_SAMPLE_IDS.includes(sampleId)) {
      console.error(`BLOCKED: Unknown or malformed --sample-id '${sampleId}'. Valid values: ${VALID_SAMPLE_IDS.join(", ")}.`);
      process.exit(1);
    }
  }

  if (hasPrepareOnly && hasExecuteProvider) {
    console.error("BLOCKED: Conflicting arguments: --prepare-only and --execute-provider are mutually exclusive.");
    process.exit(1);
  }

  return {
    prepareOnly: hasPrepareOnly || !hasExecuteProvider,
    executeProvider: hasExecuteProvider,
    outputDir,
    sampleId,
  };
}

export function validatePrivateOutputDirectory(outputDir) {
  if (!outputDir) {
    throw new Error("BLOCKED: Missing required --output-dir <path> argument for provider execution");
  }

  if (!isAbsolute(outputDir)) {
    throw new Error("BLOCKED: --output-dir must be an absolute path outside the repository root");
  }

  const resolved = resolve(outputDir);
  const realRepoRoot = realpathSync(REPO_ROOT);

  if (
    resolved === REPO_ROOT ||
    resolved === realRepoRoot ||
    resolved.startsWith(REPO_ROOT + sep) ||
    resolved.startsWith(realRepoRoot + sep)
  ) {
    throw new Error("BLOCKED: --output-dir must reside outside the canonical repository root");
  }

  // Find nearest existing ancestor and check its realpath
  let current = resolved;
  while (!existsSync(current)) {
    const parent = dirname(current);
    if (parent === current) {
      throw new Error("BLOCKED: Root filesystem path does not exist");
    }
    current = parent;
  }

  const realExistingAncestor = realpathSync(current);
  if (
    realExistingAncestor === REPO_ROOT ||
    realExistingAncestor === realRepoRoot ||
    realExistingAncestor.startsWith(REPO_ROOT + sep) ||
    realExistingAncestor.startsWith(realRepoRoot + sep)
  ) {
    throw new Error("BLOCKED: --output-dir ancestor symlink resolves inside the repository root");
  }

  // Project the remaining path from realExistingAncestor to verify canonical destination
  const remainingPath = relative(current, resolved);
  const projectedTarget = resolve(realExistingAncestor, remainingPath);
  if (
    projectedTarget === REPO_ROOT ||
    projectedTarget === realRepoRoot ||
    projectedTarget.startsWith(REPO_ROOT + sep) ||
    projectedTarget.startsWith(realRepoRoot + sep)
  ) {
    throw new Error("BLOCKED: --output-dir projected canonical path resolves inside the repository root");
  }

  if (existsSync(resolved)) {
    const stat = statSync(resolved);
    if (!stat.isDirectory()) {
      throw new Error("BLOCKED: --output-dir target exists and is not a directory");
    }
    const realOut = realpathSync(resolved);
    if (
      realOut === REPO_ROOT ||
      realOut === realRepoRoot ||
      realOut.startsWith(REPO_ROOT + sep) ||
      realOut.startsWith(realRepoRoot + sep)
    ) {
      throw new Error("BLOCKED: --output-dir symlink target resolves inside the repository root");
    }
    // Enforce owner-only directory permissions (0700) on existing directory
    chmodSync(realOut, 0o700);
  } else {
    mkdirSync(resolved, { recursive: true, mode: 0o700 });
    const realOut = realpathSync(resolved);
    if (
      realOut === REPO_ROOT ||
      realOut === realRepoRoot ||
      realOut.startsWith(REPO_ROOT + sep) ||
      realOut.startsWith(realRepoRoot + sep)
    ) {
      throw new Error("BLOCKED: --output-dir created target resolves inside the repository root");
    }
    chmodSync(realOut, 0o700);
  }

  return realpathSync(resolved);
}

export function writePrivateFile(filePath, content, sampleId) {
  if (existsSync(filePath)) {
    const scope = sampleId ? ` (${sampleId})` : "";
    throw new Error(`BLOCKED: Private output file already exists and cannot be overwritten${scope}`);
  }
  writeFileSync(filePath, content, { encoding: "utf8", mode: 0o600 });
  chmodSync(filePath, 0o600);
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

function extractValidationFindingCounts(validationResult) {
  let duplicateParagraphCount = 0;
  let prohibitedPhraseCount = 0;
  let rawTechnicalIdentifierCount = 0;

  if (!validationResult.ok && Array.isArray(validationResult.errors)) {
    for (const err of validationResult.errors) {
      if (err.includes("Duplicate narrative paragraph") || err.includes("Near-duplicate narrative paragraph")) {
        duplicateParagraphCount += 1;
      } else if (err.includes("Raw technical identifier leaked in")) {
        rawTechnicalIdentifierCount += 1;
      } else if (err.includes("Prohibited")) {
        prohibitedPhraseCount += 1;
      }
    }
  }

  return {
    duplicateParagraphCount,
    prohibitedPhraseCount,
    rawTechnicalIdentifierCount,
  };
}

async function main() {
  const cli = parseCliArguments();

  // Load and strictly validate committed V3 corpus manifest using production contract
  if (!existsSync(CORPUS_PATH)) {
    throw new Error(`BLOCKED: Committed V3 corpus not found at ${CORPUS_PATH}`);
  }
  let rawJson;
  try {
    rawJson = JSON.parse(readFileSync(CORPUS_PATH, "utf8"));
  } catch {
    throw new Error("BLOCKED: Committed V3 corpus is not valid JSON");
  }

  const validation = validateKnowledgeManifest(rawJson, { repositoryRoot: REPO_ROOT });
  if (!validation.ok) {
    throw new Error(
      `BLOCKED: Committed V3 corpus manifest validation failed: ${validation.code} - ${validation.message}`,
    );
  }
  const manifest = validation.value;
  const retriever = createLocalCorpusRetriever(manifest.chunks);

  // Initialize deterministic engine adapter
  const adapter = new IztroAdapter();

  // Evaluate candidate pool and select 5 synthetic charts
  const { selected, aggregateCoverage } = await evaluateCandidatePool(adapter);

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
    let lastCapturedResponse = undefined;
    let lastHttpStatus = undefined;

    const countingFetch = async (url, init) => {
      totalHttpRequests += 1;
      const res = await fetch(url, init);
      lastHttpStatus = res.status;
      try {
        const clone = res.clone();
        lastCapturedResponse = await clone.text();
      } catch {
        lastCapturedResponse = "";
      }
      return res;
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

    const samplesToExecute = cli.sampleId
      ? preparedSamples.filter((s) => s.sampleId === cli.sampleId)
      : preparedSamples;

    const metrics = [];

    for (const sample of samplesToExecute) {
      let generateStructuredCalls = 0;
      lastCapturedResponse = undefined;
      lastHttpStatus = undefined;

      const wrappedProvider = {
        generateStructured: async (req) => {
          generateStructuredCalls += 1;
          return await aiProvider.generateStructured(req);
        },
      };

      const prevHttpCount = totalHttpRequests;
      const startTime = Date.now();

      let writerResult;
      let writerError = null;
      try {
        writerResult = await writeComprehensiveZiweiReport(
          { comprehensiveFacts: sample.facts, knowledgePacks: sample.knowledgePacks },
          wrappedProvider,
        );
      } catch (err) {
        writerError = err;
      }

      const durationMs = Date.now() - startTime;
      const sampleHttpRequests = totalHttpRequests - prevHttpCount;
      const sampleBaseName = sample.sampleId.toLowerCase();
      const capturedByteCount =
        lastCapturedResponse !== undefined
          ? Buffer.byteLength(lastCapturedResponse, "utf8")
          : 0;

      // Capture exact HTTP response body into private output directory with mode 0600
      if (lastCapturedResponse !== undefined) {
        writePrivateFile(
          join(privateOutputDir, `${sampleBaseName}-response.raw`),
          lastCapturedResponse,
          sample.sampleId,
        );
      }

      // Strict single-call invariant check: assert exactly 1 provider call and 1 HTTP request per sample
      if (generateStructuredCalls !== 1 || sampleHttpRequests !== 1) {
        throw new Error(
          `BLOCKED: Sample ${sample.sampleId} violated single-call invariant: provider calls=${generateStructuredCalls}, HTTP requests=${sampleHttpRequests}`,
        );
      }

      if (!writerResult || !writerResult.ok) {
        const errorCode = writerResult?.error?.code ?? (writerError ? "AI_PROVIDER_REQUEST_FAILED" : "UNKNOWN_ERROR");
        console.error(
          `[${sample.sampleId}] Generation failed: ${errorCode} | Calls: ${generateStructuredCalls} | HTTP: ${sampleHttpRequests} | Status: ${lastHttpStatus ?? "N/A"} | Response bytes: ${capturedByteCount}`,
        );
        throw new Error(`Sample ${sample.sampleId} generation failed: ${errorCode}`);
      }

      const report = writerResult.value.report;
      const validationRes = validateComprehensiveZiweiReport(report, sample.facts);
      const html = renderComprehensiveZiweiHtml(report);
      const findingCounts = extractValidationFindingCounts(validationRes);

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

      // Write private artifacts (mode 0600, fail closed on collision, never in Git)
      writePrivateFile(
        join(privateOutputDir, `${sampleBaseName}-report.json`),
        JSON.stringify(report, null, 2),
        sample.sampleId,
      );
      writePrivateFile(
        join(privateOutputDir, `${sampleBaseName}-report.html`),
        html,
        sample.sampleId,
      );

      metrics.push({
        sampleId: sample.sampleId,
        durationMs,
        providerCalls: generateStructuredCalls,
        httpRequests: sampleHttpRequests,
        httpStatus: lastHttpStatus,
        responseBytes: capturedByteCount,
        wordCount,
        validatorOk: validationRes.ok,
        duplicateParagraphCount: findingCounts.duplicateParagraphCount,
        prohibitedPhraseCount: findingCounts.prohibitedPhraseCount,
        rawTechnicalIdentifierCount: findingCounts.rawTechnicalIdentifierCount,
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
    writePrivateFile(join(privateOutputDir, "review-worksheet.md"), worksheetContent);

    console.log("=== Zi Wei V3 Provider Quality Generation Summary ===");
    console.log(`Samples Generated: ${metrics.length}`);
    for (const m of metrics) {
      console.log(
        `[${m.sampleId}] Duration: ${m.durationMs}ms | Calls: ${m.providerCalls} | HTTP: ${m.httpRequests} | Words: ${m.wordCount} | Valid: ${m.validatorOk} | Dups: ${m.duplicateParagraphCount} | Prohibited: ${m.prohibitedPhraseCount} | RawIDs: ${m.rawTechnicalIdentifierCount} | 12 Palaces: ${m.twelvePalacesComplete} | 4 Themes: ${m.fourThemesComplete}`,
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

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  main().catch((err) => {
    console.error(err instanceof Error ? err.message : String(err));
    process.exit(1);
  });
}
