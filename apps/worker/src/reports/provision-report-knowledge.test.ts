import { createHash } from "node:crypto";
import { resolve } from "node:path";
import { describe, expect, it, vi } from "vitest";
import type { KnowledgeManifestV1 } from "@lasoviet/backend";
import {
  DEFAULT_REPORT_KNOWLEDGE_PATHS,
  provisionReportKnowledge,
} from "./provision-report-knowledge.js";

function createValidManifest(
  overrides: Partial<KnowledgeManifestV1> & { locale: "vi" | "en" },
): KnowledgeManifestV1 {
  const content = `Valid sample content for ${overrides.locale} knowledge chunk testing.`;
  const contentHash = createHash("sha256").update(content, "utf8").digest("hex").toLowerCase();
  const { locale, documentId, knowledgeVersion, ...restOverrides } = overrides;
  return {
    documentId: documentId ?? `test-doc-${locale}`,
    knowledgeVersion:
      knowledgeVersion ??
      (locale === "vi"
        ? "ziwei.comprehensive.knowledge.v3"
        : "ziwei.identity.knowledge.v2"),
    discipline: "ziwei",
    locale,
    sourcePath: "docs/05-report-system.md",
    sourceAttribution: "Lá Số Việt Editorial Board",
    permittedUse: "first_party",
    contentHash,
    approval: {
      status: "approved",
      approver: "phase04-content-review",
      approvedAt: "2026-09-07T00:00:00.000Z",
    },
    chunks: [
      {
        passageId: `${locale}-test-001`,
        reportSections: ["data_and_method"],
        content,
        contentHash,
      },
    ],
    ...restOverrides,
  };
}

describe("provisionReportKnowledge", () => {
  it("configures exact default paths with Vietnamese V3 and English V2 without legacy VI V2", () => {
    expect(DEFAULT_REPORT_KNOWLEDGE_PATHS.vi).toBe(
      "content/knowledge/vi/ziwei/comprehensive-report.v3.json",
    );
    expect(DEFAULT_REPORT_KNOWLEDGE_PATHS.en).toBe(
      "content/knowledge/en/ziwei/identity-report-foundation.v2.json",
    );
    expect(DEFAULT_REPORT_KNOWLEDGE_PATHS.vi).not.toContain("identity-report-foundation");
    expect(DEFAULT_REPORT_KNOWLEDGE_PATHS.vi).not.toContain(".v2.json");
  });

  it("loads exact default paths from disk, validates both manifests, and ingests them in VI then EN order", async () => {
    const ingestKnowledge = vi.fn().mockImplementation(async (manifest: KnowledgeManifestV1) => ({
      ok: true,
      documentId: manifest.documentId,
      chunkCount: manifest.chunks.length,
      reused: false,
    }));

    await expect(
      provisionReportKnowledge({
        ingestionService: { ingestKnowledge },
        repositoryRoot: resolve(process.cwd()),
      }),
    ).resolves.toBeUndefined();

    expect(ingestKnowledge).toHaveBeenCalledTimes(2);

    const firstCall = ingestKnowledge.mock.calls[0];
    expect(firstCall).toBeDefined();
    const viCallManifest = firstCall?.[0] as KnowledgeManifestV1;
    expect(viCallManifest.documentId).toBe("ziwei-comprehensive-report-vi");
    expect(viCallManifest.knowledgeVersion).toBe("ziwei.comprehensive.knowledge.v3");
    expect(viCallManifest.locale).toBe("vi");
    expect(viCallManifest.sourcePath).toBe(DEFAULT_REPORT_KNOWLEDGE_PATHS.vi);

    const secondCall = ingestKnowledge.mock.calls[1];
    expect(secondCall).toBeDefined();
    const enCallManifest = secondCall?.[0] as KnowledgeManifestV1;
    expect(enCallManifest.documentId).toBe("ziwei-identity-foundation-en");
    expect(enCallManifest.knowledgeVersion).toBe("ziwei.identity.knowledge.v2");
    expect(enCallManifest.locale).toBe("en");
    expect(enCallManifest.sourcePath).toBe(DEFAULT_REPORT_KNOWLEDGE_PATHS.en);
  });

  it("provisions both valid VI and EN manifests successfully via manifestLoader", async () => {
    const ingestKnowledge = vi.fn().mockResolvedValue({
      ok: true,
      documentId: "doc-1",
      chunkCount: 1,
      reused: false,
    });
    const validViManifest = createValidManifest({ documentId: "vi-doc", locale: "vi" });
    const validEnManifest = createValidManifest({ documentId: "en-doc", locale: "en" });

    await expect(
      provisionReportKnowledge({
        ingestionService: { ingestKnowledge },
        manifestLoader: () => ({
          viManifest: validViManifest,
          enManifest: validEnManifest,
        }),
      }),
    ).resolves.toBeUndefined();

    expect(ingestKnowledge).toHaveBeenCalledTimes(2);
    expect(ingestKnowledge).toHaveBeenNthCalledWith(1, validViManifest);
    expect(ingestKnowledge).toHaveBeenNthCalledWith(2, validEnManifest);
  });

  it("fails closed when VI manifest is invalid and prevents ANY ingestion", async () => {
    const ingestKnowledge = vi.fn();
    const invalidViManifest = { documentId: "invalid-vi" };
    const validEnManifest = createValidManifest({ documentId: "en-doc", locale: "en" });

    await expect(
      provisionReportKnowledge({
        ingestionService: { ingestKnowledge },
        manifestLoader: () => ({
          viManifest: invalidViManifest,
          enManifest: validEnManifest,
        }),
      }),
    ).rejects.toThrow("REPORT_KNOWLEDGE_PROVISION_FAILED");

    expect(ingestKnowledge).not.toHaveBeenCalled();
  });

  it("fails closed when EN manifest is invalid and prevents VI from being ingested", async () => {
    const ingestKnowledge = vi.fn();
    const validViManifest = createValidManifest({ documentId: "vi-doc", locale: "vi" });
    const invalidEnManifest = { documentId: "invalid-en" };

    await expect(
      provisionReportKnowledge({
        ingestionService: { ingestKnowledge },
        manifestLoader: () => ({
          viManifest: validViManifest,
          enManifest: invalidEnManifest,
        }),
      }),
    ).rejects.toThrow("REPORT_KNOWLEDGE_PROVISION_FAILED");

    expect(ingestKnowledge).not.toHaveBeenCalled();
  });

  it("fails closed when VI manifest is unapproved and prevents any ingestion", async () => {
    const ingestKnowledge = vi.fn();
    const unapprovedViManifest = createValidManifest({
      documentId: "vi-doc",
      locale: "vi",
      approval: {
        status: "draft",
        approver: "phase04-content-review",
        approvedAt: "2026-09-07T00:00:00.000Z",
      },
    });
    const validEnManifest = createValidManifest({ documentId: "en-doc", locale: "en" });

    await expect(
      provisionReportKnowledge({
        ingestionService: { ingestKnowledge },
        manifestLoader: () => ({
          viManifest: unapprovedViManifest,
          enManifest: validEnManifest,
        }),
      }),
    ).rejects.toThrow("REPORT_KNOWLEDGE_PROVISION_FAILED");

    expect(ingestKnowledge).not.toHaveBeenCalled();
  });

  it("fails closed when EN manifest is unapproved and prevents VI ingestion", async () => {
    const ingestKnowledge = vi.fn();
    const validViManifest = createValidManifest({ documentId: "vi-doc", locale: "vi" });
    const unapprovedEnManifest = createValidManifest({
      documentId: "en-doc",
      locale: "en",
      approval: {
        status: "draft",
        approver: "phase04-content-review",
        approvedAt: "2026-09-07T00:00:00.000Z",
      },
    });

    await expect(
      provisionReportKnowledge({
        ingestionService: { ingestKnowledge },
        manifestLoader: () => ({
          viManifest: validViManifest,
          enManifest: unapprovedEnManifest,
        }),
      }),
    ).rejects.toThrow("REPORT_KNOWLEDGE_PROVISION_FAILED");

    expect(ingestKnowledge).not.toHaveBeenCalled();
  });

  it("throws REPORT_KNOWLEDGE_PROVISION_FAILED when VI manifest fails ingestion with ok:false", async () => {
    const ingestKnowledge = vi.fn().mockResolvedValueOnce({
      ok: false,
      code: "KNOWLEDGE_UNAPPROVED",
      error: { code: "KNOWLEDGE_UNAPPROVED", message: "Not approved" },
    });
    const validViManifest = createValidManifest({ documentId: "vi-doc", locale: "vi" });
    const validEnManifest = createValidManifest({ documentId: "en-doc", locale: "en" });

    await expect(
      provisionReportKnowledge({
        ingestionService: { ingestKnowledge },
        manifestLoader: () => ({
          viManifest: validViManifest,
          enManifest: validEnManifest,
        }),
      }),
    ).rejects.toThrow("REPORT_KNOWLEDGE_PROVISION_FAILED");

    expect(ingestKnowledge).toHaveBeenCalledTimes(1);
    expect(ingestKnowledge).toHaveBeenCalledWith(validViManifest);
  });

  it("throws REPORT_KNOWLEDGE_PROVISION_FAILED when EN manifest fails ingestion with ok:false", async () => {
    const validViManifest = createValidManifest({ documentId: "vi-doc", locale: "vi" });
    const validEnManifest = createValidManifest({ documentId: "en-doc", locale: "en" });
    const ingestKnowledge = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, documentId: "vi-doc", chunkCount: 1, reused: true })
      .mockResolvedValueOnce({
        ok: false,
        code: "KNOWLEDGE_METADATA_INVALID",
        error: { code: "KNOWLEDGE_METADATA_INVALID", message: "Metadata invalid" },
      });

    await expect(
      provisionReportKnowledge({
        ingestionService: { ingestKnowledge },
        manifestLoader: () => ({
          viManifest: validViManifest,
          enManifest: validEnManifest,
        }),
      }),
    ).rejects.toThrow("REPORT_KNOWLEDGE_PROVISION_FAILED");

    expect(ingestKnowledge).toHaveBeenCalledTimes(2);
  });

  it("throws REPORT_KNOWLEDGE_PROVISION_FAILED when VI ingestion rejects promise", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const ingestKnowledge = vi.fn().mockRejectedValueOnce(new Error("Database connection lost"));
    const validViManifest = createValidManifest({ documentId: "vi-doc", locale: "vi" });
    const validEnManifest = createValidManifest({ documentId: "en-doc", locale: "en" });

    await expect(
      provisionReportKnowledge({
        ingestionService: { ingestKnowledge },
        manifestLoader: () => ({
          viManifest: validViManifest,
          enManifest: validEnManifest,
        }),
      }),
    ).rejects.toThrow("REPORT_KNOWLEDGE_PROVISION_FAILED");

    const allArgs = consoleSpy.mock.calls.flatMap((call) => call.map(String)).join(" ");
    expect(allArgs).not.toContain("Database connection lost");
    consoleSpy.mockRestore();
  });

  it("throws REPORT_KNOWLEDGE_PROVISION_FAILED when EN ingestion rejects promise", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const validViManifest = createValidManifest({ documentId: "vi-doc", locale: "vi" });
    const validEnManifest = createValidManifest({ documentId: "en-doc", locale: "en" });
    const ingestKnowledge = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, documentId: "vi-doc", chunkCount: 1, reused: true })
      .mockRejectedValueOnce(new Error("Fatal transaction deadlock in DB"));

    await expect(
      provisionReportKnowledge({
        ingestionService: { ingestKnowledge },
        manifestLoader: () => ({
          viManifest: validViManifest,
          enManifest: validEnManifest,
        }),
      }),
    ).rejects.toThrow("REPORT_KNOWLEDGE_PROVISION_FAILED");

    const allArgs = consoleSpy.mock.calls.flatMap((call) => call.map(String)).join(" ");
    expect(allArgs).not.toContain("Fatal transaction deadlock in DB");
    consoleSpy.mockRestore();
  });

  it("throws REPORT_KNOWLEDGE_PROVISION_FAILED when manifest loader throws", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const ingestKnowledge = vi.fn();

    await expect(
      provisionReportKnowledge({
        ingestionService: { ingestKnowledge },
        manifestLoader: () => {
          throw new Error("ENOENT: file not found on disk at /secret/path");
        },
      }),
    ).rejects.toThrow("REPORT_KNOWLEDGE_PROVISION_FAILED");

    expect(ingestKnowledge).not.toHaveBeenCalled();
    const allArgs = consoleSpy.mock.calls.flatMap((call) => call.map(String)).join(" ");
    expect(allArgs).not.toContain("/secret/path");
    consoleSpy.mockRestore();
  });

  it("throws REPORT_KNOWLEDGE_PROVISION_FAILED when default file is missing on disk", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const ingestKnowledge = vi.fn();

    await expect(
      provisionReportKnowledge({
        ingestionService: { ingestKnowledge },
        repositoryRoot: resolve("/nonexistent-repo-root"),
      }),
    ).rejects.toThrow("REPORT_KNOWLEDGE_PROVISION_FAILED");

    expect(ingestKnowledge).not.toHaveBeenCalled();
    const allArgs = consoleSpy.mock.calls.flatMap((call) => call.map(String)).join(" ");
    expect(allArgs).not.toContain("/nonexistent-repo-root");
    consoleSpy.mockRestore();
  });

  it("does not log manifest content on validation error", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const secretContent = "SECRET_MANIFEST_CONTENT_NEVER_LOGGED";
    const ingestKnowledge = vi.fn();

    try {
      await provisionReportKnowledge({
        ingestionService: { ingestKnowledge },
        manifestLoader: () => ({
          viManifest: { documentId: "vi-doc", secretField: secretContent },
          enManifest: { documentId: "en-doc" },
        }),
      });
    } catch {
      // expected failure
    }

    const allArgs = consoleSpy.mock.calls.flatMap((call) => call.map(String)).join(" ");
    expect(allArgs).not.toContain(secretContent);
    expect(ingestKnowledge).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});
