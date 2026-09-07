import { describe, expect, it, vi } from "vitest";
import { provisionReportKnowledge } from "./provision-report-knowledge.js";

describe("provisionReportKnowledge", () => {
  it("provisions both VI and EN manifests successfully", async () => {
    const ingestKnowledge = vi.fn().mockResolvedValue({
      ok: true,
      documentId: "doc-1",
      chunkCount: 11,
      reused: false,
    });
    const fakeViManifest = { documentId: "vi-doc" };
    const fakeEnManifest = { documentId: "en-doc" };

    await expect(
      provisionReportKnowledge({
        ingestionService: { ingestKnowledge },
        manifestLoader: () => ({
          viManifest: fakeViManifest,
          enManifest: fakeEnManifest,
        }),
      }),
    ).resolves.toBeUndefined();

    expect(ingestKnowledge).toHaveBeenCalledTimes(2);
    expect(ingestKnowledge).toHaveBeenNthCalledWith(1, fakeViManifest);
    expect(ingestKnowledge).toHaveBeenNthCalledWith(2, fakeEnManifest);
  });

  it("throws REPORT_KNOWLEDGE_PROVISION_FAILED when VI manifest fails ingestion with ok:false", async () => {
    const ingestKnowledge = vi.fn().mockResolvedValueOnce({
      ok: false,
      code: "KNOWLEDGE_UNAPPROVED",
      error: { code: "KNOWLEDGE_UNAPPROVED", message: "Not approved" },
    });

    await expect(
      provisionReportKnowledge({
        ingestionService: { ingestKnowledge },
        manifestLoader: () => ({
          viManifest: { documentId: "vi-doc" },
          enManifest: { documentId: "en-doc" },
        }),
      }),
    ).rejects.toThrow("REPORT_KNOWLEDGE_PROVISION_FAILED");
  });

  it("throws REPORT_KNOWLEDGE_PROVISION_FAILED when EN manifest fails ingestion with ok:false", async () => {
    const ingestKnowledge = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, documentId: "vi-doc", chunkCount: 11, reused: true })
      .mockResolvedValueOnce({
        ok: false,
        code: "KNOWLEDGE_METADATA_INVALID",
        error: { code: "KNOWLEDGE_METADATA_INVALID", message: "Metadata invalid" },
      });

    await expect(
      provisionReportKnowledge({
        ingestionService: { ingestKnowledge },
        manifestLoader: () => ({
          viManifest: { documentId: "vi-doc" },
          enManifest: { documentId: "en-doc" },
        }),
      }),
    ).rejects.toThrow("REPORT_KNOWLEDGE_PROVISION_FAILED");
  });

  it("throws REPORT_KNOWLEDGE_PROVISION_FAILED when VI ingestion rejects promise", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const ingestKnowledge = vi.fn().mockRejectedValueOnce(new Error("Database connection lost"));

    await expect(
      provisionReportKnowledge({
        ingestionService: { ingestKnowledge },
        manifestLoader: () => ({
          viManifest: { documentId: "vi-doc" },
          enManifest: { documentId: "en-doc" },
        }),
      }),
    ).rejects.toThrow("REPORT_KNOWLEDGE_PROVISION_FAILED");

    const allArgs = consoleSpy.mock.calls.flatMap((call) => call.map(String)).join(" ");
    expect(allArgs).not.toContain("Database connection lost");
    consoleSpy.mockRestore();
  });

  it("throws REPORT_KNOWLEDGE_PROVISION_FAILED when EN ingestion rejects promise", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const ingestKnowledge = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, documentId: "vi-doc", chunkCount: 11, reused: true })
      .mockRejectedValueOnce(new Error("Fatal transaction deadlock in DB"));

    await expect(
      provisionReportKnowledge({
        ingestionService: { ingestKnowledge },
        manifestLoader: () => ({
          viManifest: { documentId: "vi-doc" },
          enManifest: { documentId: "en-doc" },
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

  it("does not log manifest content on error", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const secretContent = "SECRET_MANIFEST_CONTENT_NEVER_LOGGED";
    const ingestKnowledge = vi.fn().mockResolvedValueOnce({
      ok: false,
      code: "KNOWLEDGE_UNAPPROVED",
      error: { code: "KNOWLEDGE_UNAPPROVED", message: "Not approved" },
    });

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
    consoleSpy.mockRestore();
  });
});
