import { describe, expect, it } from "vitest";

import {
  GeneratedPreviewRequestV1Schema,
  GeneratedPreviewSafeProjectionV1Schema,
} from "./generated-preview-v1.js";

describe("generated preview V1 contracts", () => {
  const safeExcerpt = "a".repeat(280);

  it("permits only a server-clipped locked excerpt and structural lock metadata", () => {
    expect(GeneratedPreviewSafeProjectionV1Schema.safeParse({
      version: 1, sectionId: "coreAxis", status: "ready", excerpt: safeExcerpt,
      teaser: "Phần này đã sẵn sàng.", locked: true,
    }).success).toBe(true);
    expect(GeneratedPreviewSafeProjectionV1Schema.safeParse({
      version: 1, sectionId: "coreAxis", status: "ready", excerpt: "short",
      teaser: "Phần này đã sẵn sàng.", locked: true,
    }).success).toBe(false);
  });

  it("rejects client projections with full content or provider internals", () => {
    const projection = {
      version: 1, sectionId: "coreAxis", status: "ready", excerpt: safeExcerpt,
      teaser: "Phần này đã sẵn sàng.", locked: true, prompt: "secret",
    };
    expect(GeneratedPreviewSafeProjectionV1Schema.safeParse(projection).success).toBe(false);
    expect(GeneratedPreviewRequestV1Schema.safeParse({
      schemaVersion: 1, requestId: "request", chartVersionId: "chart",
      sectionIds: ["coreAxis"], idempotencyKey: "key", readingContext: {},
    }).success).toBe(false);
  });
});
