import { createHash } from "node:crypto";
import { existsSync, readFileSync, realpathSync } from "node:fs";
import { dirname, isAbsolute, normalize, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(process.env.LSV_KNOWLEDGE_ROOT ?? dirname(fileURLToPath(import.meta.url)), process.env.LSV_KNOWLEDGE_ROOT ? "." : "..");
const CANDIDATE_PATH = "content/knowledge/vi/ziwei/v4-candidate/comprehensive-report.v4.candidate.json";
const REGISTRY_PATH = "content/knowledge/ziwei/comprehensive-report-sources.v3.json";
const VALIDATION_POLICY_PATH = "config/ziwei-knowledge-v4-validation.v1.json";
export const SELECTOR_VERSION = "ziwei-v4-sample-selector.v1";
export const SAMPLE_SIZE = 50;
export const PALACE_IDS = [
  "ziwei.palace.life",
  "ziwei.palace.siblings",
  "ziwei.palace.spouse",
  "ziwei.palace.children",
  "ziwei.palace.wealth",
  "ziwei.palace.health",
  "ziwei.palace.travel",
  "ziwei.palace.friends",
  "ziwei.palace.career",
  "ziwei.palace.property",
  "ziwei.palace.fortune",
  "ziwei.palace.parents",
];
export const MAJOR_STAR_IDS = [
  "ziwei.star.ziwei",
  "ziwei.star.tianji",
  "ziwei.star.taiyang",
  "ziwei.star.wuqu",
  "ziwei.star.tiantong",
  "ziwei.star.lianzhen",
  "ziwei.star.tianfu",
  "ziwei.star.taiyin",
  "ziwei.star.tanlang",
  "ziwei.star.jumen",
  "ziwei.star.tianxiang",
  "ziwei.star.tianliang",
  "ziwei.star.qisha",
  "ziwei.star.pojun",
];
export const WARNING_GROUPS = [
  { id: "money", terms: ["tiền bạc"] },
  { id: "health", terms: ["sức khỏe"] },
  { id: "accident", terms: ["tai nạn"] },
  { id: "travel", terms: ["đi lại"] },
  { id: "legal_paperwork", terms: ["kiện tụng", "giấy tờ"] },
  { id: "relationship_breakdown", terms: ["đổ vỡ quan hệ"] },
  { id: "work", terms: ["công việc"] },
];

function sha256(value) {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function compare(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function assertRepositoryPath(path) {
  if (typeof path !== "string" || !path || isAbsolute(path) || path.includes("..")) {
    throw new Error(`REPOSITORY_BOUNDARY_INVALID: ${String(path)}`);
  }
  const resolved = resolve(ROOT, normalize(path));
  if (resolved !== ROOT && !resolved.startsWith(`${ROOT}${sep}`)) {
    throw new Error(`REPOSITORY_BOUNDARY_INVALID: ${path}`);
  }
  if (!existsSync(resolved)) throw new Error(`REPOSITORY_PATH_MISSING: ${path}`);
  const canonical = realpathSync(resolved);
  if (canonical !== ROOT && !canonical.startsWith(`${ROOT}${sep}`)) {
    throw new Error(`REPOSITORY_BOUNDARY_INVALID: ${path}`);
  }
  return resolved;
}

function readJson(path) {
  return JSON.parse(readFileSync(assertRepositoryPath(path), "utf8"));
}

function normalizeText(value) {
  return value.normalize("NFC").toLocaleLowerCase("vi").replace(/\s+/gu, " ");
}

function includesWholeTerm(text, term) {
  const escaped = normalizeText(term).replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
  return new RegExp(`(?:^|[^\\p{L}\\p{N}])${escaped}(?=$|[^\\p{L}\\p{N}])`, "u").test(text);
}

function includesAny(text, terms) {
  return terms.some((term) => includesWholeTerm(text, term));
}

function isCanonicalHash(value) {
  return typeof value === "string" && /^[0-9a-f]{64}$/u.test(value);
}

function validateWarningPolicy(policy) {
  const requiredLists = [
    "warningPeriodPhrases",
    "chartBasisPhrases",
    "likelySituationPhrases",
    "preparationIndicators",
    "certaintyPhrases",
    "adverseDatePatterns",
    "namedDiseaseTerms",
    "reproductiveClaimTerms",
    "remedyOrRitualTerms",
    "paywallPressureTerms",
  ];
  if (!policy || typeof policy !== "object" ||
      requiredLists.some((key) => !Array.isArray(policy[key]) ||
        policy[key].some((value) => typeof value !== "string" || !value))) {
    throw new Error("V4_SAMPLE_VALIDATION_POLICY_INVALID");
  }
  return policy;
}

function isEligibleWarningRecord(record, warningGroup, policy) {
  const text = normalizeText(record.content);
  if (!warningGroup.terms.some((term) => includesWholeTerm(text, term))) return false;
  if (!includesAny(text, policy.warningPeriodPhrases) ||
      !includesAny(text, policy.chartBasisPhrases) ||
      !includesAny(text, policy.likelySituationPhrases)) {
    return false;
  }
  const preparationCount = policy.preparationIndicators
    .filter((indicator) => includesWholeTerm(text, indicator)).length;
  if (preparationCount < 2) return false;
  if (includesAny(text, policy.certaintyPhrases) ||
      includesAny(text, policy.namedDiseaseTerms) ||
      includesAny(text, policy.reproductiveClaimTerms) ||
      includesAny(text, policy.remedyOrRitualTerms) ||
      includesAny(text, policy.paywallPressureTerms)) {
    return false;
  }
  return !policy.adverseDatePatterns.some((pattern) => new RegExp(pattern, "iu").test(text));
}

function sourceIndices(record) {
  const indices = new Set();
  for (const sourcePassageId of record.sourcePassageIds ?? []) {
    const match = /^ziwei-v3-(\d{2})-/u.exec(sourcePassageId);
    if (match) indices.add(Number(match[1]));
  }
  return indices;
}

function validateCandidate(candidate) {
  if (!candidate || typeof candidate !== "object" || !isCanonicalHash(candidate.candidateHash) ||
      !isCanonicalHash(candidate.contentHash) || !Array.isArray(candidate.chunks)) {
    throw new Error("V4_SAMPLE_CANDIDATE_INVALID");
  }
  if (candidate.chunks.length < SAMPLE_SIZE) {
    throw new Error(`V4_SAMPLE_RECORD_COUNT_UNAVAILABLE: ${candidate.chunks.length}`);
  }
  const passageIds = new Set();
  for (const record of candidate.chunks) {
    if (!record || typeof record.passageId !== "string" || !record.passageId ||
        typeof record.content !== "string" || !record.metadata || !Array.isArray(record.sourcePassageIds)) {
      throw new Error("V4_SAMPLE_RECORD_INVALID");
    }
    if (passageIds.has(record.passageId)) throw new Error(`V4_SAMPLE_DUPLICATE_PASSAGE_ID: ${record.passageId}`);
    passageIds.add(record.passageId);
  }
}

function rankedRecords(records, seed) {
  return records
    .map((record) => ({ record, rank: sha256(`${seed}:${record.passageId}`) }))
    .sort((left, right) => compare(left.rank, right.rank) || compare(left.record.passageId, right.record.passageId));
}

function selectQuota(coverage, selected, kind, id, eligible, ranked) {
  const match = ranked.find(({ record }) => eligible(record));
  if (!match) throw new Error(`V4_SAMPLE_QUOTA_UNAVAILABLE: ${kind}:${id}`);
  coverage[id] = match.record.passageId;
  selected.set(match.record.passageId, match.record);
}

function defaultSourceRegistries() {
  return Array.from({ length: 6 }, (_, index) => ({
    sourceIndex: index + 1,
    sourceId: `source-${String(index + 1).padStart(2, "0")}`,
  }));
}

export function selectZiweiKnowledgeV4Sample(candidate, sourceRegistries = defaultSourceRegistries()) {
  validateCandidate(candidate);
  const warningPolicy = validateWarningPolicy(readJson(VALIDATION_POLICY_PATH));
  if (!Array.isArray(sourceRegistries) || sourceRegistries.length !== 6 ||
      new Set(sourceRegistries.map((source) => source?.sourceIndex)).size !== 6 ||
      sourceRegistries.some((source) => !Number.isInteger(source?.sourceIndex) || typeof source.sourceId !== "string" || !source.sourceId)) {
    throw new Error("V4_SAMPLE_SOURCE_REGISTRY_INVALID");
  }

  const seed = sha256(`${SELECTOR_VERSION}:${candidate.candidateHash}:${candidate.contentHash}`);
  const ranked = rankedRecords(candidate.chunks, seed);
  const selected = new Map();
  const coverage = {
    palaces: {},
    majorStars: {},
    warningGroups: {},
    sourceRegistries: {},
  };

  for (const palaceId of PALACE_IDS) {
    selectQuota(coverage.palaces, selected, "palace", palaceId,
      (record) => record.metadata.palaces?.includes(palaceId), ranked);
  }
  for (const starId of MAJOR_STAR_IDS) {
    selectQuota(coverage.majorStars, selected, "major_star", starId,
      (record) => record.metadata.stars?.includes(starId), ranked);
  }
  for (const warningGroup of WARNING_GROUPS) {
    selectQuota(coverage.warningGroups, selected, "warning_group", warningGroup.id,
      (record) => isEligibleWarningRecord(record, warningGroup, warningPolicy), ranked);
  }
  for (const source of [...sourceRegistries].sort((left, right) => left.sourceIndex - right.sourceIndex)) {
    selectQuota(coverage.sourceRegistries, selected, "source_registry", source.sourceId,
      (record) => sourceIndices(record).has(source.sourceIndex), ranked);
  }

  for (const { record } of ranked) {
    if (selected.size === SAMPLE_SIZE) break;
    selected.set(record.passageId, record);
  }
  if (selected.size !== SAMPLE_SIZE) throw new Error(`V4_SAMPLE_RECORD_COUNT_UNAVAILABLE: ${selected.size}`);

  const records = [...selected.values()];
  return {
    selectorVersion: SELECTOR_VERSION,
    candidateHash: candidate.candidateHash,
    candidateContentHash: candidate.contentHash,
    seed,
    samplePassageIds: records.map((record) => record.passageId),
    coverage,
    records,
  };
}

function readSourceRegistries() {
  const registry = readJson(REGISTRY_PATH);
  if (!Array.isArray(registry.sources)) throw new Error("V4_SAMPLE_SOURCE_REGISTRY_INVALID");
  return registry.sources.map(({ sourceIndex, sourceId }) => ({ sourceIndex, sourceId }));
}

function parseArguments(argumentsList) {
  if (argumentsList[0] !== "--check") {
    throw new Error("Usage: node scripts/select-ziwei-knowledge-v4-sample.mjs --check [--candidate <repository-relative-path>]");
  }
  if (argumentsList.length === 1) return CANDIDATE_PATH;
  if (argumentsList.length === 3 && argumentsList[1] === "--candidate") return argumentsList[2];
  throw new Error("Usage: node scripts/select-ziwei-knowledge-v4-sample.mjs --check [--candidate <repository-relative-path>]");
}

function main() {
  const candidatePath = parseArguments(process.argv.slice(2));
  const sample = selectZiweiKnowledgeV4Sample(readJson(candidatePath), readSourceRegistries());
  process.stdout.write(`${JSON.stringify(sample, null, 2)}\n`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
