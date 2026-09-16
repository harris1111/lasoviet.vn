import { describe, expect, it } from "vitest";

import {
  CONSENT_DOCUMENT_KEY,
  CONSENT_DOCUMENT_VERSIONS,
  CONSENT_PURPOSES,
  CURRENT_CONSENT_DOCUMENT_VERSION,
  ConsentRequestV1Schema,
} from "./privacy.js";

describe("privacy consent contract", () => {
  it("accepts version 2026-09-14 with the exact four-purpose set", () => {
    const valid = ConsentRequestV1Schema.parse({
      version: 1,
      documentKey: "privacy",
      documentVersion: "2026-09-14",
      purposes: ["birth_profile", "analytics", "personalization", "offers"],
      visitorId: "123e4567-e89b-12d3-a456-426614174000",
    });

    expect(valid).toMatchObject({
      version: 1,
      documentKey: "privacy",
      documentVersion: "2026-09-14",
      purposes: ["birth_profile", "analytics", "personalization", "offers"],
      visitorId: "123e4567-e89b-12d3-a456-426614174000",
    });
  });

  it("accepts consent request without visitorId", () => {
    const valid = ConsentRequestV1Schema.parse({
      version: 1,
      documentKey: "privacy",
      documentVersion: "2026-09-14",
      purposes: ["offers", "personalization", "analytics", "birth_profile"],
    });
    expect(valid.purposes).toHaveLength(4);
  });

  it("fails closed on legacy document versions", () => {
    expect(() =>
      ConsentRequestV1Schema.parse({
        version: 1,
        documentKey: "privacy",
        documentVersion: "2026-09-01",
        purposes: ["birth_profile", "analytics", "personalization", "offers"],
      }),
    ).toThrow();
  });

  it("fails closed on partial purpose sets", () => {
    expect(() =>
      ConsentRequestV1Schema.parse({
        version: 1,
        documentKey: "privacy",
        documentVersion: "2026-09-14",
        purposes: ["birth_profile"],
      }),
    ).toThrow();

    expect(() =>
      ConsentRequestV1Schema.parse({
        version: 1,
        documentKey: "privacy",
        documentVersion: "2026-09-14",
        purposes: ["birth_profile", "analytics", "personalization"],
      }),
    ).toThrow();
  });

  it("fails closed on duplicate or missing purposes in 4-item array", () => {
    expect(() =>
      ConsentRequestV1Schema.parse({
        version: 1,
        documentKey: "privacy",
        documentVersion: "2026-09-14",
        purposes: ["birth_profile", "birth_profile", "analytics", "personalization"],
      }),
    ).toThrow();
  });

  it("fails closed on arbitrary or unknown purpose strings", () => {
    expect(() =>
      ConsentRequestV1Schema.parse({
        version: 1,
        documentKey: "privacy",
        documentVersion: "2026-09-14",
        purposes: ["birth_profile", "analytics", "personalization", "marketing"],
      }),
    ).toThrow();
  });

  it("fails closed on legacy single-purpose request body", () => {
    expect(() =>
      ConsentRequestV1Schema.parse({
        version: 1,
        documentKey: "privacy",
        documentVersion: "2026-09-14",
        purpose: "birth_profile",
      }),
    ).toThrow();
  });

  it("fails closed when visitorId is not a valid UUID", () => {
    expect(() =>
      ConsentRequestV1Schema.parse({
        version: 1,
        documentKey: "privacy",
        documentVersion: "2026-09-14",
        purposes: ["birth_profile", "analytics", "personalization", "offers"],
        visitorId: "vis_12345",
      }),
    ).toThrow();

    expect(() =>
      ConsentRequestV1Schema.parse({
        version: 1,
        documentKey: "privacy",
        documentVersion: "2026-09-14",
        purposes: ["birth_profile", "analytics", "personalization", "offers"],
        visitorId: "not-a-uuid-string",
      }),
    ).toThrow();
  });
});
