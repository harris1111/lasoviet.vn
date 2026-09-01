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
