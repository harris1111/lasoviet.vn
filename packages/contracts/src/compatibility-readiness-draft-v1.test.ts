import { describe, expect, it } from "vitest";
import { CompatibilityPairReadinessDraftV1Schema } from "./compatibility-readiness-draft-v1.js";

function fixture() {
  const source = (system: string, person: number) => ({
    calculationRunId: `${system}-run-${person}`, chartVersionId: `${system}-chart-${person}`,
    evidenceSetId: `${system}-evidence-${person}`, evidenceVersion: "fixture-only.v1",
    engineVersion: "fixture-only", adapterVersion: "fixture-only", ruleSetVersion: "fixture-only",
    normalizedSnapshotHash: "a".repeat(64), evidenceSnapshotHash: "b".repeat(64), limitations: [],
  });
  const person = (index: number, counterpart: number) => ({
    profileId: `profile-${index}`, profileRevisionId: `revision-${index}`,
    profileOwnerUserId: `owner-${index}`, subjectParticipantUserId: `participant-${index}`,
    consent: { recordId: `consent-${index}`, grantingParticipantUserId: `participant-${index}`,
      profileRevisionId: `revision-${index}`, counterpartProfileRevisionId: `revision-${counterpart}`,
      documentVersion: "unapproved-fixture.v1", purpose: "compatibility.two-system-synthesis",
      grantedAt: "2026-09-30T08:00:00.000Z", revokedAt: null },
    sources: { ziwei: source("ziwei", index), bazi: source("bazi", index) },
  });
  return { contractVersion: "compatibility.readiness.draft.v1", intendedOwnerUserId: "owner-1",
    frozenAt: "2026-09-30T09:00:00.000Z", participants: [person(1, 2), person(2, 1)] };
}

describe("OD-005 dual-system compatibility draft boundary", () => {
  it("describes two consented revision pairs and keeps their source systems separate", () => {
    expect(CompatibilityPairReadinessDraftV1Schema.safeParse(fixture()).success).toBe(true);
  });
  it("rejects Zi Wei-only input rather than inventing a BaZi substitute", () => {
    const value = fixture();
    const { bazi: _unused, ...ziweiOnly } = value.participants[1]!.sources;
    expect(CompatibilityPairReadinessDraftV1Schema.safeParse({ ...value, participants: [value.participants[0], { ...value.participants[1], sources: ziweiOnly }] }).success).toBe(false);
  });
  it.each(["revoked", "late", "wrong_participant", "wrong_revision", "wrong_counterpart", "no_version"])("rejects %s consent", (failure) => {
    const value = fixture();
    const consent = value.participants[1]!.consent;
    const changes = {
      revoked: { revokedAt: "2026-09-30T08:30:00.000Z" }, late: { grantedAt: "2026-09-30T10:00:00.000Z" },
      wrong_participant: { grantingParticipantUserId: "initiator" }, wrong_revision: { profileRevisionId: "older-revision" },
      wrong_counterpart: { counterpartProfileRevisionId: "other-person" }, no_version: { documentVersion: "" },
    }[failure]!;
    value.participants[1]!.consent = { ...consent, ...changes } as typeof consent;
    expect(CompatibilityPairReadinessDraftV1Schema.safeParse(value).success).toBe(false);
  });
  it("rejects one profile supplied twice", () => {
    const value = fixture();
    value.participants[1]!.profileId = value.participants[0]!.profileId;
    expect(CompatibilityPairReadinessDraftV1Schema.safeParse(value).success).toBe(false);
  });
  it("rejects undeclared scores and missing immutable source hashes", () => {
    expect(CompatibilityPairReadinessDraftV1Schema.safeParse({ ...fixture(), compatibilityScore: 99 }).success).toBe(false);
    const value = fixture();
    value.participants[1]!.sources.bazi.normalizedSnapshotHash = "";
    expect(CompatibilityPairReadinessDraftV1Schema.safeParse(value).success).toBe(false);
  });
});
