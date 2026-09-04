import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { PostgreSqlContainer } from "@testcontainers/postgresql";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  createDatabase,
  knowledgeChunks,
  knowledgeDocuments,
  runMigrations,
} from "../../packages/database/src/index.js";
import {
  createKnowledgeIngestionService,
  createKnowledgeRetrievalService,
  type KnowledgeManifestV1,
} from "../../packages/backend/src/index.js";

describe("knowledge ingestion and retrieval integration", () => {
  let container: Awaited<ReturnType<PostgreSqlContainer["start"]>> | undefined;
  let databaseUrl = "";
  const repoRoot = resolve(process.cwd());

  beforeAll(async () => {
    container = await new PostgreSqlContainer("postgres:16-alpine")
      .withDatabase("lasoviet_test")
      .withUsername("lasoviet")
      .withPassword("lasoviet")
      .start();
    databaseUrl = container.getConnectionUri();
    await runMigrations(databaseUrl);
  }, 120_000);

  afterAll(async () => {
    await container?.stop();
  }, 30_000);

  it("ingests real approved Vietnamese and English manifests idempotently", async () => {
    const database = createDatabase(databaseUrl);
    const ingestionService = createKnowledgeIngestionService({
      database,
      repositoryRoot: repoRoot,
    });

    const viRaw = await readFile(
      resolve(repoRoot, "content/knowledge/vi/ziwei/identity-report-foundation.v1.json"),
      "utf8",
    );
    const enRaw = await readFile(
      resolve(repoRoot, "content/knowledge/en/ziwei/identity-report-foundation.v1.json"),
      "utf8",
    );

    const viManifest: KnowledgeManifestV1 = JSON.parse(viRaw);
    const enManifest: KnowledgeManifestV1 = JSON.parse(enRaw);

    // Initial ingestion
    const viResult1 = await ingestionService.ingestKnowledge(viManifest);
    expect(viResult1.ok).toBe(true);
    if (!viResult1.ok) throw new Error("Expected viResult1 to be ok");
    expect(viResult1.reused).toBe(false);
    expect(viResult1.chunkCount).toBeGreaterThan(0);

    const enResult1 = await ingestionService.ingestKnowledge(enManifest);
    expect(enResult1.ok).toBe(true);
    if (!enResult1.ok) throw new Error("Expected enResult1 to be ok");
    expect(enResult1.reused).toBe(false);
    expect(enResult1.chunkCount).toBeGreaterThan(0);

    // Re-ingestion of exact same approved manifests is idempotent
    const viResult2 = await ingestionService.ingestKnowledge(viManifest);
    expect(viResult2.ok).toBe(true);
    if (!viResult2.ok) throw new Error("Expected viResult2 to be ok");
    expect(viResult2.reused).toBe(true);
    expect(viResult2.documentId).toBe(viResult1.documentId);

    const enResult2 = await ingestionService.ingestKnowledge(enManifest);
    expect(enResult2.ok).toBe(true);
    if (!enResult2.ok) throw new Error("Expected enResult2 to be ok");
    expect(enResult2.reused).toBe(true);
    expect(enResult2.documentId).toBe(enResult1.documentId);

    await database.$client.end();
  });

  it("fails closed when attempting to reuse an immutable document/version with altered content", async () => {
    const database = createDatabase(databaseUrl);
    const ingestionService = createKnowledgeIngestionService({
      database,
      repositoryRoot: repoRoot,
    });

    const viRaw = await readFile(
      resolve(repoRoot, "content/knowledge/vi/ziwei/identity-report-foundation.v1.json"),
      "utf8",
    );
    const viManifest: KnowledgeManifestV1 = JSON.parse(viRaw);

    // Tampered chunks with valid hash for the tampered content but different from persisted
    const tamperedManifest: KnowledgeManifestV1 = {
      ...viManifest,
      chunks: [
        {
          passageId: "tampered-chunk",
          reportSections: ["data_and_method"],
          content: "Noi dung bi thay doi khong hop le.",
          contentHash: "2b9fd9f6bc0e854936d8da7cb2fe4d73aa4e672721ab7ff909477e48b88d8b2d",
        },
      ],
      contentHash: "2b9fd9f6bc0e854936d8da7cb2fe4d73aa4e672721ab7ff909477e48b88d8b2d",
    };

    const result = await ingestionService.ingestKnowledge(tamperedManifest);
    expect(result.ok).toBe(false);
    expect((result as any).code).toBe("KNOWLEDGE_METADATA_INVALID");

    await database.$client.end();
  });

  it("never persists an unapproved document", async () => {
    const database = createDatabase(databaseUrl);
    const ingestionService = createKnowledgeIngestionService({
      database,
      repositoryRoot: repoRoot,
    });

    const unapprovedManifest: KnowledgeManifestV1 = {
      documentId: "unapproved-doc-test",
      knowledgeVersion: "ziwei.identity.knowledge.v1",
      discipline: "ziwei",
      locale: "vi",
      sourcePath: "content/knowledge/vi/ziwei/identity-report-foundation.v1.json",
      sourceAttribution: "Ban Bien Tap",
      permittedUse: "first_party",
      contentHash: "2b9fd9f6bc0e854936d8da7cb2fe4d73aa4e672721ab7ff909477e48b88d8b2d",
      approval: {
        status: "draft",
        approver: "author",
        approvedAt: "2026-09-01T00:00:00.000Z",
      },
      chunks: [
        {
          passageId: "unapproved-chunk-1",
          reportSections: ["personal_summary"],
          content: "Noi dung ban thao chua duoc duyet.",
          contentHash: "2b9fd9f6bc0e854936d8da7cb2fe4d73aa4e672721ab7ff909477e48b88d8b2d",
        },
      ],
    };

    const result = await ingestionService.ingestKnowledge(unapprovedManifest);
    expect(result.ok).toBe(false);
    expect((result as any).code).toBe("KNOWLEDGE_UNAPPROVED");

    const allDocs = await database.select().from(knowledgeDocuments);
    const persisted = allDocs.filter((d) => d.documentId === "unapproved-doc-test");
    expect(persisted).toHaveLength(0);

    const allChunks = await database.select().from(knowledgeChunks);
    const persistedChunks = allChunks.filter((c) => c.passageId === "unapproved-chunk-1");
    expect(persistedChunks).toHaveLength(0);

    await database.$client.end();
  });

  it("retrieves knowledge matching discipline, locale, section, and version with simple full-text ranking", async () => {
    const database = createDatabase(databaseUrl);
    const retrievalService = createKnowledgeRetrievalService({ database });

    const passages = await retrievalService.retrieveKnowledge({
      discipline: "ziwei",
      locale: "vi",
      reportSection: "data_and_method",
      knowledgeVersion: "ziwei.identity.knowledge.v1",
      text: "phương pháp lập lá số giờ sinh",
    });

    expect(passages.length).toBeGreaterThan(0);
    expect(passages.length).toBeLessThanOrEqual(8);

    for (const passage of passages) {
      expect(passage.discipline).toBe("ziwei");
      expect(passage.locale).toBe("vi");
      expect(passage.knowledgeVersion).toBe("ziwei.identity.knowledge.v1");
      expect(passage.reportSections).toContain("data_and_method");
      expect(passage.content.length).toBeLessThanOrEqual(1200);
      expect(passage.contentHash).toBeDefined();
      expect(passage.permittedUse).toBe("first_party");
      expect(passage.sourceAttribution).toBeDefined();
    }

    const totalChars = passages.reduce((acc, p) => acc + p.content.length, 0);
    expect(totalChars).toBeLessThanOrEqual(9600);

    await database.$client.end();
  });

  it("never returns wrong-locale or wrong-version chunks", async () => {
    const database = createDatabase(databaseUrl);
    const retrievalService = createKnowledgeRetrievalService({ database });

    // Requesting Vietnamese with English query text should never return English chunks
    const viPassages = await retrievalService.retrieveKnowledge({
      discipline: "ziwei",
      locale: "vi",
      reportSection: "data_and_method",
      knowledgeVersion: "ziwei.identity.knowledge.v1",
      text: "methodology calculation",
    });

    for (const p of viPassages) {
      expect(p.locale).toBe("vi");
    }

    // Requesting non-existent version returns empty array
    const wrongVersionPassages = await retrievalService.retrieveKnowledge({
      discipline: "ziwei",
      locale: "vi",
      reportSection: "data_and_method",
      knowledgeVersion: "ziwei.identity.knowledge.v999",
      text: "phương pháp",
    });
    expect(wrongVersionPassages).toHaveLength(0);

    await database.$client.end();
  });

  it("finding 2: concurrent identical ingestion returns reused: true without throwing unique index violation", async () => {
    const database = createDatabase(databaseUrl);
    const ingestionService = createKnowledgeIngestionService({
      database,
      repositoryRoot: repoRoot,
    });

    const viRaw = await readFile(
      resolve(repoRoot, "content/knowledge/vi/ziwei/identity-report-foundation.v1.json"),
      "utf8",
    );
    const viManifest: KnowledgeManifestV1 = JSON.parse(viRaw);

    // Run 5 concurrent ingestions of the exact same manifest
    const results = await Promise.all([
      ingestionService.ingestKnowledge(viManifest),
      ingestionService.ingestKnowledge(viManifest),
      ingestionService.ingestKnowledge(viManifest),
      ingestionService.ingestKnowledge(viManifest),
      ingestionService.ingestKnowledge(viManifest),
    ]);

    for (const res of results) {
      expect(res.ok).toBe(true);
      if (!res.ok) throw new Error("Expected concurrent ingestion to succeed");
      expect(res.documentId).toBeDefined();
    }

    // At least one or all concurrent calls return reused: true or first returns false and subsequent return true
    const reusedCount = results.filter((r) => r.ok && r.reused).length;
    expect(reusedCount).toBeGreaterThanOrEqual(1);

    await database.$client.end();
  });

  it("finding 3: physical document and chunk IDs include knowledgeVersion so versions coexist", async () => {
    const database = createDatabase(databaseUrl);
    const ingestionService = createKnowledgeIngestionService({
      database,
      repositoryRoot: repoRoot,
    });

    const viRaw = await readFile(
      resolve(repoRoot, "content/knowledge/vi/ziwei/identity-report-foundation.v1.json"),
      "utf8",
    );
    const viManifest: KnowledgeManifestV1 = JSON.parse(viRaw);

    const docResult = await ingestionService.ingestKnowledge(viManifest);
    expect(docResult.ok).toBe(true);
    if (!docResult.ok) throw new Error("Expected docResult to be ok");

    expect(docResult.documentId).toContain("ziwei.identity.knowledge.v1");

    const allDocs = await database.select().from(knowledgeDocuments);
    const matchedDoc = allDocs.find((d) => d.id === docResult.documentId);
    expect(matchedDoc).toBeDefined();
    expect(matchedDoc?.id).toContain("ziwei.identity.knowledge.v1");

    const allChunks = await database.select().from(knowledgeChunks);
    const matchedChunks = allChunks.filter((c) => c.documentId === docResult.documentId);
    expect(matchedChunks.length).toBeGreaterThan(0);
    for (const c of matchedChunks) {
      expect(c.id).toContain("ziwei.identity.knowledge.v1");
    }

    await database.$client.end();
  });

});
