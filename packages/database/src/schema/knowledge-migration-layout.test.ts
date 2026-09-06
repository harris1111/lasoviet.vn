import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

const migrationRoot = new URL("../../drizzle/", import.meta.url);

describe("knowledge migration layout", () => {
  it("keeps approved knowledge schema in migration 0013", async () => {
    const migration = await readFile(
      new URL("0013_approved_knowledge.sql", migrationRoot),
      "utf8",
    );

    expect(migration).toContain('CREATE TABLE "knowledge_documents"');
    expect(migration).toContain('CREATE TABLE "knowledge_chunks"');
    expect(migration).toContain('"knowledge_version" text NOT NULL');
    expect(migration).toContain('"content_hash" text NOT NULL');
    expect(migration).toContain('"permitted_use" text NOT NULL');
    expect(migration).toContain('"approval_status" text NOT NULL');
    expect(migration).toContain('"report_sections" jsonb NOT NULL');
    expect(migration).toContain('"content" text NOT NULL');
    expect(migration).toContain("knowledge_chunks_fts_idx");
    expect(migration).toContain("to_tsvector('simple', \"content\")");
  });

  it("registers migration 0013 in drizzle meta journal", async () => {
    const journal = await readFile(
      new URL("meta/_journal.json", migrationRoot),
      "utf8",
    );

    expect(journal).toContain('"tag": "0013_approved_knowledge"');
    expect(journal).toContain('"idx": 13');
  });

  it("registers knowledge schema in drizzle config, client, and package exports", async () => {
    const [drizzleConfig, client, packageIndex] = await Promise.all([
      readFile(new URL("../../drizzle.config.ts", import.meta.url), "utf8"),
      readFile(new URL("../client.ts", import.meta.url), "utf8"),
      readFile(new URL("../index.ts", import.meta.url), "utf8"),
    ]);

    expect(drizzleConfig).toContain('"./src/schema/knowledge.ts"');
    expect(client).toContain('import * as knowledge from "./schema/knowledge.js"');
    expect(client).toContain('...knowledge');
    expect(packageIndex).toContain('knowledgeDocuments');
    expect(packageIndex).toContain('knowledgeChunks');
  });
});
