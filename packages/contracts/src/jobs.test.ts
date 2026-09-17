import { describe, expect, it } from "vitest";
import {
  ReportGenerationRequestedV1Schema,
  ReportGenerationRequestedV2Schema,
  ReportGenerateJobEnvelopeV1Schema,
  ReportGenerateJobEnvelopeV2Schema,
  ReportGenerateJobEnvelopeSchema,
  type ReportGenerationRequestedV1,
  type ReportGenerationRequestedV2,
  type ReportGenerateJobEnvelopeV1,
  type ReportGenerateJobEnvelopeV2,
  GeneratedPreviewGenerateJobV1Schema,
} from "./jobs.js";

function createValidV1Payload(): ReportGenerationRequestedV1 {
  return {
    reportId: "report-uuid-1",
    reportVersionId: "report-ver-uuid-1",
    entitlementId: "entitlement-uuid-1",
    chartVersionId: "chart-ver-uuid-1",
    evidenceVersionId: "evidence-ver-uuid-1",
    knowledgeVersionId: "ziwei.comprehensive.knowledge.v3",
    promptVersion: "ziwei.comprehensive.v3",
    reportConfigVersion: "ziwei.report.v1",
    locale: "vi",
    sku: "ZIWEI-IDENTITY-P0",
  };
}

function createValidV2Payload(): ReportGenerationRequestedV2 {
  return {
    reportId: "report-uuid-2",
    reportVersionId: "report-ver-uuid-2",
    entitlementId: "entitlement-uuid-2",
    chartVersionId: "chart-ver-uuid-2",
    evidenceVersionId: "evidence-ver-uuid-2",
    knowledgeVersionId: "ziwei.comprehensive.knowledge.v4",
    promptVersion: "ziwei.comprehensive.v4",
    reportConfigVersion: "ziwei.report.v2",
    locale: "vi",
    sku: "ZIWEI-IDENTITY-P0",
    asOfDate: "2026-09-12",
    targetYear: 2026,
    timingRuleVersion: "ziwei.timing.v1",
    sensitivityRuleVersion: "ziwei.sensitivity.v1",
  };
}

function createValidV1Envelope(): ReportGenerateJobEnvelopeV1 {
  return {
    schemaVersion: 1,
    name: "report.generate.v1",
    sourceEventId: "source-event-1",
    traceId: "trace-id-1",
    idempotencyKey: "idemp-key-1",
    payload: createValidV1Payload(),
  };
}

function createValidV2Envelope(): ReportGenerateJobEnvelopeV2 {
  return {
    schemaVersion: 2,
    name: "report.generate.v2",
    sourceEventId: "source-event-2",
    traceId: "trace-id-2",
    idempotencyKey: "idemp-key-2",
    payload: createValidV2Payload(),
  };
}

describe("ReportGenerationRequested contracts", () => {
  describe("V1 schema", () => {
    it("validates a compliant V1 payload", () => {
      const payload = createValidV1Payload();
      const parsed = ReportGenerationRequestedV1Schema.safeParse(payload);
      expect(parsed.success).toBe(true);
    });

    it("rejects when V2 timing fields are present", () => {
      const v2Payload = createValidV2Payload();
      const parsed = ReportGenerationRequestedV1Schema.safeParse(v2Payload);
      expect(parsed.success).toBe(false);
    });

    it("rejects reading context revision IDs", () => {
      const payload = {
        ...createValidV1Payload(),
        readingContextRevisionId: "reading-context-revision-1",
      };
      expect(ReportGenerationRequestedV1Schema.safeParse(payload).success).toBe(false);
    });

    it("rejects unknown extra fields", () => {
      const payload = { ...createValidV1Payload(), extraField: "invalid" };
      const parsed = ReportGenerationRequestedV1Schema.safeParse(payload);
      expect(parsed.success).toBe(false);
    });
  });

  describe("V2 schema", () => {
    it("validates a compliant V2 payload with matching targetYear and asOfDate", () => {
      const payload = createValidV2Payload();
      const parsed = ReportGenerationRequestedV2Schema.safeParse(payload);
      expect(parsed.success).toBe(true);
    });

    it("accepts legacy payloads that omit readingContextRevisionId without adding it", () => {
      const parsed = ReportGenerationRequestedV2Schema.safeParse(createValidV2Payload());
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data).not.toHaveProperty("readingContextRevisionId");
      }
    });

    it("accepts explicit null readingContextRevisionId", () => {
      const parsed = ReportGenerationRequestedV2Schema.safeParse({
        ...createValidV2Payload(),
        readingContextRevisionId: null,
      });
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.readingContextRevisionId).toBeNull();
      }
    });

    it("trims a nonblank readingContextRevisionId", () => {
      const parsed = ReportGenerationRequestedV2Schema.safeParse({
        ...createValidV2Payload(),
        readingContextRevisionId: "  reading-context-revision-1  ",
      });
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.readingContextRevisionId).toBe("reading-context-revision-1");
      }
    });

    it("rejects invalid readingContextRevisionId values", () => {
      for (const readingContextRevisionId of ["", "   ", 123, {}, []]) {
        const payload = { ...createValidV2Payload(), readingContextRevisionId };
        expect(ReportGenerationRequestedV2Schema.safeParse(payload).success).toBe(false);
      }
    });

    it("requires asOfDate", () => {
      const payload = createValidV2Payload() as any;
      delete payload.asOfDate;
      expect(ReportGenerationRequestedV2Schema.safeParse(payload).success).toBe(false);
    });

    it("requires targetYear", () => {
      const payload = createValidV2Payload() as any;
      delete payload.targetYear;
      expect(ReportGenerationRequestedV2Schema.safeParse(payload).success).toBe(false);
    });

    it("requires timingRuleVersion", () => {
      const payload = createValidV2Payload() as any;
      delete payload.timingRuleVersion;
      expect(ReportGenerationRequestedV2Schema.safeParse(payload).success).toBe(false);
    });

    it("requires sensitivityRuleVersion", () => {
      const payload = createValidV2Payload() as any;
      delete payload.sensitivityRuleVersion;
      expect(ReportGenerationRequestedV2Schema.safeParse(payload).success).toBe(false);
    });

    it("rejects empty or whitespace-only rule versions", () => {
      const payload1 = { ...createValidV2Payload(), timingRuleVersion: "" };
      expect(ReportGenerationRequestedV2Schema.safeParse(payload1).success).toBe(false);

      const payload2 = { ...createValidV2Payload(), timingRuleVersion: "   " };
      expect(ReportGenerationRequestedV2Schema.safeParse(payload2).success).toBe(false);

      const payload3 = { ...createValidV2Payload(), sensitivityRuleVersion: "" };
      expect(ReportGenerationRequestedV2Schema.safeParse(payload3).success).toBe(false);

      const payload4 = { ...createValidV2Payload(), sensitivityRuleVersion: "   " };
      expect(ReportGenerationRequestedV2Schema.safeParse(payload4).success).toBe(false);
    });

    it("rejects invalid asOfDate format", () => {
      const invalidDates = ["2026-9-12", "invalid-date", "2026-02-30", "2026-13-01", ""];
      for (const d of invalidDates) {
        const payload = { ...createValidV2Payload(), asOfDate: d };
        expect(ReportGenerationRequestedV2Schema.safeParse(payload).success).toBe(false);
      }
    });

    it("rejects non-integer targetYear", () => {
      const payload = { ...createValidV2Payload(), targetYear: 2026.5 };
      expect(ReportGenerationRequestedV2Schema.safeParse(payload).success).toBe(false);
    });

    it("rejects mismatch between targetYear and asOfDate calendar year", () => {
      const payload = {
        ...createValidV2Payload(),
        asOfDate: "2026-09-12",
        targetYear: 2025,
      };
      const result = ReportGenerationRequestedV2Schema.safeParse(payload);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.message).toContain("must match asOfDate year");
      }
    });

    it("rejects unknown extra fields on V2 payload", () => {
      const payload = { ...createValidV2Payload(), unknownParam: "unallowed" };
      expect(ReportGenerationRequestedV2Schema.safeParse(payload).success).toBe(false);
    });
  });
});

describe("ReportGenerateJobEnvelope schemas", () => {
  describe("V1 envelope", () => {
    it("validates compliant V1 envelope", () => {
      const envelope = createValidV1Envelope();
      expect(ReportGenerateJobEnvelopeV1Schema.safeParse(envelope).success).toBe(true);
    });

    it("rejects envelope with schemaVersion 2", () => {
      const envelope = { ...createValidV1Envelope(), schemaVersion: 2 };
      expect(ReportGenerateJobEnvelopeV1Schema.safeParse(envelope).success).toBe(false);
    });

    it("rejects envelope with name report.generate.v2", () => {
      const envelope = { ...createValidV1Envelope(), name: "report.generate.v2" };
      expect(ReportGenerateJobEnvelopeV1Schema.safeParse(envelope).success).toBe(false);
    });

    it("rejects V1 envelope containing V2 payload", () => {
      const envelope = { ...createValidV1Envelope(), payload: createValidV2Payload() };
      expect(ReportGenerateJobEnvelopeV1Schema.safeParse(envelope).success).toBe(false);
    });
  });

  describe("V2 envelope", () => {
    it("validates compliant V2 envelope", () => {
      const envelope = createValidV2Envelope();
      expect(ReportGenerateJobEnvelopeV2Schema.safeParse(envelope).success).toBe(true);
    });

    it("preserves omitted, null, and explicit readingContextRevisionId values", () => {
      const legacy = ReportGenerateJobEnvelopeV2Schema.safeParse(createValidV2Envelope());
      expect(legacy.success).toBe(true);
      if (legacy.success) {
        expect(legacy.data.payload).not.toHaveProperty("readingContextRevisionId");
      }

      const cleared = ReportGenerateJobEnvelopeV2Schema.safeParse({
        ...createValidV2Envelope(),
        payload: { ...createValidV2Payload(), readingContextRevisionId: null },
      });
      expect(cleared.success).toBe(true);
      if (cleared.success) {
        expect(cleared.data.payload.readingContextRevisionId).toBeNull();
      }

      const selected = ReportGenerateJobEnvelopeV2Schema.safeParse({
        ...createValidV2Envelope(),
        payload: { ...createValidV2Payload(), readingContextRevisionId: " revision-1 " },
      });
      expect(selected.success).toBe(true);
      if (selected.success) {
        expect(selected.data.payload.readingContextRevisionId).toBe("revision-1");
      }
    });

    it("rejects envelope with schemaVersion 1", () => {
      const envelope = { ...createValidV2Envelope(), schemaVersion: 1 };
      expect(ReportGenerateJobEnvelopeV2Schema.safeParse(envelope).success).toBe(false);
    });

    it("rejects envelope with name report.generate.v1", () => {
      const envelope = { ...createValidV2Envelope(), name: "report.generate.v1" };
      expect(ReportGenerateJobEnvelopeV2Schema.safeParse(envelope).success).toBe(false);
    });

    it("rejects V2 envelope containing V1 payload missing timing fields", () => {
      const envelope = { ...createValidV2Envelope(), payload: createValidV1Payload() };
      expect(ReportGenerateJobEnvelopeV2Schema.safeParse(envelope).success).toBe(false);
    });

    it("rejects unknown extra fields on V2 envelope", () => {
      const envelope = { ...createValidV2Envelope(), extraEnvelopeProp: 123 };
      expect(ReportGenerateJobEnvelopeV2Schema.safeParse(envelope).success).toBe(false);
    });
  });

  describe("ReportGenerateJobEnvelopeSchema (V1|V2 union)", () => {
    it("parses valid V1 envelope", () => {
      const v1Envelope = createValidV1Envelope();
      const parsed = ReportGenerateJobEnvelopeSchema.safeParse(v1Envelope);
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.schemaVersion).toBe(1);
        expect(parsed.data.name).toBe("report.generate.v1");
      }
    });

    it("parses valid V2 envelope", () => {
      const v2Envelope = createValidV2Envelope();
      const parsed = ReportGenerateJobEnvelopeSchema.safeParse(v2Envelope);
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.schemaVersion).toBe(2);
        expect(parsed.data.name).toBe("report.generate.v2");
        expect(parsed.data.payload.asOfDate).toBe("2026-09-12");
        expect(parsed.data.payload.targetYear).toBe(2026);
      }
    });

    it("preserves V2 readingContextRevisionId variants", () => {
      const cases = [
        {
          envelope: createValidV2Envelope(),
          expected: undefined,
        },
        {
          envelope: {
            ...createValidV2Envelope(),
            payload: { ...createValidV2Payload(), readingContextRevisionId: null },
          },
          expected: null,
        },
        {
          envelope: {
            ...createValidV2Envelope(),
            payload: { ...createValidV2Payload(), readingContextRevisionId: " revision-2 " },
          },
          expected: "revision-2",
        },
      ];

      for (const { envelope, expected } of cases) {
        const parsed = ReportGenerateJobEnvelopeSchema.safeParse(envelope);
        expect(parsed.success).toBe(true);
        if (parsed.success) {
          if (expected === undefined) {
            expect(parsed.data.payload).not.toHaveProperty("readingContextRevisionId");
          } else {
            expect(parsed.data.payload.readingContextRevisionId).toBe(expected);
          }
        }
      }
    });

    it("rejects unknown schemaVersion 3", () => {
      const envelope = { ...createValidV1Envelope(), schemaVersion: 3 };
      expect(ReportGenerateJobEnvelopeSchema.safeParse(envelope).success).toBe(false);
    });

    it("rejects envelope where schemaVersion and name are mismatched", () => {
      const mismatched = { ...createValidV1Envelope(), name: "report.generate.v2" };
      expect(ReportGenerateJobEnvelopeSchema.safeParse(mismatched).success).toBe(false);
    });
  });
});

describe("generated preview job contract", () => {
  it("accepts only a bounded section selection and no sensitive payload", () => {
    const job = {
      schemaVersion: 1,
      name: "preview.generate.v1",
      sourceEventId: "event",
      traceId: "trace",
      idempotencyKey: "key",
      payload: { requestId: "request", chartVersionId: "chart", sectionIds: ["coreAxis"] },
    };
    expect(GeneratedPreviewGenerateJobV1Schema.safeParse(job).success).toBe(true);
    expect(GeneratedPreviewGenerateJobV1Schema.safeParse({
      ...job, payload: { ...job.payload, prompt: "secret" },
    }).success).toBe(false);
  });
});
