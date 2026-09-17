import { describe, expect, it } from "vitest";

import { generatedPreviewRequests, generatedPreviewSections } from "./generated-preview.js";

describe("generated preview schema", () => {
  it("persists bounded safe excerpts and orchestration state without raw content fields", () => {
    expect(generatedPreviewRequests.sourceReference).toBeDefined();
    expect(generatedPreviewRequests.budgetReservationId).toBeDefined();
    expect(generatedPreviewRequests.leaseExpiresAt).toBeDefined();
    expect(generatedPreviewSections.safeExcerpt).toBeDefined();
    expect(generatedPreviewSections.contentHash).toBeDefined();
    expect((generatedPreviewSections as Record<string, unknown>).prompt).toBeUndefined();
    expect((generatedPreviewSections as Record<string, unknown>).providerPayload).toBeUndefined();
  });
});
