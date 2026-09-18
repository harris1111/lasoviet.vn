import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it, vi } from "vitest";
import type {
  KnowledgeManifestV1,
  KnowledgeManifestV2,
} from "@lasoviet/backend";
import { validateKnowledgeManifestV2 } from "@lasoviet/backend";
import { provisionReportKnowledge } from "./provision-report-knowledge.js";

function contentHash(content: string): string {
  return createHash("sha256").update(content, "utf8").digest("hex");
}

function createV1Manifest(locale: "vi" | "en"): KnowledgeManifestV1 {
  const content = `Valid ${locale} report knowledge content.`;
  return {
    documentId: `${locale}-document`,
    knowledgeVersion: locale === "vi"
      ? "ziwei.comprehensive.knowledge.v3"
      : "ziwei.identity.knowledge.v2",
    discipline: "ziwei",
    locale,
    sourcePath: `content/knowledge/${locale}/source.json`,
    sourceAttribution: "Lá Số Việt Editorial Board",
    permittedUse: "first_party",
    contentHash: contentHash(content),
    approval: {
      status: "approved",
      approver: "content-review",
      approvedAt: "2026-09-17T00:00:00.000Z",
    },
    chunks: [{
      passageId: `${locale}-passage`,
      reportSections: ["data_and_method"],
      content,
      contentHash: contentHash(content),
    }],
  };
}

function createV4Manifest(): KnowledgeManifestV2 {
  const content = "Noi dung kien thuc Tu Vi da duoc bien tap moi.";
  return {
    manifestSchemaVersion: "knowledge-manifest.v2",
    documentId: "ziwei-comprehensive-report-vi-v4",
    knowledgeVersion: "ziwei.comprehensive.knowledge.v4",
    discipline: "ziwei",
    locale: "vi",
    sourcePath: "content/knowledge/vi/ziwei/comprehensive-report.v4.json",
    sourceAttribution: "Lá Số Việt Editorial Board",
    permittedUse: "reference_rewrite",
    contentHash: contentHash(content),
    approval: {
      status: "approved",
      approver: "founder",
      approvedAt: "2026-09-17T00:00:00.000Z",
    },
    candidateHash: "a".repeat(64),
    assemblyVersion: "ziwei-v4-assembler.v1",
    provenanceSchemaVersion: "knowledge-provenance.v1",
    dispositionLedgerPath:
      "content/knowledge/vi/ziwei/v4-candidate/comprehensive-report.v4.disposition-ledger.json",
    dispositionLedgerHash: "b".repeat(64),
    chunks: [{
      passageId: "v4-passage",
      reportSections: ["data_and_method"],
      content,
      contentHash: contentHash(content),
      metadata: {
        topics: ["tu_vi"],
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
      sourcePassageIds: ["v3-passage"],
      dispositionRationaleCode: "rewritten",
    }],
  };
}

const validV1Validator = (manifest: unknown) => ({
  ok: true as const,
  value: manifest as KnowledgeManifestV1,
});

const validV4Validator = (manifest: unknown) => ({
  ok: true as const,
  value: manifest as KnowledgeManifestV2,
});

describe("provisionReportKnowledge V4", () => {
  it("validates all manifests before ingesting V3, English, and V4 side by side", async () => {
    const viManifest = createV1Manifest("vi");
    const enManifest = createV1Manifest("en");
    const v4Manifest = createV4Manifest();
    const ingestKnowledge = vi.fn().mockResolvedValue({
      ok: true,
      documentId: "document",
      chunkCount: 1,
      reused: false,
    });

    await provisionReportKnowledge({
      ingestionService: { ingestKnowledge },
      manifestLoader: () => ({ viManifest, enManifest, v4Manifest }),
      manifestValidator: validV1Validator,
      v4ManifestValidator: validV4Validator,
    });

    expect(ingestKnowledge).toHaveBeenNthCalledWith(1, viManifest);
    expect(ingestKnowledge).toHaveBeenNthCalledWith(2, enManifest);
    expect(ingestKnowledge).toHaveBeenNthCalledWith(3, v4Manifest);
  });

  it.each([
    ["draft", "KNOWLEDGE_UNAPPROVED"],
    ["rejected", "KNOWLEDGE_UNAPPROVED"],
    ["hash changed", "KNOWLEDGE_METADATA_INVALID"],
    ["boundary invalid", "KNOWLEDGE_METADATA_INVALID"],
    ["validation failed", "KNOWLEDGE_METADATA_INVALID"],
  ])("fails closed for V4 %s and performs zero ingestion", async (_caseName, code) => {
    const ingestKnowledge = vi.fn();
    const viManifest = createV1Manifest("vi");
    const enManifest = createV1Manifest("en");
    const v4Manifest = createV4Manifest();

    await expect(provisionReportKnowledge({
      ingestionService: { ingestKnowledge },
      manifestLoader: () => ({ viManifest, enManifest, v4Manifest }),
      manifestValidator: validV1Validator,
      v4ManifestValidator: () => ({
        ok: false,
        code,
        message: "V4 manifest invalid",
      }),
    })).rejects.toThrow("REPORT_KNOWLEDGE_PROVISION_FAILED");

    expect(ingestKnowledge).not.toHaveBeenCalled();
  });

  it("performs zero ingestion when an approved V4 fails the current record policy", async () => {
    const ingestKnowledge = vi.fn();

    await expect(provisionReportKnowledge({
      repositoryRoot: resolve(process.cwd()),
      ingestionService: { ingestKnowledge },
      manifestLoader: () => ({
        viManifest: createV1Manifest("vi"),
        enManifest: createV1Manifest("en"),
        v4Manifest: createV4Manifest(),
      }),
      manifestValidator: validV1Validator,
      v4ManifestValidator: validateKnowledgeManifestV2,
    })).rejects.toThrow("REPORT_KNOWLEDGE_PROVISION_FAILED");

    expect(ingestKnowledge).not.toHaveBeenCalled();
  });

  it("rejects the current draft candidate before ingesting either legacy manifest", async () => {
    const repositoryRoot = resolve(process.cwd());
    const v4Manifest = JSON.parse(readFileSync(
      resolve(
        repositoryRoot,
        "content/knowledge/vi/ziwei/v4-candidate/comprehensive-report.v4.candidate.json",
      ),
      "utf8",
    )) as unknown;
    expect(v4Manifest).toMatchObject({
      approval: { status: "draft" },
    });

    const ingestKnowledge = vi.fn();
    await expect(provisionReportKnowledge({
      repositoryRoot,
      ingestionService: { ingestKnowledge },
      manifestLoader: () => ({
        viManifest: createV1Manifest("vi"),
        enManifest: createV1Manifest("en"),
        v4Manifest,
      }),
      manifestValidator: validV1Validator,
    })).rejects.toThrow("REPORT_KNOWLEDGE_PROVISION_FAILED");

    expect(ingestKnowledge).not.toHaveBeenCalled();
  });

  it("preserves exact V3 reuse before and after V4 provisioning", async () => {
    const viManifest = createV1Manifest("vi");
    const enManifest = createV1Manifest("en");
    const v4Manifest = createV4Manifest();
    const ingestKnowledge = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, documentId: "vi-document", chunkCount: 1, reused: false })
      .mockResolvedValueOnce({ ok: true, documentId: "en-document", chunkCount: 1, reused: false })
      .mockResolvedValueOnce({ ok: true, documentId: "vi-document", chunkCount: 1, reused: true })
      .mockResolvedValueOnce({ ok: true, documentId: "en-document", chunkCount: 1, reused: true })
      .mockResolvedValueOnce({ ok: true, documentId: "v4-document", chunkCount: 1, reused: false })
      .mockResolvedValueOnce({ ok: true, documentId: "vi-document", chunkCount: 1, reused: true })
      .mockResolvedValueOnce({ ok: true, documentId: "en-document", chunkCount: 1, reused: true });

    const legacyOptions = {
      ingestionService: { ingestKnowledge },
      manifestLoader: () => ({ viManifest, enManifest }),
      manifestValidator: validV1Validator,
    };
    await provisionReportKnowledge(legacyOptions);
    await provisionReportKnowledge({
      ...legacyOptions,
      manifestLoader: () => ({ viManifest, enManifest, v4Manifest }),
      v4ManifestValidator: validV4Validator,
    });
    await provisionReportKnowledge(legacyOptions);

    expect(ingestKnowledge).toHaveBeenNthCalledWith(1, viManifest);
    expect(ingestKnowledge).toHaveBeenNthCalledWith(3, viManifest);
    expect(ingestKnowledge).toHaveBeenNthCalledWith(6, viManifest);
  });
});
