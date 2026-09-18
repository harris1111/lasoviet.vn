import { copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { PostgreSqlContainer } from "@testcontainers/postgresql";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createDatabase } from "../client.js";
import { runMigrations } from "../migrate.js";
import {
  knowledgeChunkProvenanceEdges,
  knowledgeChunks,
  knowledgeDocuments,
} from "./knowledge.js";

describe("V4 knowledge provenance persistence", () => {
  let container: Awaited<ReturnType<PostgreSqlContainer["start"]>> | undefined;
  let databaseUrl: string;

  beforeAll(async () => {
    container = await new PostgreSqlContainer("postgres:16-alpine")
      .withDatabase("lasoviet_knowledge_v4_test")
      .withUsername("lasoviet")
      .withPassword("lasoviet")
      .start();
    databaseUrl = container.getConnectionUri();
  }, 120_000);

  afterAll(async () => {
    if (container) {
      await container.stop();
    }
  }, 30_000);

  it("upgrades a 0039 database to additive V4 provenance persistence", async () => {
    const upgradeDatabaseName = `lasoviet_knowledge_v4_upgrade_${Date.now()}`;
    const upgradeDatabaseUrl = new URL(databaseUrl);
    upgradeDatabaseUrl.pathname = `/${upgradeDatabaseName}`;
    const baselineDirectory = await mkdtemp(join(tmpdir(), "lasoviet-knowledge-v4-"));

    try {
      const migrationRoot = new URL("../../drizzle/", import.meta.url);
      const journal = JSON.parse(
        await readFile(new URL("meta/_journal.json", migrationRoot), "utf8"),
      ) as { entries: Array<{ idx: number; tag: string }> };
      const entries = journal.entries.filter((entry) => entry.idx <= 39);
      await mkdir(join(baselineDirectory, "meta"));
      await Promise.all(entries.map((entry) => copyFile(
        new URL(`${entry.tag}.sql`, migrationRoot),
        join(baselineDirectory, `${entry.tag}.sql`),
      )));
      await writeFile(
        join(baselineDirectory, "meta", "_journal.json"),
        JSON.stringify({ version: "7", dialect: "postgresql", entries }),
      );

      const adminClient = postgres(databaseUrl);
      try {
        await adminClient.unsafe(`CREATE DATABASE ${upgradeDatabaseName}`);
      } finally {
        await adminClient.end();
      }
      const baselineClient = postgres(upgradeDatabaseUrl.toString());
      await migrate(drizzle(baselineClient), { migrationsFolder: baselineDirectory });
      await baselineClient.end();

      await expect(runMigrations(upgradeDatabaseUrl.toString())).resolves.toMatchObject({
        appliedMigrations: expect.any(Array),
      });
      const verificationClient = postgres(upgradeDatabaseUrl.toString());
      try {
        const [table] = await verificationClient<{ exists: boolean }[]>`
          SELECT EXISTS (
            SELECT 1 FROM information_schema.tables
            WHERE table_schema = 'public'
              AND table_name = 'knowledge_chunk_provenance_edges'
          ) AS exists
        `;
        expect(table?.exists).toBe(true);
      } finally {
        await verificationClient.end();
      }
    } finally {
      await rm(baselineDirectory, { recursive: true, force: true });
    }
  });

  it("enforces V4-to-V3 composite provenance edges on a clean schema", async () => {
    await runMigrations(databaseUrl);
    const database = createDatabase(databaseUrl);
    const sourceDocumentId = "knowledge-v3-source-document";
    const outputDocumentId = "knowledge-v4-output-document";

    try {
      await database.insert(knowledgeDocuments).values([
        {
          id: sourceDocumentId,
          documentId: "knowledge-v3-source",
          knowledgeVersion: "ziwei.comprehensive.knowledge.v3",
          discipline: "ziwei",
          locale: "vi",
          sourcePath: "source-v3.json",
          sourceAttribution: "Test",
          permittedUse: "first_party",
          contentHash: "a".repeat(64),
          approvalStatus: "approved",
          approvedBy: "test",
          approvedAt: new Date("2026-09-17T00:00:00Z"),
        },
        {
          id: outputDocumentId,
          documentId: "knowledge-v4-output",
          knowledgeVersion: "ziwei.comprehensive.knowledge.v4",
          discipline: "ziwei",
          locale: "vi",
          sourcePath: "source-v4.json",
          sourceAttribution: "Test",
          permittedUse: "reference_rewrite",
          contentHash: "b".repeat(64),
          approvalStatus: "approved",
          approvedBy: "test",
          approvedAt: new Date("2026-09-17T00:00:00Z"),
        },
      ]);
      await database.insert(knowledgeChunks).values([
        {
          id: `${sourceDocumentId}:v3-source`,
          passageId: "v3-source",
          documentId: sourceDocumentId,
          knowledgeVersion: "ziwei.comprehensive.knowledge.v3",
          discipline: "ziwei",
          locale: "vi",
          reportSections: ["primary_evidence"],
          content: "V3 source",
          contentHash: "c".repeat(64),
          sourceAttribution: "Test",
          permittedUse: "first_party",
          metadata: {},
        },
        {
          id: `${outputDocumentId}:v4-output`,
          passageId: "v4-output",
          documentId: outputDocumentId,
          knowledgeVersion: "ziwei.comprehensive.knowledge.v4",
          discipline: "ziwei",
          locale: "vi",
          reportSections: ["primary_evidence"],
          content: "V4 output",
          contentHash: "d".repeat(64),
          sourceAttribution: "Test",
          permittedUse: "reference_rewrite",
          metadata: {},
        },
      ]);
      await expect(database.insert(knowledgeChunkProvenanceEdges).values({
        id: "edge-valid",
        outputKnowledgeVersion: "ziwei.comprehensive.knowledge.v4",
        outputPassageId: "v4-output",
        sourceKnowledgeVersion: "ziwei.comprehensive.knowledge.v3",
        sourcePassageId: "v3-source",
      })).resolves.toBeDefined();
      await expect(database.insert(knowledgeChunkProvenanceEdges).values({
        id: "edge-duplicate-identity",
        outputKnowledgeVersion: "ziwei.comprehensive.knowledge.v4",
        outputPassageId: "v4-output",
        sourceKnowledgeVersion: "ziwei.comprehensive.knowledge.v3",
        sourcePassageId: "v3-source",
      })).rejects.toBeDefined();
      await expect(database.insert(knowledgeChunkProvenanceEdges).values({
        id: "edge-invalid-version",
        outputKnowledgeVersion: "ziwei.comprehensive.knowledge.v3",
        outputPassageId: "v3-source",
        sourceKnowledgeVersion: "ziwei.comprehensive.knowledge.v3",
        sourcePassageId: "v3-source",
      })).rejects.toBeDefined();
      await expect(database.insert(knowledgeChunkProvenanceEdges).values({
        id: "edge-missing-source",
        outputKnowledgeVersion: "ziwei.comprehensive.knowledge.v4",
        outputPassageId: "v4-output",
        sourceKnowledgeVersion: "ziwei.comprehensive.knowledge.v3",
        sourcePassageId: "missing-v3-source",
      })).rejects.toBeDefined();
    } finally {
      await database.$client.end();
    }
  });
});
