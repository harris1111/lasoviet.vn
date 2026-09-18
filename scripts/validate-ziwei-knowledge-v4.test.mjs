import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { cpSync, linkSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import test from "node:test";
import {
  computeChunkContentHash,
  computeDispositionLedgerPayloadHash,
  computeDocumentContentHash,
  computeKnowledgeV4CandidateHash,
} from "../packages/backend/dist/knowledge/knowledge-ingestion.service.js";
import { validateZiweiKnowledgeV4Record } from "../packages/backend/dist/knowledge/ziwei-knowledge-v4-validator.js";

const root = process.cwd();
const validate = join(root, "scripts/validate-ziwei-knowledge-v4.mjs");
const candidateRelative = "content/knowledge/vi/ziwei/v4-candidate";
const manifestRelative = `${candidateRelative}/comprehensive-report.v4.candidate.json`;
const ledgerRelative = `${candidateRelative}/comprehensive-report.v4.disposition-ledger.json`;
const reportRelative = `${candidateRelative}/comprehensive-report.v4.validation.json`;
const v3Relative = "content/knowledge/vi/ziwei/comprehensive-report.v3.json";
const finalManifestRelative = "content/knowledge/vi/ziwei/comprehensive-report.v4.json";
const registryRelative = "content/knowledge/ziwei/comprehensive-report-sources.v3.json";
const indexRelative = `${candidateRelative}/work-index.v1.json`;
const policyRelative = "config/ziwei-knowledge-v4-validation.v1.json";

function sha256(path) {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

function temporaryRepository() {
  const temporary = mkdtempSync(join(tmpdir(), "lsv-16-v4-validation-"));
  cpSync(join(root, "content"), join(temporary, "content"), { recursive: true });
  cpSync(join(root, "config"), join(temporary, "config"), { recursive: true });
  return temporary;
}

function run(temporary, candidateDir = candidateRelative) {
  return spawnSync(process.execPath, [validate, "--candidate-dir", candidateDir], {
    cwd: root,
    encoding: "utf8",
    env: { ...process.env, LSV_KNOWLEDGE_ROOT: temporary },
  });
}

function runFinal(temporary, manifestPath = finalManifestRelative) {
  return spawnSync(process.execPath, [validate, "--manifest", manifestPath], {
    cwd: root,
    encoding: "utf8",
    env: { ...process.env, LSV_KNOWLEDGE_ROOT: temporary },
  });
}

function protectedArtifactHashes(temporary) {
  return Object.fromEntries([
    manifestRelative,
    ledgerRelative,
    reportRelative,
    finalManifestRelative,
    v3Relative,
    registryRelative,
    indexRelative,
    policyRelative,
  ].map((relativePath) => [relativePath, sha256(join(temporary, relativePath))]));
}

function rebuildCandidateHashes(manifest, ledger) {
  manifest.contentHash = computeDocumentContentHash(manifest.chunks);
  manifest.dispositionLedgerHash = computeDispositionLedgerPayloadHash(ledger);
  const provenanceEdges = manifest.chunks.flatMap((chunk) =>
    chunk.sourcePassageIds.map((sourcePassageId) => ({
      outputKnowledgeVersion: manifest.knowledgeVersion,
      outputPassageId: chunk.passageId,
      sourceKnowledgeVersion: ledger.sourceKnowledgeVersion,
      sourcePassageId,
    })),
  );
  const candidateHash = computeKnowledgeV4CandidateHash({
    chunks: manifest.chunks,
    provenanceEdges,
    dispositionLedgerHash: manifest.dispositionLedgerHash,
    assemblyVersion: manifest.assemblyVersion,
  });
  manifest.candidateHash = candidateHash;
  ledger.candidateHash = candidateHash;
}

test("validation replaces pending status with deterministic canonical evidence", () => {
  const temporary = temporaryRepository();
  try {
    const first = run(temporary);
    const reportPath = join(temporary, reportRelative);
    const firstReport = readFileSync(reportPath, "utf8");
    const report = JSON.parse(firstReport);
    assert.equal(first.status, report.ok ? 0 : 1);
    assert.deepEqual(JSON.parse(first.stdout), {
      ok: report.ok,
      candidateHash: report.candidateHash,
      issueCount: report.issues.length,
    });
    assert.ok(["passed", "failed"].includes(report.status));
    assert.equal(report.status, report.ok ? "passed" : "failed");
    assert.match(report.candidateHash, /^[0-9a-f]{64}$/);
    assert.equal(report.policyVersion, JSON.parse(readFileSync(join(temporary, "config/ziwei-knowledge-v4-validation.v1.json"), "utf8")).version);
    assert.equal(report.assemblyVersion, "ziwei-v4-assembler.v1");
    const second = run(temporary);
    assert.equal(second.status, first.status);
    assert.equal(readFileSync(reportPath, "utf8"), firstReport);
  } finally {
    rmSync(temporary, { recursive: true, force: true });
  }
});

test("malformed and tampered candidates persist deterministic failure evidence without input mutation", () => {
  const temporary = temporaryRepository();
  try {
    const manifestPath = join(temporary, manifestRelative);
    const ledgerPath = join(temporary, ledgerRelative);
    const v3Path = join(temporary, v3Relative);
    const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
    const expectedCandidateHash = manifest.candidateHash;
    manifest.candidateHash = "0".repeat(64);
    writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
    const before = {
      manifest: sha256(manifestPath),
      ledger: sha256(ledgerPath),
      v3: sha256(v3Path),
    };
    const first = run(temporary);
    assert.equal(first.status, 1);
    assert.deepEqual(JSON.parse(first.stdout), {
      ok: false,
      candidateHash: expectedCandidateHash,
      issueCount: 1,
    });
    const reportPath = join(temporary, reportRelative);
    const firstReport = readFileSync(reportPath, "utf8");
    const report = JSON.parse(firstReport);
    assert.equal(report.status, "failed");
    assert.equal(report.ok, false);
    assert.equal(report.candidateHash, expectedCandidateHash);
    assert.deepEqual(report.issues, [{ code: "V4_MANIFEST_SCHEMA_INVALID" }]);
    assert.deepEqual({
      manifest: sha256(manifestPath),
      ledger: sha256(ledgerPath),
      v3: sha256(v3Path),
    }, before);
    const second = run(temporary);
    assert.equal(second.status, 1);
    assert.equal(readFileSync(reportPath, "utf8"), firstReport);
    writeFileSync(ledgerPath, "{ malformed");
    const malformed = run(temporary);
    assert.equal(malformed.status, 1);
    assert.deepEqual(JSON.parse(malformed.stdout), {
      ok: false,
      candidateHash: null,
      issueCount: 1,
    });
    assert.deepEqual(JSON.parse(readFileSync(reportPath, "utf8")).issues, [{ code: "V4_LEDGER_JSON_INVALID" }]);
  } finally {
    rmSync(temporary, { recursive: true, force: true });
  }
});

test("malformed candidate JSON persists failure evidence without mutating protected inputs", () => {
  const temporary = temporaryRepository();
  try {
    const manifestPath = join(temporary, manifestRelative);
    const ledgerPath = join(temporary, ledgerRelative);
    const v3Path = join(temporary, v3Relative);
    writeFileSync(manifestPath, "{ malformed");
    const before = {
      manifest: sha256(manifestPath),
      ledger: sha256(ledgerPath),
      v3: sha256(v3Path),
    };
    const result = run(temporary);
    assert.equal(result.status, 1);
    assert.deepEqual(JSON.parse(result.stdout), {
      ok: false,
      candidateHash: null,
      issueCount: 1,
    });
    const report = JSON.parse(readFileSync(join(temporary, reportRelative), "utf8"));
    assert.equal(report.status, "failed");
    assert.equal(report.candidateHash, null);
    assert.deepEqual(report.issues, [{ code: "V4_CANDIDATE_JSON_INVALID" }]);
    assert.deepEqual({
      manifest: sha256(manifestPath),
      ledger: sha256(ledgerPath),
      v3: sha256(v3Path),
    }, before);
  } finally {
    rmSync(temporary, { recursive: true, force: true });
  }
});

test("alternate and symlink candidate paths reject before any report write", () => {
  const temporary = temporaryRepository();
  try {
    const reportPath = join(temporary, reportRelative);
    const before = sha256(reportPath);
    assert.equal(run(temporary, `${candidateRelative}/.`).status, 1);
    assert.equal(run(temporary, "content/knowledge/vi/ziwei/other").status, 1);
    const alias = join(temporary, "candidate-alias");
    symlinkSync(join(temporary, candidateRelative), alias);
    assert.equal(run(temporary, "candidate-alias").status, 1);
    assert.equal(sha256(reportPath), before);
  } finally {
    rmSync(temporary, { recursive: true, force: true });
  }
});

test("hard-linked report is rejected and protected input remains unchanged", () => {
  const temporary = temporaryRepository();
  try {
    const reportPath = join(temporary, reportRelative);
    const manifestPath = join(temporary, manifestRelative);
    const before = sha256(manifestPath);
    rmSync(reportPath);
    linkSync(manifestPath, reportPath);
    const result = run(temporary);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /V4_REPORT_PATH_UNSAFE/);
    assert.equal(sha256(manifestPath), before);
    assert.equal(readFileSync(reportPath, "utf8"), readFileSync(manifestPath, "utf8"));
  } finally {
    rmSync(temporary, { recursive: true, force: true });
  }
});

test("policy-invalid records retain distinct passage identities when V2 rejects the candidate", () => {
  const temporary = temporaryRepository();
  try {
    const manifestPath = join(temporary, manifestRelative);
    const ledgerPath = join(temporary, ledgerRelative);
    const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
    const ledger = JSON.parse(readFileSync(ledgerPath, "utf8"));
    const selectedChunks = manifest.chunks.slice(0, 2);
    for (const chunk of selectedChunks) {
      chunk.content = `${chunk.content} Template này không dùng cho nội dung gửi khách.`;
      chunk.contentHash = computeChunkContentHash(chunk.content);
    }
    rebuildCandidateHashes(manifest, ledger);
    writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
    writeFileSync(ledgerPath, `${JSON.stringify(ledger, null, 2)}\n`);

    const result = run(temporary);
    assert.equal(result.status, 1);
    const report = JSON.parse(readFileSync(join(temporary, reportRelative), "utf8"));
    assert.ok(report.issues.every((issue) =>
      issue.code === "V4_MANIFEST_SCHEMA_INVALID" || typeof issue.passageId === "string"));
    assert.equal(report.issues.some((issue) => issue.code === "V4_MANIFEST_SCHEMA_INVALID"), false);
    const expectedRecordIssues = manifest.chunks.flatMap((chunk) => {
      const validation = validateZiweiKnowledgeV4Record(chunk);
      return validation.ok ? [] : validation.issues.map((issue) => ({
        code: issue.code,
        passageId: chunk.passageId,
      }));
    });
    const processIssues = report.issues.filter((issue) => issue.code === "V4_PROCESS_TERM_PROHIBITED");
    assert.deepEqual(
      processIssues.filter((issue) => selectedChunks.some((chunk) => chunk.passageId === issue.passageId)),
      selectedChunks.map((chunk) => ({
        code: "V4_PROCESS_TERM_PROHIBITED",
        passageId: chunk.passageId,
      })).sort((left, right) => left.passageId.localeCompare(right.passageId)),
    );
    for (const issue of expectedRecordIssues) {
      assert.ok(report.issues.some((candidate) =>
        candidate.code === issue.code && candidate.passageId === issue.passageId));
    }
  } finally {
    rmSync(temporary, { recursive: true, force: true });
  }
});

test("final manifest mode validates the founder-approved frozen corpus without mutation", () => {
  const temporary = temporaryRepository();
  try {
    const before = protectedArtifactHashes(temporary);
    const result = runFinal(temporary);
    assert.equal(result.status, 0);
    assert.deepEqual(JSON.parse(result.stdout), {
      ok: true,
      candidateHash: "ce3d9ad69e8dc924f55fe085b9719cbb9067738c03e67b4fd54f021cb3ac8b70",
      issueCount: 0,
      recordCount: 441,
    });
    assert.deepEqual(protectedArtifactHashes(temporary), before);
  } finally {
    rmSync(temporary, { recursive: true, force: true });
  }
});

test("final manifest mode rejects unapproved and tampered copies without mutation", () => {
  const temporary = temporaryRepository();
  try {
    const finalPath = join(temporary, finalManifestRelative);
    const before = protectedArtifactHashes(temporary);
    const mutateAndReject = (mutate) => {
      const manifest = JSON.parse(readFileSync(finalPath, "utf8"));
      mutate(manifest);
      writeFileSync(finalPath, `${JSON.stringify(manifest, null, 2)}\n`);
      const result = runFinal(temporary);
      assert.equal(result.status, 1);
      const summary = JSON.parse(result.stdout);
      assert.equal(summary.ok, false);
      assert.ok(summary.issueCount > 0);
      assert.equal(summary.recordCount, 441);
      assert.equal(sha256(join(temporary, manifestRelative)), before[manifestRelative]);
      assert.equal(sha256(join(temporary, ledgerRelative)), before[ledgerRelative]);
      assert.equal(sha256(join(temporary, reportRelative)), before[reportRelative]);
      writeFileSync(finalPath, readFileSync(join(root, finalManifestRelative)));
    };

    mutateAndReject((manifest) => {
      manifest.approval.status = "draft";
    });
    mutateAndReject((manifest) => {
      manifest.approval.status = "rejected";
    });
    mutateAndReject((manifest) => {
      manifest.approval.approver = " ";
    });
    mutateAndReject((manifest) => {
      manifest.chunks[0].content = `${manifest.chunks[0].content} tampered`;
    });
    assert.deepEqual(protectedArtifactHashes(temporary), before);
  } finally {
    rmSync(temporary, { recursive: true, force: true });
  }
});

test("final manifest mode rejects noncanonical and symlink paths before reads or writes", () => {
  const temporary = temporaryRepository();
  try {
    const before = protectedArtifactHashes(temporary);
    assert.equal(runFinal(temporary, `${finalManifestRelative}/.`).status, 1);
    assert.equal(runFinal(temporary, `../${finalManifestRelative}`).status, 1);
    assert.equal(runFinal(temporary, join(temporary, finalManifestRelative)).status, 1);
    const finalPath = join(temporary, finalManifestRelative);
    const target = join(temporary, `${finalManifestRelative}.target`);
    cpSync(finalPath, target);
    rmSync(finalPath);
    symlinkSync(target, finalPath);
    const result = runFinal(temporary);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /V4_FINAL_MANIFEST_NOT_CANONICAL/);
    rmSync(finalPath);
    cpSync(target, finalPath);
    assert.deepEqual(protectedArtifactHashes(temporary), before);
  } finally {
    rmSync(temporary, { recursive: true, force: true });
  }
});
