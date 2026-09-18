import { createHash } from "node:crypto";
import {
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { PostgreSqlContainer } from "@testcontainers/postgresql";
import {
  createDatabase,
  knowledgeChunkProvenanceEdges,
  knowledgeChunks,
  knowledgeDocuments,
  runMigrations,
} from "@lasoviet/database";
import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import {
  canonicalizeKnowledgeEditorialChunks,
  canonicalizeKnowledgeProvenanceEdges,
  canonicalizeV3DispositionLedgerPayload,
  computeChunkContentHash,
  computeDispositionLedgerPayloadHash,
  computeDocumentContentHash,
  computeKnowledgeProvenanceEdgeId,
  computeKnowledgeV4CandidateHash,
  createKnowledgeIngestionService,
  KnowledgeManifestV1Schema,
  KnowledgeManifestV2Schema,
  V3DispositionLedgerV1Schema,
  validateKnowledgeManifest,
  validateKnowledgeManifestV2,
  type KnowledgeManifestV2,
  type KnowledgeProvenanceEdgeV1,
  type V3DispositionLedgerV1,
} from "./knowledge-ingestion.service.js";

const hash = "a".repeat(64);

function deriveFixtureEdges(
  manifest: KnowledgeManifestV2,
): KnowledgeProvenanceEdgeV1[] {
  return manifest.chunks.flatMap((chunk) =>
    chunk.sourcePassageIds.map((sourcePassageId) => ({
      outputKnowledgeVersion: "ziwei.comprehensive.knowledge.v4" as const,
      outputPassageId: chunk.passageId,
      sourceKnowledgeVersion: "ziwei.comprehensive.knowledge.v3" as const,
      sourcePassageId,
    })),
  );
}

function synchronizeCandidateFixture(
  repositoryRoot: string,
  manifest: KnowledgeManifestV2,
  ledger: V3DispositionLedgerV1,
): void {
  manifest.dispositionLedgerHash = computeDispositionLedgerPayloadHash(ledger);
  const candidateHash = computeKnowledgeV4CandidateHash({
    chunks: manifest.chunks,
    provenanceEdges: deriveFixtureEdges(manifest),
    dispositionLedgerHash: manifest.dispositionLedgerHash,
    assemblyVersion: manifest.assemblyVersion,
  });
  manifest.candidateHash = candidateHash;
  ledger.candidateHash = candidateHash;
  writeFileSync(
    join(repositoryRoot, manifest.dispositionLedgerPath),
    JSON.stringify(ledger),
  );
}

function createV2CandidateFixture() {
  const repositoryRoot = mkdtempSync(join(tmpdir(), "lsv-16-v2-"));
  const sourcePath = "content/knowledge/vi/ziwei/v4-candidate/comprehensive-report.v4.candidate.json";
  const dispositionLedgerPath = "content/knowledge/vi/ziwei/v4-candidate/comprehensive-report.v4.disposition-ledger.json";
  const sourceFile = join(repositoryRoot, sourcePath);
  const canonicalV3ManifestPath = join(
    repositoryRoot,
    "content/knowledge/vi/ziwei/comprehensive-report.v3.json",
  );
  const canonicalV3SourcePath = "content/knowledge/vi/ziwei/v3-source.json";
  mkdirSync(join(repositoryRoot, "content/knowledge/vi/ziwei/v4-candidate"), {
    recursive: true,
  });
  writeFileSync(sourceFile, "{}");
  writeFileSync(join(repositoryRoot, canonicalV3SourcePath), "{}");

  const v3Chunks = [
    {
      passageId: "v3-001",
      reportSections: ["primary_evidence"],
      content: "V3 source content one.",
      contentHash: computeChunkContentHash("V3 source content one."),
    },
    {
      passageId: "v3-002",
      reportSections: ["primary_evidence"],
      content: "V3 source content two.",
      contentHash: computeChunkContentHash("V3 source content two."),
    },
  ];
  writeFileSync(canonicalV3ManifestPath, JSON.stringify({
    documentId: "ziwei-comprehensive-report-vi",
    knowledgeVersion: "ziwei.comprehensive.knowledge.v3",
    discipline: "ziwei",
    locale: "vi",
    sourcePath: canonicalV3SourcePath,
    sourceAttribution: "Lá Số Việt Editorial Board",
    permittedUse: "reference_rewrite",
    contentHash: computeDocumentContentHash(v3Chunks),
    approval: {
      status: "approved",
      approver: "founder",
      approvedAt: "2026-09-16T00:00:00.000Z",
    },
    chunks: v3Chunks,
  }));

  const content = [
    "Cung Mệnh có Tử Vi thường gợi ý cách bạn chủ động sắp xếp trách nhiệm và giữ nhịp sinh hoạt có trật tự.",
    "Khi trao đổi với người trong gia đình, bạn nên nói rõ điều mình cần để việc phối hợp trong ngày thuận hơn.",
  ].join(" ");
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
  const ledger: V3DispositionLedgerV1 = {
    ledgerSchemaVersion: "ziwei.v3-disposition-ledger.v1",
    sourceKnowledgeVersion: "ziwei.comprehensive.knowledge.v3",
    outputKnowledgeVersion: "ziwei.comprehensive.knowledge.v4",
    candidateHash: "0".repeat(64),
    entries: [
      { sourcePassageId: "v3-001", disposition: "rewritten", outputPassageIds: ["v4-001"] },
      { sourcePassageId: "v3-002", disposition: "omitted_oral_filler", outputPassageIds: [] },
    ],
  };
  const manifest: KnowledgeManifestV2 = {
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
    candidateHash: "0".repeat(64),
    assemblyVersion: "ziwei-v4-assembler.v1",
    provenanceSchemaVersion: "knowledge-provenance.v1",
    dispositionLedgerPath,
    dispositionLedgerHash: computeDispositionLedgerPayloadHash(ledger),
    chunks: [chunk],
  };
  synchronizeCandidateFixture(repositoryRoot, manifest, ledger);

  return {
    repositoryRoot,
    manifest,
    ledger,
    cleanup: () => rmSync(repositoryRoot, { recursive: true, force: true }),
  };
}

function replaceFixtureChunkContent(
  fixture: ReturnType<typeof createV2CandidateFixture>,
  content: string,
): void {
  fixture.manifest.chunks[0].content = content;
  fixture.manifest.chunks[0].contentHash = computeChunkContentHash(content);
  fixture.manifest.contentHash = computeDocumentContentHash(fixture.manifest.chunks);
  synchronizeCandidateFixture(
    fixture.repositoryRoot,
    fixture.manifest,
    fixture.ledger,
  );
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
      candidateMismatch.dispositionLedgerHash = computeDispositionLedgerPayloadHash({
        ledgerSchemaVersion: "ziwei.v3-disposition-ledger.v1",
        sourceKnowledgeVersion: "ziwei.comprehensive.knowledge.v3",
        outputKnowledgeVersion: "ziwei.comprehensive.knowledge.v4",
        candidateHash: "c".repeat(64),
        entries: [{ sourcePassageId: "v3-001", disposition: "rewritten", outputPassageIds: ["v4-001"] }],
      });
      const candidateMismatchResult = validateKnowledgeManifestV2(candidateMismatch, options);
      expect(candidateMismatchResult).toMatchObject({
        ok: false,
        message: "Disposition ledger candidate hash mismatch",
      });

      const arbitraryMatchingHash = structuredClone(fixture.manifest);
      const arbitraryLedger = structuredClone(fixture.ledger);
      arbitraryMatchingHash.candidateHash = "c".repeat(64);
      arbitraryLedger.candidateHash = arbitraryMatchingHash.candidateHash;
      writeFileSync(ledgerPath, JSON.stringify(arbitraryLedger));
      expect(validateKnowledgeManifestV2(
        arbitraryMatchingHash,
        options,
      )).toMatchObject({
        ok: false,
        message: "Candidate hash mismatch",
      });

      const unreconciled = structuredClone(fixture.manifest);
      writeFileSync(ledgerPath, JSON.stringify({
        ledgerSchemaVersion: "ziwei.v3-disposition-ledger.v1",
        sourceKnowledgeVersion: "ziwei.comprehensive.knowledge.v3",
        outputKnowledgeVersion: "ziwei.comprehensive.knowledge.v4",
        candidateHash: unreconciled.candidateHash,
        entries: [{ sourcePassageId: "v3-001", disposition: "rewritten", outputPassageIds: ["v4-missing"] }],
      }));
      unreconciled.dispositionLedgerHash = computeDispositionLedgerPayloadHash({
        ledgerSchemaVersion: "ziwei.v3-disposition-ledger.v1",
        sourceKnowledgeVersion: "ziwei.comprehensive.knowledge.v3",
        outputKnowledgeVersion: "ziwei.comprehensive.knowledge.v4",
        candidateHash: unreconciled.candidateHash,
        entries: [{ sourcePassageId: "v3-001", disposition: "rewritten", outputPassageIds: ["v4-missing"] }],
      });
      expect(validateKnowledgeManifestV2(unreconciled, options).ok).toBe(false);
    } finally {
      fixture.cleanup();
    }
  });

  it("rejects policy-invalid V4 records before a manifest can be ingested", () => {
    const cases = [
      "Cung Mệnh có Tử Vi thường gợi ý cách bạn chủ động sắp xếp trách nhiệm. Bạn không nên dự đoán chết.",
      "Cung Mệnh có Tử Vi thường gợi ý cách bạn chủ động sắp xếp trách nhiệm. Từ identifier không thuộc nội dung này.",
      "Trong đại vận này, chuyện tiền bạc cần lưu ý vì cung Tài Bạch. Bạn dễ gặp lời rủ rê đầu tư.",
    ];
    for (const content of cases) {
      const fixture = createV2CandidateFixture();
      try {
        replaceFixtureChunkContent(fixture, content);
        expect(validateKnowledgeManifestV2(fixture.manifest, {
          repositoryRoot: fixture.repositoryRoot,
        })).toMatchObject({
          ok: false,
          code: "KNOWLEDGE_METADATA_INVALID",
          message: expect.stringMatching(/^V4 chunk v4-001 violates V4_/u),
        });
      } finally {
        fixture.cleanup();
      }
    }
  });

  it("requires exact canonical V3 ledger coverage, including omitted sources", () => {
    const fixture = createV2CandidateFixture();
    try {
      expect(validateKnowledgeManifestV2(fixture.manifest, {
        repositoryRoot: fixture.repositoryRoot,
      })).toMatchObject({ ok: true });

      const forgedLedger = structuredClone(fixture.ledger);
      forgedLedger.entries[1] = {
        sourcePassageId: "v3-forged",
        disposition: "omitted_oral_filler",
        outputPassageIds: [],
      };
      synchronizeCandidateFixture(
        fixture.repositoryRoot,
        fixture.manifest,
        forgedLedger,
      );
      expect(validateKnowledgeManifestV2(fixture.manifest, {
        repositoryRoot: fixture.repositoryRoot,
      })).toMatchObject({
        ok: false,
        message: "Disposition ledger does not cover the canonical V3 passage set",
      });
    } finally {
      fixture.cleanup();
    }
  });

  it("hashes canonical ledger payload without the candidateHash envelope", () => {
    const ledger = {
      ledgerSchemaVersion: "ziwei.v3-disposition-ledger.v1" as const,
      sourceKnowledgeVersion: "ziwei.comprehensive.knowledge.v3" as const,
      outputKnowledgeVersion: "ziwei.comprehensive.knowledge.v4" as const,
      candidateHash: "b".repeat(64),
      entries: [{ sourcePassageId: "v3-001", disposition: "rewritten" as const, outputPassageIds: ["v4-001"] }],
    };
    expect(computeDispositionLedgerPayloadHash({
      ...ledger,
      candidateHash: "c".repeat(64),
    })).toBe(computeDispositionLedgerPayloadHash(ledger));
    expect(computeDispositionLedgerPayloadHash({
      ...ledger,
      entries: [
        { sourcePassageId: "v3-002", disposition: "rewritten", outputPassageIds: ["v4-003", "v4-002"] },
        ...ledger.entries,
      ],
    })).toBe(computeDispositionLedgerPayloadHash({
      ...ledger,
      entries: [
        ...ledger.entries,
        { sourcePassageId: "v3-002", disposition: "rewritten", outputPassageIds: ["v4-002", "v4-003"] },
      ],
    }));
    expect(computeDispositionLedgerPayloadHash({
      ...ledger,
      entries: [{ sourcePassageId: "v3-001", disposition: "rewritten", outputPassageIds: ["v4-002"] }],
    })).not.toBe(computeDispositionLedgerPayloadHash(ledger));
  });

  it("canonicalizes chunks, edges, and ledger payload before candidate hashing", () => {
    const fixture = createV2CandidateFixture();
    try {
      const chunk = structuredClone(fixture.manifest.chunks[0]);
      chunk.metadata.topics = ["z-topic", "a-topic"];
      chunk.sourcePassageIds = ["v3-002", "v3-001"];
      const canonicalChunks = canonicalizeKnowledgeEditorialChunks([
        { ...chunk, passageId: "v4-002" },
        chunk,
      ]);
      expect(canonicalChunks.map((entry) => entry.passageId)).toEqual([
        "v4-001",
        "v4-002",
      ]);
      expect(canonicalChunks[0]?.metadata.topics).toEqual(["a-topic", "z-topic"]);
      expect(canonicalChunks[0]?.sourcePassageIds).toEqual(["v3-001", "v3-002"]);

      const edges = deriveFixtureEdges(fixture.manifest);
      expect(canonicalizeKnowledgeProvenanceEdges([...edges].reverse())).toEqual(
        canonicalizeKnowledgeProvenanceEdges(edges),
      );
      expect(canonicalizeV3DispositionLedgerPayload({
        ...fixture.ledger,
        entries: [...fixture.ledger.entries].reverse(),
      })).toEqual(canonicalizeV3DispositionLedgerPayload(fixture.ledger));
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

describe("knowledge ingestion V4 persistence", () => {
  let container: Awaited<ReturnType<PostgreSqlContainer["start"]>> | undefined;
  let databaseUrl: string;

  it("rejects a draft V4 candidate before touching persistence", async () => {
    const fixture = createV2CandidateFixture();
    try {
      const service = createKnowledgeIngestionService({
        database: {} as ReturnType<typeof createDatabase>,
        repositoryRoot: fixture.repositoryRoot,
      });
      await expect(service.ingestKnowledge(fixture.manifest)).resolves.toMatchObject({
        ok: false,
        code: "KNOWLEDGE_UNAPPROVED",
      });
    } finally {
      fixture.cleanup();
    }
  });

  it("persists approved V4 chunks and provenance edges atomically and reuses exact replay", async () => {
    container = await new PostgreSqlContainer("postgres:16-alpine")
      .withDatabase("lasoviet_knowledge_ingestion_v4_test")
      .withUsername("lasoviet")
      .withPassword("lasoviet")
      .start();
    databaseUrl = container.getConnectionUri();
    await runMigrations(databaseUrl);
    const database = createDatabase(databaseUrl);
    const fixture = createV2CandidateFixture();

    try {
      await database.insert(knowledgeDocuments).values({
        id: "v3-source-document",
        documentId: "v3-source-document",
        knowledgeVersion: "ziwei.comprehensive.knowledge.v3",
        discipline: "ziwei",
        locale: "vi",
        sourcePath: "v3-source.json",
        sourceAttribution: "Test",
        permittedUse: "first_party",
        contentHash: "e".repeat(64),
        approvalStatus: "approved",
        approvedBy: "test",
        approvedAt: new Date("2026-09-17T00:00:00Z"),
      });
      await database.insert(knowledgeChunks).values({
        id: "v3-source-document:v3-001",
        passageId: "v3-001",
        documentId: "v3-source-document",
        knowledgeVersion: "ziwei.comprehensive.knowledge.v3",
        discipline: "ziwei",
        locale: "vi",
        reportSections: ["primary_evidence"],
        content: "V3 source content.",
        contentHash: "f".repeat(64),
        sourceAttribution: "Test",
        permittedUse: "first_party",
        metadata: {},
      });
      fixture.manifest.approval.status = "approved";
      const service = createKnowledgeIngestionService({
        database,
        repositoryRoot: fixture.repositoryRoot,
      });

      const v3DocumentsBefore = await database
        .select()
        .from(knowledgeDocuments)
        .where(eq(
          knowledgeDocuments.knowledgeVersion,
          "ziwei.comprehensive.knowledge.v3",
        ));
      const v3ChunksBefore = await database
        .select()
        .from(knowledgeChunks)
        .where(eq(
          knowledgeChunks.knowledgeVersion,
          "ziwei.comprehensive.knowledge.v3",
        ));

      const concurrentResults = await Promise.all([
        service.ingestKnowledge(fixture.manifest),
        service.ingestKnowledge(fixture.manifest),
      ]);
      expect(concurrentResults).toEqual(expect.arrayContaining([
        expect.objectContaining({ ok: true, chunkCount: 1, reused: false }),
        expect.objectContaining({ ok: true, chunkCount: 1, reused: true }),
      ]));
      const edges = await database.select().from(knowledgeChunkProvenanceEdges);
      expect(edges).toHaveLength(1);
      expect(edges[0]?.id).toBe(computeKnowledgeProvenanceEdgeId({
        outputKnowledgeVersion: "ziwei.comprehensive.knowledge.v4",
        outputPassageId: "v4-001",
        sourceKnowledgeVersion: "ziwei.comprehensive.knowledge.v3",
        sourcePassageId: "v3-001",
      }));

      const changedReplay = structuredClone(fixture.manifest);
      const changedReplayLedger = structuredClone(fixture.ledger);
      changedReplay.chunks[0].content = "V4 content changed.";
      changedReplay.chunks[0].contentHash = computeChunkContentHash(
        changedReplay.chunks[0].content,
      );
      changedReplay.contentHash = computeDocumentContentHash(changedReplay.chunks);
      synchronizeCandidateFixture(
        fixture.repositoryRoot,
        changedReplay,
        changedReplayLedger,
      );
      await expect(service.ingestKnowledge(changedReplay)).resolves.toMatchObject({
        ok: false,
        code: "KNOWLEDGE_METADATA_INVALID",
      });

      const missingSource = structuredClone(fixture.manifest);
      missingSource.documentId = "ziwei-comprehensive-report-vi-missing-source";
      missingSource.chunks[0].passageId = "v4-missing-source";
      missingSource.chunks[0].sourcePassageIds = ["v3-002"];
      const ledger: V3DispositionLedgerV1 = {
        ledgerSchemaVersion: "ziwei.v3-disposition-ledger.v1",
        sourceKnowledgeVersion: "ziwei.comprehensive.knowledge.v3",
        outputKnowledgeVersion: "ziwei.comprehensive.knowledge.v4",
        candidateHash: "0".repeat(64),
        entries: [{
          sourcePassageId: "v3-001",
          disposition: "omitted_oral_filler",
          outputPassageIds: [],
        }, {
          sourcePassageId: "v3-002",
          disposition: "rewritten",
          outputPassageIds: ["v4-missing-source"],
        }],
      };
      synchronizeCandidateFixture(fixture.repositoryRoot, missingSource, ledger);
      await expect(service.ingestKnowledge(missingSource)).resolves.toMatchObject({
        ok: false,
        code: "KNOWLEDGE_METADATA_INVALID",
        error: { message: "V4 provenance edge references a missing V3 source passage" },
      });
      const missingDocuments = await database
        .select()
        .from(knowledgeDocuments)
        .where(eq(
          knowledgeDocuments.documentId,
          "ziwei-comprehensive-report-vi-missing-source",
        ));
      expect(missingDocuments).toHaveLength(0);
      const v3DocumentsAfter = await database
        .select()
        .from(knowledgeDocuments)
        .where(eq(
          knowledgeDocuments.knowledgeVersion,
          "ziwei.comprehensive.knowledge.v3",
        ));
      const v3ChunksAfter = await database
        .select()
        .from(knowledgeChunks)
        .where(eq(
          knowledgeChunks.knowledgeVersion,
          "ziwei.comprehensive.knowledge.v3",
        ));
      expect(v3DocumentsAfter).toEqual(v3DocumentsBefore);
      expect(v3ChunksAfter).toEqual(v3ChunksBefore);
    } finally {
      fixture.cleanup();
      await database.$client.end();
      if (container) {
        await container.stop();
        container = undefined;
      }
    }
  }, 120_000);
});
