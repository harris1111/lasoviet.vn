import { describe, expect, it, vi } from "vitest";
import {
  ConsentRepositoryError,
  type ConsentRepository,
} from "./consent.repository.js";
import { createConsentService } from "./consent.service.js";

describe("ConsentService", () => {
  const actor = {
    kind: "account" as const,
    userId: "usr_1",
    sessionId: "sess_1",
    requestId: "req_1",
  };
  const versions = {
    privacy: ["2026-09-14"],
  };

  it("records exactly four purposes and passes them to repository", async () => {
    const mockRepo: ConsentRepository = {
      record: vi.fn().mockResolvedValue({ id: "c1", ids: ["c1", "c2", "c3", "c4"] }),
    };
    const service = createConsentService({
      repository: mockRepo,
      documentVersions: versions,
      now: () => new Date("2026-09-14T10:00:00Z"),
    });

    const res = await service.record(
      actor,
      "privacy",
      "2026-09-14",
      ["birth_profile", "analytics", "personalization", "offers"],
      "vis_1",
    );

    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.value.ids).toHaveLength(4);
    }
    expect(mockRepo.record).toHaveBeenCalledWith({
      actor,
      documentKey: "privacy",
      documentVersion: "2026-09-14",
      purposes: ["birth_profile", "analytics", "personalization", "offers"],
      visitorId: "vis_1",
      grantedAt: new Date("2026-09-14T10:00:00Z"),
    });
  });

  it("rejects unknown document versions", async () => {
    const mockRepo: ConsentRepository = { record: vi.fn() };
    const service = createConsentService({ repository: mockRepo, documentVersions: versions });

    const res = await service.record(actor, "privacy", "2026-09-01", ["birth_profile"]);
    expect(res).toEqual({
      ok: false,
      error: {
        code: "CONSENT_VERSION_UNKNOWN",
        messageKey: "privacy.consent_version_unknown",
        retryable: false,
      },
    });
    expect(mockRepo.record).not.toHaveBeenCalled();
  });

  it("rejects empty purposes array", async () => {
    const mockRepo: ConsentRepository = { record: vi.fn() };
    const service = createConsentService({ repository: mockRepo, documentVersions: versions });

    const res = await service.record(actor, "privacy", "2026-09-14", []);
    expect(res).toEqual({
      ok: false,
      error: {
        code: "CONSENT_VERSION_UNKNOWN",
        messageKey: "privacy.consent_version_unknown",
        retryable: false,
      },
    });
  });

  it("maps PROFILE_FORBIDDEN repository error to typed domain error", async () => {
    const mockRepo: ConsentRepository = {
      record: vi.fn().mockRejectedValue(new ConsentRepositoryError("PROFILE_FORBIDDEN")),
    };
    const service = createConsentService({ repository: mockRepo, documentVersions: versions });

    const res = await service.record(actor, "privacy", "2026-09-14", ["birth_profile", "analytics", "personalization", "offers"], "vis_conflict");
    expect(res.ok).toBe(false);
  });
  it("fails closed when purposes are missing from the canonical 4-purpose set for version 2026-09-14", async () => {
    const mockRepo: ConsentRepository = { record: vi.fn() };
    const service = createConsentService({ repository: mockRepo, documentVersions: versions });

    const res = await service.record(actor, "privacy", "2026-09-14", ["birth_profile", "analytics"]);
    expect(res).toEqual({
      ok: false,
      error: { code: "CONSENT_VERSION_UNKNOWN", messageKey: "privacy.consent_version_unknown", retryable: false },
    });
  });

  it("fails closed when duplicate purposes are provided for version 2026-09-14", async () => {
    const mockRepo: ConsentRepository = { record: vi.fn() };
    const service = createConsentService({ repository: mockRepo, documentVersions: versions });

    const res = await service.record(actor, "privacy", "2026-09-14", ["birth_profile", "birth_profile", "analytics", "offers"]);
    expect(res).toEqual({
      ok: false,
      error: { code: "CONSENT_VERSION_UNKNOWN", messageKey: "privacy.consent_version_unknown", retryable: false },
    });
  });

  it("fails closed when unknown purpose strings are provided for version 2026-09-14", async () => {
    const mockRepo: ConsentRepository = { record: vi.fn() };
    const service = createConsentService({ repository: mockRepo, documentVersions: versions });

    const res = await service.record(actor, "privacy", "2026-09-14", ["birth_profile", "analytics", "personalization", "marketing"]);
    expect(res).toEqual({
      ok: false,
      error: { code: "CONSENT_VERSION_UNKNOWN", messageKey: "privacy.consent_version_unknown", retryable: false },
    });
  });

  it("fails closed when extra purposes are provided for version 2026-09-14", async () => {
    const mockRepo: ConsentRepository = { record: vi.fn() };
    const service = createConsentService({ repository: mockRepo, documentVersions: versions });

    const res = await service.record(actor, "privacy", "2026-09-14", ["birth_profile", "analytics", "personalization", "offers", "extra"]);
    expect(res).toEqual({
      ok: false,
      error: { code: "CONSENT_VERSION_UNKNOWN", messageKey: "privacy.consent_version_unknown", retryable: false },
    });
  });
});
