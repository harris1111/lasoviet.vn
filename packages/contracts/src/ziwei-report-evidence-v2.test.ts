import { describe, expect, it } from "vitest";

import {
  ZiweiReportEvidenceItemV2Schema,
  ZiweiReportEvidenceSetV2Schema,
  type ZiweiReportEvidenceSetV2,
} from "./ziwei-report-evidence-v2.js";

function createValidEvidenceSet(): ZiweiReportEvidenceSetV2 {
  return {
    version: 2,
    capabilityId: "ziwei.identity.p0",
    chartVersionId: "chart-version-123",
    reportVersionId: "report-version-456",
    snapshotHash: "a".repeat(64),
    ruleVersion: "ziwei.comprehensive.v4",
    items: [
      {
        key: "natal.ziwei.palace.life",
        dimension: "natal",
        confidence: "moderate",
        sourceKeys: ["ziwei.palace.life"],
      },
      {
        key: "decadal.state.active",
        dimension: "decadal",
        confidence: "moderate",
        sourceKeys: ["timing.decadal.state:active"],
      },
      {
        key: "annual.target-year.2026",
        dimension: "annual",
        confidence: "moderate",
        sourceKeys: ["timing.annual.targetYear:2026"],
      },
      {
        key: "sensitivity.stable.ziwei.palace.life",
        dimension: "sensitivity_stable",
        confidence: "high",
        sourceKeys: ["ziwei.palace.life"],
      },
      {
        key: "sensitivity.sensitive.ziwei.palace.career",
        dimension: "sensitivity_sensitive",
        confidence: "conditional",
        sourceKeys: ["ziwei.palace.career"],
      },
    ],
  };
}

describe("ZiweiReportEvidenceV2Schema", () => {
  it("successfully parses valid evidence set with all required dimensions", () => {
    const valid = createValidEvidenceSet();
    const parsed = ZiweiReportEvidenceSetV2Schema.safeParse(valid);
    expect(parsed.success).toBe(true);
  });

  it("rejects evidence item with mismatched key prefix and dimension", () => {
    const item = {
      key: "annual.target-year.2026",
      dimension: "natal" as const,
      confidence: "moderate" as const,
      sourceKeys: ["target-year"],
    };
    const parsed = ZiweiReportEvidenceItemV2Schema.safeParse(item);
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues[0]?.message).toContain("must be a lowercase identifier starting with 'natal.'");
    }
  });

  it("rejects uppercase letters or special characters in item keys", () => {
    const item = {
      key: "natal.ziwei.palace.Life",
      dimension: "natal" as const,
      confidence: "moderate" as const,
      sourceKeys: ["life"],
    };
    expect(ZiweiReportEvidenceItemV2Schema.safeParse(item).success).toBe(false);
  });

  it("rejects duplicate sourceKeys within an evidence item", () => {
    const item = {
      key: "natal.ziwei.palace.life",
      dimension: "natal" as const,
      confidence: "moderate" as const,
      sourceKeys: ["life", "life"],
    };
    expect(ZiweiReportEvidenceItemV2Schema.safeParse(item).success).toBe(false);
  });

  it("rejects empty sourceKeys array", () => {
    const item = {
      key: "natal.ziwei.palace.life",
      dimension: "natal" as const,
      confidence: "moderate" as const,
      sourceKeys: [],
    };
    expect(ZiweiReportEvidenceItemV2Schema.safeParse(item).success).toBe(false);
  });

  it("rejects duplicate evidence item keys in set", () => {
    const set = createValidEvidenceSet();
    set.items.push({
      key: "natal.ziwei.palace.life",
      dimension: "natal",
      confidence: "moderate",
      sourceKeys: ["another-life"],
    });
    const parsed = ZiweiReportEvidenceSetV2Schema.safeParse(set);
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues[0]?.message).toContain("Duplicate evidence item key");
    }
  });

  it("rejects evidence set missing natal items", () => {
    const set = createValidEvidenceSet();
    set.items = set.items.filter((i) => i.dimension !== "natal");
    const parsed = ZiweiReportEvidenceSetV2Schema.safeParse(set);
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues[0]?.message).toContain("must contain at least one natal item");
    }
  });

  it("rejects evidence set missing decadal items", () => {
    const set = createValidEvidenceSet();
    set.items = set.items.filter((i) => i.dimension !== "decadal");
    expect(ZiweiReportEvidenceSetV2Schema.safeParse(set).success).toBe(false);
  });

  it("rejects evidence set missing annual items", () => {
    const set = createValidEvidenceSet();
    set.items = set.items.filter((i) => i.dimension !== "annual");
    expect(ZiweiReportEvidenceSetV2Schema.safeParse(set).success).toBe(false);
  });

  it("rejects evidence set missing sensitivity items", () => {
    const set = createValidEvidenceSet();
    set.items = set.items.filter((i) => !i.dimension.startsWith("sensitivity"));
    expect(ZiweiReportEvidenceSetV2Schema.safeParse(set).success).toBe(false);
  });

  it("rejects non-64-hex snapshot hash", () => {
    const set = { ...createValidEvidenceSet(), snapshotHash: "invalid-hash" };
    expect(ZiweiReportEvidenceSetV2Schema.safeParse(set).success).toBe(false);
  });

  it("rejects extra fields on evidence item or set", () => {
    const set = { ...createValidEvidenceSet(), extraField: true };
    expect(ZiweiReportEvidenceSetV2Schema.safeParse(set).success).toBe(false);
  });
});
