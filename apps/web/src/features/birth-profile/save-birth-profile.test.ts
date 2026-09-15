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
  consentVersion: "2026-09-14",
};

function dependencies(): BirthProfileSubmissionDependencies & {
  resolveCurrentActor: ReturnType<typeof vi.fn>;
  privateApiClient: ReturnType<typeof vi.fn>;
  getVisitorId: ReturnType<typeof vi.fn>;
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
    getVisitorId: vi.fn().mockResolvedValue("123e4567-e89b-12d3-a456-426614174000"),
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
      })
      .mockResolvedValueOnce({ ok: true, value: undefined }); // associate-profile

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
            documentVersion: "2026-09-14",
            purposes: ["birth_profile", "analytics", "personalization", "offers"],
            visitorId: "123e4567-e89b-12d3-a456-426614174000",
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
      [
        "/privacy/associate-profile",
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ version: 1, visitorId: "123e4567-e89b-12d3-a456-426614174000", profileId: "profile-1" }),
        },
      ],
    ]);
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

  it("fails closed when post-create profile association throws (with one immediate retry before failure)", async () => {
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
        },
      })
      .mockRejectedValueOnce(new Error("association failed attempt 1"))
      .mockRejectedValueOnce(new Error("association failed attempt 2"));

    const result = await createBirthProfileSubmission(subject)({
      profile,
      explicitConsent: true,
    });

    expect(result).toMatchObject({
      ok: false,
      error: { code: "PROFILE_FORBIDDEN" },
    });
    // Verify visitorId is never emitted
    expect(result).not.toHaveProperty("visitorId");
    // Initial consent + profile creation + 2 association attempts
    expect(subject.request).toHaveBeenCalledTimes(4);
  });

  it("fails closed through non-success path if visitor cookie reconciliation fails before consent or profile creation", async () => {
    const subject = dependencies();
    subject.getVisitorId.mockRejectedValueOnce(new Error("cookie reconciliation failure"));

    const result = await createBirthProfileSubmission(subject)({
      profile,
      explicitConsent: true,
    });

    expect(result).toMatchObject({
      ok: false,
      error: { code: "PROFILE_FORBIDDEN" },
    });
    // Must not call consent or birth-profile persistence
    expect(subject.request).not.toHaveBeenCalled();
  });

  it("fails closed when post-create profile association returns non-success outcome {ok:false}", async () => {
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
        },
      })
      .mockResolvedValueOnce({ ok: false, error: { code: "PROFILE_NOT_FOUND" } })
      .mockResolvedValueOnce({ ok: false, error: { code: "PROFILE_NOT_FOUND" } });

    const result = await createBirthProfileSubmission(subject)({
      profile,
      explicitConsent: true,
    });

    expect(result).toMatchObject({
      ok: false,
      error: { code: "PROFILE_FORBIDDEN" },
    });
    expect(subject.request).toHaveBeenCalledTimes(4);
  });

  it("fails closed when post-create profile association returns malformed outcome", async () => {
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
        },
      })
      .mockResolvedValueOnce("malformed string response")
      .mockResolvedValueOnce(null);

    const result = await createBirthProfileSubmission(subject)({
      profile,
      explicitConsent: true,
    });

    expect(result).toMatchObject({
      ok: false,
      error: { code: "PROFILE_FORBIDDEN" },
    });
    expect(subject.request).toHaveBeenCalledTimes(4);
  });

  it("succeeds when post-create profile association succeeds on immediate retry", async () => {
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
        },
      })
      .mockRejectedValueOnce(new Error("transient glitch"))
      .mockResolvedValueOnce({ ok: true, value: undefined });

    const result = await createBirthProfileSubmission(subject)({
      profile,
      explicitConsent: true,
    });

    expect(result).toEqual({
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
    if (result.ok) {
      expect("visitorId" in result.value).toBe(false);
    }
    expect(subject.request).toHaveBeenCalledTimes(4);
  });
});
