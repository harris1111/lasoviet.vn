import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  createBirthProfileSubmission,
  type BirthProfileSubmissionDependencies,
} from "./save-birth-profile";

const profile = {
  version: 1,
  calendar: { kind: "solar" as const, date: "1990-01-01" },
  time: { precision: "unknown" as const },
  timezone: { offsetMinutes: 420 },
  consentVersion: "2026-09-01",
};

const readingContext = {
  version: 1 as const,
  lifeStage: "early_career" as const,
};

function dependencies(): BirthProfileSubmissionDependencies & {
  resolveCurrentActor: ReturnType<typeof vi.fn>;
  privateApiClient: ReturnType<typeof vi.fn>;
  request: ReturnType<typeof vi.fn>;
} {
  const request = vi.fn();
  return {
    resolveCurrentActor: vi.fn().mockResolvedValue({
      kind: "account",
      userId: "account-1",
      sessionId: "session-1",
      requestId: "server-request-id",
    }),
    privateApiClient: vi.fn().mockReturnValue({ request }),
    request,
  };
}

describe("BirthProfile server submission", () => {
  it("rejects missing consent without auth, consent, or profile calls", async () => {
    const subject = dependencies();

    await expect(
      createBirthProfileSubmission(subject)({
        profile,
        explicitConsent: false,
      }),
    ).resolves.toMatchObject({
      ok: false,
      error: { code: "CONSENT_REQUIRED" },
    });
    expect(subject.resolveCurrentActor).not.toHaveBeenCalled();
    expect(subject.privateApiClient).not.toHaveBeenCalled();
    expect(subject.request).not.toHaveBeenCalled();
  });

  it("records consent before persisting an unknown-time profile", async () => {
    const subject = dependencies();
    subject.request
      .mockResolvedValueOnce({ ok: true, value: { id: "consent-1" } })
      .mockResolvedValueOnce({
        ok: true,
        value: {
          profileId: "profile-1",
          revisionId: "revision-1",
          ziweiEligibility: {
            version: 1,
            eligible: false,
            reason: "TIME_UNKNOWN",
          },
          revisionNumber: 1,
          originalInput: profile,
          normalizedInput: { normalizedTime: { precision: "unknown" } },
          normalizationWarnings: [],
          limitations: ["TIME_UNKNOWN"],
        },
      });

    await expect(
      createBirthProfileSubmission(subject)({
        profile,
        explicitConsent: true,
        userId: "attacker-owner",
        expiresAt: "never",
      } as never),
    ).resolves.toEqual({
      ok: true,
      value: {
        profileId: "profile-1",
        revisionId: "revision-1",
        ziweiEligibility: {
          version: 1,
          eligible: false,
          reason: "TIME_UNKNOWN",
        },
      },
    });
    expect(subject.privateApiClient).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "account-1" }),
      "server-request-id",
    );
    expect(subject.request.mock.calls).toEqual([
      [
        "/privacy/consents",
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            version: 1,
            documentKey: "privacy",
            documentVersion: "2026-09-01",
            purpose: "birth-profile-calculation",
          }),
        },
      ],
      [
        "/birth-profiles",
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(profile),
        },
      ],
    ]);
  });

  it("posts the strict wrapper after consent for valid one-field context", async () => {
    const subject = dependencies();
    subject.request
      .mockResolvedValueOnce({ ok: true, value: { id: "consent-1" } })
      .mockResolvedValueOnce({
        ok: true,
        value: {
          profileId: "profile-1",
          revisionId: "revision-1",
          ziweiEligibility: { version: 1, eligible: true, timeIndex: 3 },
        },
      });

    await expect(
      createBirthProfileSubmission(subject)({
        profile,
        explicitConsent: true,
        readingContext,
      }),
    ).resolves.toMatchObject({ ok: true });

    expect(subject.request.mock.calls[1]).toEqual([
      "/birth-profiles",
      expect.objectContaining({
        body: JSON.stringify({ profile, readingContext }),
      }),
    ]);
  });

  it("posts the strict wrapper after consent for valid two-field context", async () => {
    const subject = dependencies();
    const twoFieldContext = { ...readingContext, topConcern: "money" as const };
    subject.request
      .mockResolvedValueOnce({ ok: true, value: { id: "consent-1" } })
      .mockResolvedValueOnce({
        ok: true,
        value: {
          profileId: "profile-1",
          revisionId: "revision-1",
          ziweiEligibility: { version: 1, eligible: true, timeIndex: 3 },
        },
      });

    await createBirthProfileSubmission(subject)({
      profile,
      explicitConsent: true,
      readingContext: twoFieldContext,
    });

    expect(subject.request.mock.calls[1]).toEqual([
      "/birth-profiles",
      expect.objectContaining({
        body: JSON.stringify({ profile, readingContext: twoFieldContext }),
      }),
    ]);
  });

  it("rejects invalid, empty, and unknown reading context before auth or network", async () => {
    for (const invalidContext of [
      {},
      { version: 1 },
      { version: 1, lifeStage: "invalid" },
      { version: 1, lifeStage: "early_career", unexpected: true },
    ]) {
      const subject = dependencies();

      await expect(
        createBirthProfileSubmission(subject)({
          profile,
          explicitConsent: true,
          readingContext: invalidContext,
        }),
      ).resolves.toMatchObject({
        ok: false,
        error: { code: "VALIDATION_FAILED" },
      });
      expect(subject.resolveCurrentActor).not.toHaveBeenCalled();
      expect(subject.privateApiClient).not.toHaveBeenCalled();
      expect(subject.request).not.toHaveBeenCalled();
    }
  });

  it("maps backend normalization failures to validation errors", async () => {
    const subject = dependencies();
    subject.request
      .mockResolvedValueOnce({ ok: true, value: { id: "consent-1" } })
      .mockResolvedValueOnce({
        ok: false,
        error: {
          code: "INVALID_TIMEZONE",
          messageKey: "birthProfile.invalid_timezone",
          retryable: false,
          field: "timezone.ianaZone",
          details: { source: "backend" },
        },
      });

    await expect(
      createBirthProfileSubmission(subject)({
        profile: {
          ...profile,
          timezone: { ianaZone: "Invalid/Zone" },
        },
        explicitConsent: true,
      }),
    ).resolves.toMatchObject({
      ok: false,
      error: { code: "VALIDATION_FAILED" },
    });
  });

  it("maps reading context failures to validation errors without retrying", async () => {
    const subject = dependencies();
    subject.request
      .mockResolvedValueOnce({ ok: true, value: { id: "consent-1" } })
      .mockResolvedValueOnce({
        ok: false,
        error: {
          code: "READING_CONTEXT_INVALID",
          messageKey: "birthProfile.reading_context_invalid",
          retryable: false,
        },
      });

    await expect(
      createBirthProfileSubmission(subject)({
        profile,
        explicitConsent: true,
        readingContext,
      }),
    ).resolves.toMatchObject({
      ok: false,
      error: { code: "VALIDATION_FAILED" },
    });
    expect(subject.request).toHaveBeenCalledTimes(2);
  });

  it("returns only the approved success fields and preserves anonymous expiry", async () => {
    const subject = dependencies();
    subject.resolveCurrentActor.mockResolvedValue({
      kind: "anonymous",
      anonymousActorId: "anonymous-1",
      sessionId: "session-1",
      requestId: "server-request-id",
      expiresAt: "2026-09-16T00:00:00.000Z",
    });
    subject.request
      .mockResolvedValueOnce({ ok: true, value: { id: "consent-1" } })
      .mockResolvedValueOnce({
        ok: true,
        value: {
          profileId: "profile-1",
          revisionId: "revision-1",
          ziweiEligibility: { version: 1, eligible: true, timeIndex: 3 },
          internalOnly: "do-not-project",
        },
      });

    await expect(
      createBirthProfileSubmission(subject)({
        profile,
        explicitConsent: true,
      }),
    ).resolves.toEqual({
      ok: true,
      value: {
        profileId: "profile-1",
        revisionId: "revision-1",
        ziweiEligibility: { version: 1, eligible: true, timeIndex: 3 },
        expiresAt: "2026-09-16T00:00:00.000Z",
      },
    });
    expect(subject.privateApiClient).toHaveBeenCalledWith(
      {
        kind: "anonymous",
        anonymousActorId: "anonymous-1",
        sessionId: "session-1",
        requestId: "server-request-id",
        expiresAt: "2026-09-16T00:00:00.000Z",
      },
      "server-request-id",
    );
  });

  it("does not persist a profile after a failed consent response", async () => {
    const subject = dependencies();
    subject.request.mockResolvedValueOnce({
      ok: false,
      error: { code: "CONSENT_VERSION_UNKNOWN" },
    });

    await expect(
      createBirthProfileSubmission(subject)({
        profile,
        explicitConsent: true,
      }),
    ).resolves.toMatchObject({
      ok: false,
      error: { code: "PROFILE_FORBIDDEN" },
    });
    expect(subject.request).toHaveBeenCalledTimes(1);
  });
});
