import { readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

import type { BirthProfileV1 } from "@lasoviet/contracts";

import {
  createBirthProfileService,
  normalizeBirthProfile,
  resolveZiweiTimeIndex,
} from "./birth-profile.service.js";

type BirthProfileFixture = {
  input: BirthProfileV1;
  expected: {
    normalized?: Record<string, unknown>;
    eligibility:
      | { ok: true; value: number }
      | { ok: false; code: string };
  };
};

const fixtureNames = [
  "exact-minute-offset",
  "traditional-branch",
  "range-within-branch",
  "range-crossing-branches",
  "unknown-time",
  "iana-zone",
  "historical-dst",
  "solar-input",
  "lunar-input",
] as const;

async function fixture(name: (typeof fixtureNames)[number]) {
  const path = new URL(
    `../../../../tests/fixtures/birth-profile/${name}.json`,
    import.meta.url,
  );
  return JSON.parse(await readFile(path, "utf8")) as BirthProfileFixture;
}

describe("BirthProfile normalization", () => {
  it.each(fixtureNames)(
    "preserves input and resolves time precision for %s",
    async (name) => {
      const testCase = await fixture(name);
      const normalized = normalizeBirthProfile(testCase.input);

      expect(normalized.ok).toBe(true);
      if (!normalized.ok) {
        return;
      }

      expect(normalized.value.originalInput).toEqual(testCase.input);
      expect(normalized.value).toMatchObject(testCase.expected.normalized ?? {});

      const eligibility = resolveZiweiTimeIndex(normalized.value);
      if (testCase.expected.eligibility.ok) {
        expect(eligibility).toEqual(testCase.expected.eligibility);
      } else {
        expect(eligibility).toMatchObject({
          ok: false,
          error: { code: testCase.expected.eligibility.code },
        });
      }
    },
  );

  it("rejects an invalid IANA zone even when time precision is unknown", () => {
    expect(
      normalizeBirthProfile({
        version: 1,
        calendar: { kind: "solar", date: "1990-01-01" },
        time: { precision: "unknown" },
        timezone: { ianaZone: "Invalid/Zone" },
        consentVersion: "2026-09-01",
      }),
    ).toMatchObject({
      ok: false,
      error: { code: "INVALID_TIMEZONE" },
    });
  });

  it("rejects an inverted same-date birth-time range", () => {
    expect(
      normalizeBirthProfile({
        version: 1,
        calendar: { kind: "solar", date: "1990-01-01" },
        time: {
          precision: "range",
          startLocalTime: "10:30",
          endLocalTime: "09:30",
        },
        timezone: { offsetMinutes: 420 },
        consentVersion: "2026-09-01",
      }),
    ).toMatchObject({
      ok: false,
      error: { code: "INVALID_CALENDAR_INPUT" },
    });
  });
});

describe("BirthProfile service", () => {
  it("uses the resolved anonymous actor and appends normalized revisions", async () => {
    const writes: Array<Record<string, unknown>> = [];
    const service = createBirthProfileService({
      repository: {
        async create(input) {
          writes.push({ operation: "create", ...input });
          return {
            profileId: "profile-1",
            revisionId: "revision-1",
            revisionNumber: 1,
          };
        },
        async update(input) {
          writes.push({ operation: "update", ...input });
          return {
            profileId: input.profileId!,
            revisionId: "revision-2",
            revisionNumber: 2,
          };
        },
        async read(_actor, profileId) {
          return {
            profileId,
            revisionId: "revision-1",
            revisionNumber: 1,
            originalInput: {},
            normalizedInput: {},
            normalizationWarnings: [],
            limitations: [],
          };
        },
        async archive() {
          return false;
        },
      },
      now: () => new Date("2026-09-01T00:00:00Z"),
    });
    const testCase = await fixture("exact-minute-offset");
    const actor = {
      kind: "anonymous" as const,
      anonymousActorId: "anonymous-1",
      sessionId: "session-1",
      requestId: "request-1",
      expiresAt: "2026-09-02T00:00:00.000+00:00",
    };

    await expect(service.create(actor, testCase.input)).resolves.toMatchObject({
      ok: true,
      value: {
        profileId: "profile-1",
        revisionNumber: 1,
        ziweiEligibility: { version: 1, eligible: true, timeIndex: 5 },
      },
    });
    await expect(
      service.update(actor, "profile-1", testCase.input),
    ).resolves.toMatchObject({
      ok: true,
      value: {
        profileId: "profile-1",
        revisionNumber: 2,
        ziweiEligibility: { version: 1, eligible: true, timeIndex: 5 },
      },
    });

    expect(writes).toEqual([
      expect.objectContaining({
        operation: "create",
        actor: expect.objectContaining({
          anonymousActorId: "anonymous-1",
          expiresAt: "2026-09-02T00:00:00.000+00:00",
        }),
        revisionNumber: 1,
      }),
      expect.objectContaining({
        operation: "update",
        profileId: "profile-1",
        actor: expect.objectContaining({
          anonymousActorId: "anonymous-1",
        }),
      }),
    ]);
    expect(writes[0]?.normalized).toMatchObject({
      utcInstant: "1990-01-01T02:30:00.000Z",
    });
  });

  it("returns an ineligible Zi Wei state for an unknown birth time", async () => {
    const service = createBirthProfileService({
      repository: {
        async create() {
          return {
            profileId: "profile-unknown",
            revisionId: "revision-unknown",
            revisionNumber: 1,
          };
        },
        async update() {
          return null;
        },
        async read() {
          return null;
        },
        async archive() {
          return false;
        },
      },
    });
    const testCase = await fixture("unknown-time");

    await expect(
      service.create(
        {
          kind: "account",
          userId: "user-1",
          sessionId: "session-1",
          requestId: "request-1",
        },
        testCase.input,
      ),
    ).resolves.toMatchObject({
      ok: true,
      value: {
        profileId: "profile-unknown",
        ziweiEligibility: {
          version: 1,
          eligible: false,
          reason: "TIME_UNKNOWN",
        },
      },
    });
  });

  it("derives read eligibility from the stored normalized revision", async () => {
    const service = createBirthProfileService({
      repository: {
        async create() {
          return null;
        },
        async update() {
          return null;
        },
        async read(_actor, profileId) {
          return {
            profileId,
            revisionId: "revision-stored",
            revisionNumber: 1,
            originalInput: {
              version: 1,
              calendar: { kind: "solar", date: "1990-01-01" },
              time: { precision: "unknown" },
              timezone: { offsetMinutes: 420 },
              consentVersion: "2026-09-01",
            },
            normalizedInput: {
              version: 1,
              normalizedCalendar: { kind: "solar", date: "1990-01-01" },
              normalizedTime: {
                precision: "exact_minute",
                localTime: "11:30",
              },
              timezoneProvenance: { source: "offset", offsetMinutes: 420 },
              utcInstant: "1990-01-01T04:30:00.000Z",
              normalizationWarnings: [],
              limitations: [],
            },
            normalizationWarnings: [],
            limitations: [],
          };
        },
        async archive() {
          return false;
        },
      },
    });

    await expect(
      service.read(
        {
          kind: "account",
          userId: "user-1",
          sessionId: "session-1",
          requestId: "request-1",
        },
        "profile-1",
      ),
    ).resolves.toMatchObject({
      ok: true,
      value: {
        profileId: "profile-1",
        ziweiEligibility: { version: 1, eligible: true, timeIndex: 6 },
      },
    });
  });
});
