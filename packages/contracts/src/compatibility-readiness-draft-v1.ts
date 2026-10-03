import { z } from "zod";

const id = z.string().trim().min(1);
const sha256 = z.string().regex(/^[a-f0-9]{64}$/);
const instant = z.iso.datetime({ offset: true });

/** Design-only references. Parsing never proves ownership, consent, or source readiness. */
export const CompatibilitySourceReferenceDraftV1Schema = z.object({
  calculationRunId: id,
  chartVersionId: id,
  evidenceSetId: id,
  evidenceVersion: id,
  engineVersion: id,
  adapterVersion: id,
  ruleSetVersion: id,
  normalizedSnapshotHash: sha256,
  evidenceSnapshotHash: sha256,
  limitations: z.array(id),
}).strict();

const consent = z.object({
  recordId: id,
  grantingParticipantUserId: id,
  profileRevisionId: id,
  counterpartProfileRevisionId: id,
  documentVersion: id,
  purpose: z.literal("compatibility.two-system-synthesis"),
  grantedAt: instant,
  revokedAt: z.null(),
}).strict();

const participant = z.object({
  profileId: id,
  profileRevisionId: id,
  profileOwnerUserId: id,
  subjectParticipantUserId: id,
  consent,
  sources: z.object({
    ziwei: CompatibilitySourceReferenceDraftV1Schema,
    bazi: CompatibilitySourceReferenceDraftV1Schema,
  }).strict(),
}).strict();

/** OD-005 Option C requires both systems for both participants; no single-system fallback. */
export const CompatibilityPairReadinessDraftV1Schema = z.object({
  contractVersion: z.literal("compatibility.readiness.draft.v1"),
  intendedOwnerUserId: id,
  frozenAt: instant,
  participants: z.tuple([participant, participant]),
}).strict().superRefine((value, context) => {
  const [first, second] = value.participants;
  if (first.profileId === second.profileId || first.profileRevisionId === second.profileRevisionId) {
    context.addIssue({ code: "custom", path: ["participants"], message: "Two distinct profiles and revisions are required" });
  }
  for (const [index, person] of value.participants.entries()) {
    const counterpart = value.participants[index === 0 ? 1 : 0];
    if (person.consent.profileRevisionId !== person.profileRevisionId ||
        person.consent.counterpartProfileRevisionId !== counterpart.profileRevisionId ||
        person.consent.grantingParticipantUserId !== person.subjectParticipantUserId) {
      context.addIssue({ code: "custom", path: ["participants", index, "consent"], message: "Consent must bind the participant and both exact revisions" });
    }
    if (Date.parse(person.consent.grantedAt) > Date.parse(value.frozenAt)) {
      context.addIssue({ code: "custom", path: ["participants", index, "consent", "grantedAt"], message: "Consent must precede the source freeze" });
    }
  }
});

export type CompatibilityPairReadinessDraftV1 = z.infer<typeof CompatibilityPairReadinessDraftV1Schema>;
