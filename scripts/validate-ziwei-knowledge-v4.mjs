import { createHash } from "node:crypto";
import {
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  realpathSync,
  readdirSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, isAbsolute, join, normalize, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import {
  computeDispositionLedgerPayloadHash,
  computeKnowledgeV4CandidateHash,
  validateKnowledgeManifestV2,
} from "../packages/backend/dist/knowledge/knowledge-ingestion.service.js";
import { validateZiweiKnowledgeV4Record } from "../packages/backend/dist/knowledge/ziwei-knowledge-v4-validator.js";

const ROOT = resolve(
  process.env.LSV_KNOWLEDGE_ROOT ?? dirname(fileURLToPath(import.meta.url)),
  process.env.LSV_KNOWLEDGE_ROOT ? "." : "..",
);
const CANDIDATE_DIR = "content/knowledge/vi/ziwei/v4-candidate";
const MANIFEST_PATH = `${CANDIDATE_DIR}/comprehensive-report.v4.candidate.json`;
const FINAL_MANIFEST_PATH = "content/knowledge/vi/ziwei/comprehensive-report.v4.json";
const LEDGER_PATH = `${CANDIDATE_DIR}/comprehensive-report.v4.disposition-ledger.json`;
const REPORT_PATH = `${CANDIDATE_DIR}/comprehensive-report.v4.validation.json`;
const V3_PATH = "content/knowledge/vi/ziwei/comprehensive-report.v3.json";
const REGISTRY_PATH = "content/knowledge/ziwei/comprehensive-report-sources.v3.json";
const INDEX_PATH = `${CANDIDATE_DIR}/work-index.v1.json`;
const POLICY_PATH = "config/ziwei-knowledge-v4-validation.v1.json";

function compare(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function canonicalFile(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function candidatePath() {
  return resolve(ROOT, CANDIDATE_DIR);
}

function assertCanonicalCandidateDir(argument) {
  if (argument !== CANDIDATE_DIR) throw new Error("V4_CANDIDATE_DIR_NOT_CANONICAL");
  const path = candidatePath();
  if (!existsSync(path) || lstatSync(path).isSymbolicLink() || realpathSync(path) !== path) {
    throw new Error("V4_CANDIDATE_DIR_NOT_CANONICAL");
  }
  return path;
}

function assertCanonicalFinalManifest(argument) {
  if (argument !== FINAL_MANIFEST_PATH) throw new Error("V4_FINAL_MANIFEST_NOT_CANONICAL");
  const path = repositoryFile(FINAL_MANIFEST_PATH);
  if (!existsSync(path) || lstatSync(path).isSymbolicLink() || realpathSync(path) !== path) {
    throw new Error("V4_FINAL_MANIFEST_NOT_CANONICAL");
  }
  return path;
}

function repositoryFile(path) {
  if (typeof path !== "string" || !path || isAbsolute(path) || path.includes("..")) {
    throw new Error("V4_REPOSITORY_BOUNDARY_INVALID");
  }
  const resolved = resolve(ROOT, normalize(path));
  if (resolved !== ROOT && !resolved.startsWith(`${ROOT}${sep}`)) {
    throw new Error("V4_REPOSITORY_BOUNDARY_INVALID");
  }
  return resolved;
}

function readJson(path) {
  return JSON.parse(readFileSync(repositoryFile(path), "utf8"));
}

function safeReadJson(path, issueCode, issues) {
  try {
    return readJson(path);
  } catch {
    issues.push({ code: issueCode });
    return null;
  }
}

function protectedInputPaths() {
  const protectedPaths = [
    MANIFEST_PATH,
    LEDGER_PATH,
    V3_PATH,
    REGISTRY_PATH,
    INDEX_PATH,
    POLICY_PATH,
  ].map(repositoryFile);
  const candidate = candidatePath();
  for (const entry of readdirSync(candidate, { recursive: true, withFileTypes: true })) {
    if (!entry.isFile() && !entry.isSymbolicLink()) continue;
    const path = join(entry.parentPath ?? entry.path, entry.name);
    if (path !== repositoryFile(REPORT_PATH)) protectedPaths.push(path);
  }
  return protectedPaths;
}

function sameInode(left, right) {
  const a = statSync(left);
  const b = statSync(right);
  return a.dev === b.dev && a.ino === b.ino;
}

function assertSafeReportPath() {
  const report = repositoryFile(REPORT_PATH);
  const parent = dirname(report);
  if (realpathSync(parent) !== parent) throw new Error("V4_REPORT_PATH_UNSAFE");
  if (!existsSync(report)) return report;
  const reportStat = lstatSync(report);
  if (reportStat.isSymbolicLink()) throw new Error("V4_REPORT_PATH_UNSAFE");
  for (const input of protectedInputPaths()) {
    if (existsSync(input) && sameInode(report, input)) throw new Error("V4_REPORT_PATH_UNSAFE");
  }
  return report;
}

function writeReport(report) {
  const path = assertSafeReportPath();
  const temporary = `${path}.tmp-${process.pid}`;
  try {
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(temporary, canonicalFile(report), { encoding: "utf8", flag: "wx" });
    renameSync(temporary, path);
  } finally {
    rmSync(temporary, { force: true });
  }
}

function deriveCandidateHash(manifest, ledger) {
  if (!manifest || typeof manifest !== "object" || !ledger || typeof ledger !== "object") return null;
  if (!Array.isArray(manifest.chunks) || typeof manifest.assemblyVersion !== "string") return null;
  try {
    const provenanceEdges = [];
    for (const chunk of manifest.chunks) {
      if (!chunk || typeof chunk !== "object" || typeof chunk.passageId !== "string" ||
          !Array.isArray(chunk.sourcePassageIds)) return null;
      for (const sourcePassageId of chunk.sourcePassageIds) {
        if (typeof sourcePassageId !== "string") return null;
        provenanceEdges.push({
          outputKnowledgeVersion: "ziwei.comprehensive.knowledge.v4",
          outputPassageId: chunk.passageId,
          sourceKnowledgeVersion: "ziwei.comprehensive.knowledge.v3",
          sourcePassageId,
        });
      }
    }
    return computeKnowledgeV4CandidateHash({
      chunks: manifest.chunks,
      provenanceEdges,
      dispositionLedgerHash: computeDispositionLedgerPayloadHash(ledger),
      assemblyVersion: manifest.assemblyVersion,
    });
  } catch {
    return null;
  }
}

function stableIssueList(issues) {
  const unique = new Map();
  for (const issue of issues) {
    const normalized = issue.passageId ? { code: issue.code, passageId: issue.passageId } : { code: issue.code };
    unique.set(JSON.stringify(normalized), normalized);
  }
  return [...unique.values()].sort((left, right) =>
    compare(left.code, right.code) || compare(left.passageId ?? "", right.passageId ?? ""));
}

function validationReport(manifest, ledger, issues) {
  const policy = safeReadJson(POLICY_PATH, "V4_POLICY_INVALID", issues);
  const candidateHash = deriveCandidateHash(manifest, ledger);
  const normalizedIssues = stableIssueList(issues);
  return {
    validationSchemaVersion: "ziwei.v4-validation-report.v1",
    candidateHash,
    policyVersion: typeof policy?.version === "string" ? policy.version : null,
    assemblyVersion: typeof manifest?.assemblyVersion === "string" ? manifest.assemblyVersion : null,
    status: normalizedIssues.length === 0 ? "passed" : "failed",
    ok: normalizedIssues.length === 0,
    issues: normalizedIssues,
  };
}

function hasChunks(manifest) {
  return Boolean(manifest && typeof manifest === "object" && Array.isArray(manifest.chunks));
}

function isRecordValidationFailure(result) {
  return !result.ok &&
    /^V4 chunk .+ violates V4_[A-Z0-9_]+$/.test(result.message);
}

function validateRecords(manifest, issues) {
  if (!hasChunks(manifest)) return;
  for (const chunk of manifest.chunks) {
    if (!chunk || typeof chunk !== "object" || typeof chunk.passageId !== "string") continue;
    const record = validateZiweiKnowledgeV4Record(chunk);
    if (!record.ok) {
      issues.push(...record.issues.map((issue) => ({
        code: issue.code,
        passageId: chunk.passageId,
      })));
    }
  }
}

function validate(candidateDir) {
  assertCanonicalCandidateDir(candidateDir);
  const issues = [];
  const manifest = safeReadJson(MANIFEST_PATH, "V4_CANDIDATE_JSON_INVALID", issues);
  const ledger = safeReadJson(LEDGER_PATH, "V4_LEDGER_JSON_INVALID", issues);
  validateRecords(manifest, issues);
  if (manifest && ledger) {
    const result = validateKnowledgeManifestV2(manifest, { repositoryRoot: ROOT });
    if (!result.ok && !isRecordValidationFailure(result)) {
      issues.push({ code: "V4_MANIFEST_SCHEMA_INVALID" });
    }
  }
  const report = validationReport(manifest, ledger, issues);
  writeReport(report);
  process.stdout.write(`${JSON.stringify({
    ok: report.ok,
    candidateHash: report.candidateHash,
    issueCount: report.issues.length,
  })}\n`);
  process.exitCode = report.ok ? 0 : 1;
}

function validateFinal(manifestPath) {
  assertCanonicalFinalManifest(manifestPath);
  const issues = [];
  const manifest = safeReadJson(FINAL_MANIFEST_PATH, "V4_FINAL_MANIFEST_JSON_INVALID", issues);
  const ledger = safeReadJson(LEDGER_PATH, "V4_LEDGER_JSON_INVALID", issues);
  validateRecords(manifest, issues);

  if (manifest && typeof manifest === "object") {
    if (manifest.dispositionLedgerPath !== LEDGER_PATH) {
      issues.push({ code: "V4_FINAL_LEDGER_PATH_NOT_CANONICAL" });
    }
    if (
      !manifest.approval ||
      typeof manifest.approval !== "object" ||
      manifest.approval.status !== "approved" ||
      typeof manifest.approval.approver !== "string" ||
      manifest.approval.approver.trim().length === 0 ||
      typeof manifest.approval.approvedAt !== "string" ||
      Number.isNaN(Date.parse(manifest.approval.approvedAt))
    ) {
      issues.push({ code: "V4_FINAL_APPROVAL_INVALID" });
    }
  }

  if (manifest && ledger) {
    const result = validateKnowledgeManifestV2(manifest, { repositoryRoot: ROOT });
    if (!result.ok && !isRecordValidationFailure(result)) {
      issues.push({ code: "V4_FINAL_MANIFEST_INVALID" });
    }
  }

  const normalizedIssues = stableIssueList(issues);
  const candidateHash = deriveCandidateHash(manifest, ledger);
  const ok = normalizedIssues.length === 0;
  process.stdout.write(`${JSON.stringify({
    ok,
    candidateHash,
    issueCount: normalizedIssues.length,
    recordCount: hasChunks(manifest) ? manifest.chunks.length : 0,
  })}\n`);
  process.exitCode = ok ? 0 : 1;
}

function main() {
  if (process.argv.length === 4 && process.argv[2] === "--candidate-dir") {
    validate(process.argv[3]);
    return;
  }
  if (process.argv.length === 4 && process.argv[2] === "--manifest") {
    validateFinal(process.argv[3]);
    return;
  }
  throw new Error(
    "Usage: node scripts/validate-ziwei-knowledge-v4.mjs --candidate-dir content/knowledge/vi/ziwei/v4-candidate | --manifest content/knowledge/vi/ziwei/comprehensive-report.v4.json",
  );
}

main();
