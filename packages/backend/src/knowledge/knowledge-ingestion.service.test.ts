import { createHash } from "node:crypto";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { describe, expect, it } from "vitest";

import {
  computeChunkContentHash,
  computeDocumentContentHash,
  KnowledgeManifestV1Schema,
  KnowledgeManifestV2Schema,
  V3DispositionLedgerV1Schema,
  validateKnowledgeManifest,
  validateKnowledgeManifestV2,
} from "./knowledge-ingestion.service.js";

const hash = "a".repeat(64);

function createV2CandidateFixture() {
  const repositoryRoot = mkdtempSync(join(tmpdir(), "lsv-16-v2-"));
  const sourcePath = "content/knowledge/vi/ziwei/v4-candidate/comprehensive-report.v4.candidate.json";
  const dispositionLedgerPath = "content/knowledge/vi/ziwei/v4-candidate/comprehensive-report.v4.disposition-ledger.json";
  const sourceFile = join(repositoryRoot, sourcePath);
  const ledgerFile = join(repositoryRoot, dispositionLedgerPath);
  mkdirSync(join(repositoryRoot, "content/knowledge/vi/ziwei/v4-candidate"), {
    recursive: true,
  });
  writeFileSync(sourceFile, "{}");

  const content = "Cung Mệnh có Tử Vi nên bạn thường chủ động sắp xếp các việc cần làm trong ngày.";
  const chunk = {
    passageId: "v4-001",
    reportSections: ["primary_evidence"],
    content,
    contentHash: computeChunkContentHash(content),
    metadata: {
      topics: ["example"],
      palaces: [],
      stars: [],
      brightness: [],
      transformations: [],
      relations: [],
      patterns: [],
      sourceType: "curated",
      languageOrigin: "vi",
      priority: 1,
    },
    sourcePassageIds: ["v3-001"],
    dispositionRationaleCode: "rewritten",
  };
  const candidateHash = "b".repeat(64);
  const ledger = {
    ledgerSchemaVersion: "ziwei.v3-disposition-ledger.v1",
    sourceKnowledgeVersion: "ziwei.comprehensive.knowledge.v3",
    outputKnowledgeVersion: "ziwei.comprehensive.knowledge.v4",
    candidateHash,
    entries: [{ sourcePassageId: "v3-001", disposition: "rewritten", outputPassageIds: ["v4-001"] }],
  };
  const ledgerSource = JSON.stringify(ledger);
  writeFileSync(ledgerFile, ledgerSource);
  const manifest = {
    documentId: "ziwei-comprehensive-report-vi",
    knowledgeVersion: "ziwei.comprehensive.knowledge.v4",
    discipline: "ziwei",
    locale: "vi",
    sourcePath,
    sourceAttribution: "Lá Số Việt Editorial Board",
    permittedUse: "reference_rewrite",
    contentHash: computeDocumentContentHash([chunk]),
    approval: { status: "draft", approver: "founder", approvedAt: "2026-09-16T00:00:00.000Z" },
    manifestSchemaVersion: "knowledge-manifest.v2",
    candidateHash,
    assemblyVersion: "ziwei-v4-assembler.v1",
    provenanceSchemaVersion: "knowledge-provenance.v1",
    dispositionLedgerPath,
    dispositionLedgerHash: computeChunkContentHash(ledgerSource),
    chunks: [chunk],
  };

  return {
    repositoryRoot,
    manifest,
    cleanup: () => rmSync(repositoryRoot, { recursive: true, force: true }),
  };
}

describe("knowledge ingestion V2 contracts", () => {
  it("accepts strict V2 candidate and disposition-ledger contracts", () => {
    const manifest = {
      documentId: "ziwei-comprehensive-report-vi",
      knowledgeVersion: "ziwei.comprehensive.knowledge.v4",
      discipline: "ziwei",
      locale: "vi",
      sourcePath: "content/knowledge/vi/ziwei/comprehensive-report.v4.json",
      sourceAttribution: "Lá Số Việt Editorial Board",
      permittedUse: "reference_rewrite",
      contentHash: hash,
      approval: { status: "draft", approver: "founder", approvedAt: "2026-09-16T00:00:00.000Z" },
      manifestSchemaVersion: "knowledge-manifest.v2",
      candidateHash: hash,
      assemblyVersion: "ziwei-v4-assembler.v1",
      provenanceSchemaVersion: "knowledge-provenance.v1",
      dispositionLedgerPath: "content/knowledge/vi/ziwei/v4-candidate/comprehensive-report.v4.disposition-ledger.json",
      dispositionLedgerHash: hash,
      chunks: [{
        passageId: "v4-001",
        reportSections: ["primary_evidence"],
        content: "Nội dung mẫu.",
        contentHash: hash,
        metadata: {
          topics: ["example"],
          palaces: [],
          stars: [],
          brightness: [],
          transformations: [],
          relations: [],
          patterns: [],
          sourceType: "curated",
          languageOrigin: "vi",
          priority: 1,
        },
        sourcePassageIds: ["v3-001"],
        dispositionRationaleCode: "rewritten",
      }],
    };
    expect(KnowledgeManifestV2Schema.safeParse(manifest).success).toBe(true);
    const withoutCanonicalMetadata = structuredClone(manifest);
    delete withoutCanonicalMetadata.chunks[0].metadata;
    expect(KnowledgeManifestV2Schema.safeParse(withoutCanonicalMetadata).success).toBe(false);
    expect(V3DispositionLedgerV1Schema.safeParse({
      ledgerSchemaVersion: "ziwei.v3-disposition-ledger.v1",
      sourceKnowledgeVersion: "ziwei.comprehensive.knowledge.v3",
      outputKnowledgeVersion: "ziwei.comprehensive.knowledge.v4",
      candidateHash: hash,
      entries: [{ sourcePassageId: "v3-001", disposition: "rewritten", outputPassageIds: ["v4-001"] }],
    }).success).toBe(true);
  });

  it("validates a repository-bounded V2 candidate and reconciled provenance ledger", () => {
    const fixture = createV2CandidateFixture();
    try {
      const result = validateKnowledgeManifestV2(fixture.manifest, {
        repositoryRoot: fixture.repositoryRoot,
      });
      expect(result).toMatchObject({ ok: true });
      if (result.ok) {
        expect(result.provenanceEdges).toEqual([{
          outputKnowledgeVersion: "ziwei.comprehensive.knowledge.v4",
          outputPassageId: "v4-001",
          sourceKnowledgeVersion: "ziwei.comprehensive.knowledge.v3",
          sourcePassageId: "v3-001",
        }]);
      }
    } finally {
      fixture.cleanup();
    }
  });

  it("rejects missing, mismatched, out-of-root, and unreconciled V2 ledgers", () => {
    const fixture = createV2CandidateFixture();
    try {
      const options = { repositoryRoot: fixture.repositoryRoot };
      expect(validateKnowledgeManifestV2({
        ...fixture.manifest,
        dispositionLedgerPath: "content/knowledge/vi/ziwei/v4-candidate/missing.json",
      }, options).ok).toBe(false);
      expect(validateKnowledgeManifestV2({
        ...fixture.manifest,
        dispositionLedgerPath: "../outside.json",
      }, options).ok).toBe(false);
      expect(validateKnowledgeManifestV2({
        ...fixture.manifest,
        dispositionLedgerHash: "d".repeat(64),
      }, options).ok).toBe(false);

      const candidateMismatch = structuredClone(fixture.manifest);
      const ledgerPath = join(fixture.repositoryRoot, candidateMismatch.dispositionLedgerPath);
      writeFileSync(ledgerPath, JSON.stringify({
        ledgerSchemaVersion: "ziwei.v3-disposition-ledger.v1",
        sourceKnowledgeVersion: "ziwei.comprehensive.knowledge.v3",
        outputKnowledgeVersion: "ziwei.comprehensive.knowledge.v4",
        candidateHash: "c".repeat(64),
        entries: [{ sourcePassageId: "v3-001", disposition: "rewritten", outputPassageIds: ["v4-001"] }],
      }));
      candidateMismatch.dispositionLedgerHash = computeChunkContentHash(
        readFileSync(ledgerPath, "utf8"),
      );
      expect(validateKnowledgeManifestV2(candidateMismatch, options).ok).toBe(false);

      const unreconciled = structuredClone(fixture.manifest);
      writeFileSync(ledgerPath, JSON.stringify({
        ledgerSchemaVersion: "ziwei.v3-disposition-ledger.v1",
        sourceKnowledgeVersion: "ziwei.comprehensive.knowledge.v3",
        outputKnowledgeVersion: "ziwei.comprehensive.knowledge.v4",
        candidateHash: unreconciled.candidateHash,
        entries: [{ sourcePassageId: "v3-001", disposition: "rewritten", outputPassageIds: ["v4-missing"] }],
      }));
      unreconciled.dispositionLedgerHash = computeChunkContentHash(
        readFileSync(ledgerPath, "utf8"),
      );
      expect(validateKnowledgeManifestV2(unreconciled, options).ok).toBe(false);
    } finally {
      fixture.cleanup();
    }
  });

  it("preserves V1 strict parsing and validation behavior", () => {
    const content = "Nội dung mẫu.";
    const contentHash = createHash("sha256").update(content).digest("hex");
    const v1 = {
      documentId: "ziwei-identity-foundation-vi",
      knowledgeVersion: "ziwei.identity.knowledge.v1",
      discipline: "ziwei",
      locale: "vi",
      sourcePath: "README.md",
      sourceAttribution: "Editorial Board",
      permittedUse: "first_party",
      contentHash,
      approval: { status: "approved", approver: "reviewer", approvedAt: "2026-09-16T00:00:00.000Z" },
      chunks: [{
        passageId: "v1-001",
        reportSections: ["primary_evidence"],
        content,
        contentHash,
      }],
    };
    expect(KnowledgeManifestV1Schema.safeParse(v1).success).toBe(true);
    expect(KnowledgeManifestV1Schema.safeParse({ ...v1, candidateHash: hash }).success).toBe(false);
    expect(validateKnowledgeManifest(v1, { repositoryRoot: process.cwd() })).toMatchObject({ ok: true });

    const fixture = createV2CandidateFixture();
    try {
      expect(validateKnowledgeManifest(fixture.manifest, {
        repositoryRoot: fixture.repositoryRoot,
      })).toMatchObject({ ok: false, code: "KNOWLEDGE_METADATA_INVALID" });
    } finally {
      fixture.cleanup();
    }
  });
});
