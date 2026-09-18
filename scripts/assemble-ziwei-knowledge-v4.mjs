import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  realpathSync,
  readdirSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, isAbsolute, join, normalize, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(process.env.LSV_KNOWLEDGE_ROOT ?? dirname(fileURLToPath(import.meta.url)), process.env.LSV_KNOWLEDGE_ROOT ? "." : "..");
const CANDIDATE_DIR = "content/knowledge/vi/ziwei/v4-candidate";
const INDEX_PATH = `${CANDIDATE_DIR}/work-index.v1.json`;
const V3_PATH = "content/knowledge/vi/ziwei/comprehensive-report.v3.json";
const REGISTRY_PATH = "content/knowledge/ziwei/comprehensive-report-sources.v3.json";
const ASSEMBLY_VERSION = "ziwei-v4-assembler.v1";
const POLICY_PATH = "config/ziwei-knowledge-v4-validation.v1.json";
const LEDGER_PATH = `${CANDIDATE_DIR}/comprehensive-report.v4.disposition-ledger.json`;
const MANIFEST_PATH = `${CANDIDATE_DIR}/comprehensive-report.v4.candidate.json`;
const REPORT_PATH = `${CANDIDATE_DIR}/comprehensive-report.v4.validation.json`;
const MAX_SHARD_SIZE = 75;

function sha256(value) {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function canonicalJson(value) {
  return JSON.stringify(value);
}

function canonicalFile(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function compare(a, b) {
  return a < b ? -1 : a > b ? 1 : 0;
}

function hashFile(path) {
  return sha256(readFileSync(path, "utf8"));
}

function assertRepositoryPath(path, { mustExist = true } = {}) {
  if (typeof path !== "string" || !path || isAbsolute(path) || path.includes("..")) {
    throw new Error(`REPOSITORY_BOUNDARY_INVALID: ${String(path)}`);
  }
  const resolved = resolve(ROOT, normalize(path));
  if (resolved !== ROOT && !resolved.startsWith(`${ROOT}${sep}`)) {
    throw new Error(`REPOSITORY_BOUNDARY_INVALID: ${path}`);
  }
  if (mustExist && !existsSync(resolved)) {
    throw new Error(`REPOSITORY_PATH_MISSING: ${path}`);
  }
  if (mustExist) {
    const canonical = realpathSync(resolved);
    if (canonical !== ROOT && !canonical.startsWith(`${ROOT}${sep}`)) {
      throw new Error(`REPOSITORY_BOUNDARY_INVALID: ${path}`);
    }
  }
  return resolved;
}

function readJson(path) {
  return JSON.parse(readFileSync(assertRepositoryPath(path), "utf8"));
}

function sourceIndexFromPassageId(passageId) {
  const match = /^ziwei-v3-(\d{2})-/u.exec(passageId);
  if (!match) throw new Error(`V3_PASSAGE_ID_INVALID: ${passageId}`);
  return Number(match[1]);
}

function buildWorkIndex() {
  const manifest = readJson(V3_PATH);
  const registry = readJson(REGISTRY_PATH);
  if (!Array.isArray(manifest.chunks) || manifest.chunks.length !== 3_258) {
    throw new Error("V3_MANIFEST_CARDINALITY_INVALID");
  }
  if (!Array.isArray(registry.sources) || registry.sources.length !== 6) {
    throw new Error("V3_SOURCE_REGISTRY_CARDINALITY_INVALID");
  }
  const sourceIndices = new Set(registry.sources.map((source) => source.sourceIndex));
  const passageIds = new Set();
  const bySource = new Map();
  for (const chunk of manifest.chunks) {
    const sourceIndex = sourceIndexFromPassageId(chunk.passageId);
    if (!sourceIndices.has(sourceIndex) || passageIds.has(chunk.passageId)) {
      throw new Error(`V3_SOURCE_COVERAGE_INVALID: ${chunk.passageId}`);
    }
    passageIds.add(chunk.passageId);
    const bucket = bySource.get(sourceIndex) ?? [];
    bucket.push(chunk.passageId);
    bySource.set(sourceIndex, bucket);
  }

  const shards = [];
  for (const source of [...registry.sources].sort((a, b) => a.sourceIndex - b.sourceIndex)) {
    const ids = (bySource.get(source.sourceIndex) ?? []).sort(compare);
    for (let offset = 0, shardNumber = 1; offset < ids.length; offset += MAX_SHARD_SIZE, shardNumber += 1) {
      const sourcePassageIds = ids.slice(offset, offset + MAX_SHARD_SIZE);
      shards.push({
        sourceIndex: source.sourceIndex,
        sourceId: source.sourceId,
        shardNumber,
        path: `${CANDIDATE_DIR}/shards/source-${String(source.sourceIndex).padStart(2, "0")}-shard-${String(shardNumber).padStart(3, "0")}.json`,
        sourcePassageIds,
      });
    }
  }
  if (shards.length !== 45 || shards.some((shard) => shard.sourcePassageIds.length > MAX_SHARD_SIZE)) {
    throw new Error("V4_WORK_INDEX_PARTITION_INVALID");
  }
  return {
    workIndexSchemaVersion: "ziwei.v4-work-index.v1",
    assemblerVersion: ASSEMBLY_VERSION,
    v3ManifestPath: V3_PATH,
    v3ManifestHash: hashFile(assertRepositoryPath(V3_PATH)),
    sourceRegistryPath: REGISTRY_PATH,
    sourceRegistryHash: hashFile(assertRepositoryPath(REGISTRY_PATH)),
    maximumSourcePassagesPerShard: MAX_SHARD_SIZE,
    sourcePassageCount: passageIds.size,
    shards,
  };
}

function validateWorkIndex(index) {
  const expected = buildWorkIndex();
  if (canonicalJson(index) !== canonicalJson(expected)) {
    throw new Error("V4_WORK_INDEX_MISMATCH");
  }
  return expected;
}

function writeWorkIndex() {
  const path = assertRepositoryPath(INDEX_PATH, { mustExist: false });
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, canonicalFile(buildWorkIndex()), "utf8");
}

function normalizeString(value, label) {
  if (typeof value !== "string") throw new Error(`V4_RECORD_INVALID: ${label}`);
  const normalized = value.normalize("NFC");
  if (value !== normalized) throw new Error(`V4_NFC_REQUIRED: ${label}`);
  return normalized;
}

function normalizeSortedStrings(values, label) {
  if (!Array.isArray(values)) throw new Error(`V4_RECORD_INVALID: ${label}`);
  const normalized = values.map((value) => normalizeString(value, label));
  if (new Set(normalized).size !== normalized.length || canonicalJson(normalized) !== canonicalJson([...normalized].sort(compare))) {
    throw new Error(`V4_ARRAY_NOT_CANONICAL: ${label}`);
  }
  return normalized;
}

function canonicalRecord(input) {
  if (!input || typeof input !== "object") throw new Error("V4_RECORD_INVALID");
  const metadata = input.metadata;
  if (!metadata || typeof metadata !== "object") throw new Error("V4_METADATA_INVALID");
  const record = {
    passageId: normalizeString(input.passageId, "passageId"),
    reportSections: normalizeSortedStrings(input.reportSections, "reportSections"),
    content: normalizeString(input.content, "content"),
    contentHash: normalizeString(input.contentHash, "contentHash"),
    metadata: {
      topics: normalizeSortedStrings(metadata.topics, "metadata.topics"),
      palaces: normalizeSortedStrings(metadata.palaces, "metadata.palaces"),
      stars: normalizeSortedStrings(metadata.stars, "metadata.stars"),
      brightness: normalizeSortedStrings(metadata.brightness, "metadata.brightness"),
      transformations: normalizeSortedStrings(metadata.transformations, "metadata.transformations"),
      relations: normalizeSortedStrings(metadata.relations, "metadata.relations"),
      patterns: normalizeSortedStrings(metadata.patterns, "metadata.patterns"),
      sourceType: normalizeString(metadata.sourceType, "metadata.sourceType"),
      languageOrigin: normalizeString(metadata.languageOrigin, "metadata.languageOrigin"),
      priority: metadata.priority,
    },
    sourcePassageIds: normalizeSortedStrings(input.sourcePassageIds, "sourcePassageIds"),
    dispositionRationaleCode: normalizeString(input.dispositionRationaleCode, "dispositionRationaleCode"),
  };
  if (!["modern", "classical", "matrix", "curated"].includes(record.metadata.sourceType) ||
      record.metadata.languageOrigin !== "vi" ||
      ![1, 2, 3].includes(record.metadata.priority) ||
      !["rewritten", "merged", "split"].includes(record.dispositionRationaleCode) ||
      !record.reportSections.length ||
      !record.sourcePassageIds.length ||
      record.content.length > 1_200 ||
      sha256(record.content) !== record.contentHash) {
    throw new Error(`V4_RECORD_INVALID: ${record.passageId}`);
  }
  const derivedId = `ziwei-v4-${sha256(canonicalJson({
    assemblyVersion: ASSEMBLY_VERSION,
    reportSections: record.reportSections,
    content: record.content,
    metadata: record.metadata,
    sourcePassageIds: record.sourcePassageIds,
    dispositionRationaleCode: record.dispositionRationaleCode,
  })).slice(0, 24)}`;
  if (record.passageId !== derivedId) {
    throw new Error(`V4_DERIVED_ID_MISMATCH: ${record.passageId}`);
  }
  return record;
}

function canonicalLedgerPayload(ledger) {
  return {
    ledgerSchemaVersion: ledger.ledgerSchemaVersion,
    sourceKnowledgeVersion: ledger.sourceKnowledgeVersion,
    outputKnowledgeVersion: ledger.outputKnowledgeVersion,
    entries: ledger.entries,
  };
}

function candidateHash(chunks, edges, ledgerHash, policyVersion) {
  return sha256(canonicalJson({
    chunks,
    provenanceEdges: edges,
    dispositionLedgerHash: ledgerHash,
    policyVersion,
    assemblerVersion: ASSEMBLY_VERSION,
  }));
}

function readShard(indexShard) {
  const file = assertRepositoryPath(indexShard.path);
  const shard = JSON.parse(readFileSync(file, "utf8"));
  if (!shard || shard.shardSchemaVersion !== "ziwei.v4-editorial-shard.v1" ||
      shard.path !== indexShard.path ||
      canonicalJson(shard.sourcePassageIds) !== canonicalJson(indexShard.sourcePassageIds) ||
      !Array.isArray(shard.records) ||
      !Array.isArray(shard.dispositions)) {
    throw new Error(`V4_SHARD_CONTRACT_INVALID: ${indexShard.path}`);
  }
  return shard;
}

function assemble(index) {
  const v3 = readJson(V3_PATH);
  const v3Ids = new Set(v3.chunks.map((chunk) => chunk.passageId));
  const shardFiles = index.shards.map((shard) => readShard(shard));
  const records = [];
  const dispositions = [];
  for (const shard of shardFiles) {
    const owned = new Set(shard.sourcePassageIds);
    for (const record of shard.records) {
      const canonical = canonicalRecord(record);
      if (canonical.sourcePassageIds.some((id) => !owned.has(id))) {
        throw new Error(`V4_SHARD_WRITE_SET_VIOLATION: ${shard.path}`);
      }
      records.push(canonical);
    }
    for (const entry of shard.dispositions) {
      if (!entry || !owned.has(entry.sourcePassageId)) throw new Error(`V4_SHARD_DISPOSITION_INVALID: ${shard.path}`);
      dispositions.push(entry);
    }
  }
  const chunks = [...records].sort((a, b) => compare(a.passageId, b.passageId));
  if (new Set(chunks.map((chunk) => chunk.passageId)).size !== chunks.length ||
      new Set(chunks.map((chunk) => chunk.contentHash)).size !== chunks.length ||
      new Set(chunks.map((chunk) => chunk.content)).size !== chunks.length) {
    throw new Error("V4_DUPLICATE_OUTPUT_REJECTED");
  }
  const outputBySource = new Map();
  const edges = [];
  for (const chunk of chunks) {
    for (const sourcePassageId of chunk.sourcePassageIds) {
      if (!v3Ids.has(sourcePassageId)) throw new Error(`V4_PROVENANCE_SOURCE_MISSING: ${sourcePassageId}`);
      const outputs = outputBySource.get(sourcePassageId) ?? new Set();
      outputs.add(chunk.passageId);
      outputBySource.set(sourcePassageId, outputs);
      edges.push({
        outputKnowledgeVersion: "ziwei.comprehensive.knowledge.v4",
        outputPassageId: chunk.passageId,
        sourceKnowledgeVersion: "ziwei.comprehensive.knowledge.v3",
        sourcePassageId,
      });
    }
  }
  edges.sort((a, b) => compare(canonicalJson(a), canonicalJson(b)));
  const entries = dispositions.map((entry) => {
    const outputPassageIds = [...(outputBySource.get(entry.sourcePassageId) ?? [])].sort(compare);
    if (!["rewritten", "merged", "split", "omitted_oral_filler", "omitted_death_only"].includes(entry.disposition) ||
        (entry.disposition.startsWith("omitted_") ? outputPassageIds.length !== 0 : outputPassageIds.length === 0)) {
      throw new Error(`V4_LEDGER_DISPOSITION_INVALID: ${entry.sourcePassageId}`);
    }
    return {
      sourcePassageId: normalizeString(entry.sourcePassageId, "ledger.sourcePassageId"),
      disposition: normalizeString(entry.disposition, "ledger.disposition"),
      outputPassageIds,
    };
  }).sort((a, b) => compare(a.sourcePassageId, b.sourcePassageId));
  if (entries.length !== 3_258 || new Set(entries.map((entry) => entry.sourcePassageId)).size !== entries.length ||
      entries.some((entry) => !v3Ids.has(entry.sourcePassageId)) ||
      new Set(entries.map((entry) => entry.sourcePassageId)).size !== v3Ids.size) {
    throw new Error("V4_LEDGER_COVERAGE_INVALID");
  }
  const policy = readJson(POLICY_PATH);
  const ledgerWithoutHash = {
    ledgerSchemaVersion: "ziwei.v3-disposition-ledger.v1",
    sourceKnowledgeVersion: "ziwei.comprehensive.knowledge.v3",
    outputKnowledgeVersion: "ziwei.comprehensive.knowledge.v4",
    candidateHash: "0".repeat(64),
    entries,
  };
  const ledgerHash = sha256(canonicalJson(canonicalLedgerPayload(ledgerWithoutHash)));
  const hash = candidateHash(chunks, edges, ledgerHash, policy.version);
  const ledger = { ...ledgerWithoutHash, candidateHash: hash };
  const manifest = {
    documentId: "ziwei-comprehensive-report-vi",
    knowledgeVersion: "ziwei.comprehensive.knowledge.v4",
    discipline: "ziwei",
    locale: "vi",
    sourcePath: MANIFEST_PATH,
    sourceAttribution: "La So Viet Editorial Board",
    permittedUse: "reference_rewrite",
    contentHash: sha256(chunks.map((chunk) => chunk.content).join("\n\n")),
    approval: { status: "draft", approver: "", approvedAt: "1970-01-01T00:00:00.000Z" },
    manifestSchemaVersion: "knowledge-manifest.v2",
    candidateHash: hash,
    assemblyVersion: ASSEMBLY_VERSION,
    provenanceSchemaVersion: "knowledge-provenance.v1",
    dispositionLedgerPath: LEDGER_PATH,
    dispositionLedgerHash: ledgerHash,
    chunks,
  };
  return { manifest, ledger, edges, policyVersion: policy.version };
}

function expectedMissingShards(index) {
  return index.shards.filter((shard) => !existsSync(assertRepositoryPath(shard.path, { mustExist: false })));
}

function check() {
  const index = validateWorkIndex(readJson(INDEX_PATH));
  const missing = expectedMissingShards(index);
  if (missing.length === index.shards.length) {
    process.stdout.write(`EXPECTED_MISSING_SHARDS: ${missing.length} immutable editorial shards are not created yet.\n`);
    return;
  }
  if (missing.length) throw new Error(`V4_SHARDS_INCOMPLETE: missing ${missing.length} of ${index.shards.length}`);
  const result = assemble(index);
  process.stdout.write(`V4_ASSEMBLY_READY: ${result.manifest.chunks.length} records, ${result.ledger.entries.length} ledger entries.\n`);
}

function writeAggregate() {
  const index = validateWorkIndex(readJson(INDEX_PATH));
  const missing = expectedMissingShards(index);
  if (missing.length) throw new Error(`V4_SHARDS_INCOMPLETE: missing ${missing.length} of ${index.shards.length}`);
  const result = assemble(index);
  for (const [path, value] of [
    [LEDGER_PATH, result.ledger],
    [MANIFEST_PATH, result.manifest],
    [REPORT_PATH, {
      validationSchemaVersion: "ziwei.v4-validation-report.v1",
      candidateHash: result.manifest.candidateHash,
      policyVersion: result.policyVersion,
      assemblyVersion: ASSEMBLY_VERSION,
      status: "pending-validation",
    }],
  ]) {
    const output = assertRepositoryPath(path, { mustExist: false });
    mkdirSync(dirname(output), { recursive: true });
    writeFileSync(output, canonicalFile(value), "utf8");
  }
}

const argument = process.argv[2];
if (argument === "--write-index") writeWorkIndex();
else if (argument === "--check") check();
else if (argument === "--assemble") writeAggregate();
else throw new Error("Usage: node scripts/assemble-ziwei-knowledge-v4.mjs --write-index|--check|--assemble");
