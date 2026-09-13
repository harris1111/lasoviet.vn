import {
  ZiweiReportEvidenceSetV2Schema,
  type ReportSourceSnapshotV1,
  type ZiweiReportEvidenceItemV2,
  type ZiweiReportEvidenceSetV2,
} from "@lasoviet/contracts";

import type { ComprehensiveZiweiFacts } from "../reports/comprehensive-ziwei-facts.js";

export class ZiweiV4EvidenceError extends Error {
  readonly code: string;
  readonly retryable: boolean;

  constructor(code: string, message: string, retryable = false) {
    super(message);
    this.name = "ZiweiV4EvidenceError";
    this.code = code;
    this.retryable = retryable;
  }
}

export function buildZiweiV4Evidence(
  natalFacts: ComprehensiveZiweiFacts,
  sourceSnapshot: ReportSourceSnapshotV1,
): ZiweiReportEvidenceSetV2 {
  if (!natalFacts || !Array.isArray(natalFacts.evidenceKeys)) {
    throw new ZiweiV4EvidenceError(
      "INVALID_NATAL_FACTS",
      "Natal facts must provide a valid evidenceKeys array",
      false,
    );
  }

  if (
    !sourceSnapshot ||
    !sourceSnapshot.snapshot ||
    !sourceSnapshot.snapshot.timing ||
    !sourceSnapshot.snapshot.sensitivity
  ) {
    throw new ZiweiV4EvidenceError(
      "INVALID_SOURCE_SNAPSHOT",
      "Source snapshot must provide valid timing and sensitivity layers",
      false,
    );
  }

  const items: ZiweiReportEvidenceItemV2[] = [];
  const seenKeys = new Set<string>();

  function addItem(item: ZiweiReportEvidenceItemV2): void {
    if (seenKeys.has(item.key)) {
      return;
    }
    seenKeys.add(item.key);
    items.push(item);
  }

  // 1. Natal evidence: namespace existing natal keys as natal.<original-key>
  for (const origKey of natalFacts.evidenceKeys) {
    const normKey = origKey.trim().toLowerCase();
    addItem({
      key: `natal.${normKey}`,
      dimension: "natal",
      confidence: "moderate",
      sourceKeys: [origKey],
    });
  }

  // 2. Decadal timing evidence
  const decadal = sourceSnapshot.snapshot.timing.decadal;
  if (decadal.state === "not_started") {
    addItem({
      key: "decadal.state.not_started",
      dimension: "decadal",
      confidence: "moderate",
      sourceKeys: ["timing.decadal.state:not_started"],
    });
    addItem({
      key: `decadal.first-cycle-start-age.${decadal.firstCycleStartAge}`,
      dimension: "decadal",
      confidence: "moderate",
      sourceKeys: [`timing.decadal.firstCycleStartAge:${decadal.firstCycleStartAge}`],
    });
    addItem({
      key: `decadal.first-cycle-start-year.${decadal.firstCycleStartYear}`,
      dimension: "decadal",
      confidence: "moderate",
      sourceKeys: [`timing.decadal.firstCycleStartYear:${decadal.firstCycleStartYear}`],
    });
  } else {
    addItem({
      key: "decadal.state.active",
      dimension: "decadal",
      confidence: "moderate",
      sourceKeys: ["timing.decadal.state:active"],
    });
    addItem({
      key: `decadal.index.${decadal.index}`,
      dimension: "decadal",
      confidence: "moderate",
      sourceKeys: [`timing.decadal.index:${decadal.index}`],
    });
    addItem({
      key: `decadal.age-range.${decadal.ageRange[0]}-${decadal.ageRange[1]}`,
      dimension: "decadal",
      confidence: "moderate",
      sourceKeys: [`timing.decadal.ageRange:${decadal.ageRange[0]}-${decadal.ageRange[1]}`],
    });
    addItem({
      key: `decadal.year-range.${decadal.yearRange[0]}-${decadal.yearRange[1]}`,
      dimension: "decadal",
      confidence: "moderate",
      sourceKeys: [`timing.decadal.yearRange:${decadal.yearRange[0]}-${decadal.yearRange[1]}`],
    });
    addItem({
      key: `decadal.palace.${decadal.palaceId.toLowerCase()}`,
      dimension: "decadal",
      confidence: "moderate",
      sourceKeys: [decadal.palaceId],
    });
    addItem({
      key: `decadal.stem.${decadal.heavenlyStemId.toLowerCase()}`,
      dimension: "decadal",
      confidence: "moderate",
      sourceKeys: [decadal.heavenlyStemId],
    });
    addItem({
      key: `decadal.branch.${decadal.earthlyBranchId.toLowerCase()}`,
      dimension: "decadal",
      confidence: "moderate",
      sourceKeys: [decadal.earthlyBranchId],
    });

    for (const palace of decadal.palaces) {
      const palaceIdNorm = palace.palaceId.toLowerCase();
      addItem({
        key: `decadal.palace.${palaceIdNorm}.branch.${palace.earthlyBranchId.toLowerCase()}`,
        dimension: "decadal",
        confidence: "moderate",
        sourceKeys: [palace.palaceId, palace.earthlyBranchId],
      });
      addItem({
        key: `decadal.palace.${palaceIdNorm}.stem.${palace.heavenlyStemId.toLowerCase()}`,
        dimension: "decadal",
        confidence: "moderate",
        sourceKeys: [palace.palaceId, palace.heavenlyStemId],
      });
      addItem({
        key: `decadal.palace.${palaceIdNorm}.cycle.${palace.cycleStateId.toLowerCase()}`,
        dimension: "decadal",
        confidence: "moderate",
        sourceKeys: [palace.palaceId, palace.cycleStateId],
      });
      if (palace.isOriginalPalace) {
        addItem({
          key: `decadal.palace.${palaceIdNorm}.original`,
          dimension: "decadal",
          confidence: "moderate",
          sourceKeys: [palace.palaceId, "isOriginalPalace:true"],
        });
      }
      for (const star of palace.stars) {
        const starIdNorm = star.id.toLowerCase();
        addItem({
          key: `decadal.palace.${palaceIdNorm}.star.${starIdNorm}`,
          dimension: "decadal",
          confidence: "moderate",
          sourceKeys: [palace.palaceId, star.id],
        });
        if (star.brightness) {
          addItem({
            key: `decadal.palace.${palaceIdNorm}.star.${starIdNorm}.brightness.${star.brightness.toLowerCase()}`,
            dimension: "decadal",
            confidence: "moderate",
            sourceKeys: [palace.palaceId, star.id, star.brightness],
          });
        }
        if (star.category) {
          addItem({
            key: `decadal.palace.${palaceIdNorm}.star.${starIdNorm}.category.${star.category.toLowerCase()}`,
            dimension: "decadal",
            confidence: "moderate",
            sourceKeys: [palace.palaceId, star.id, star.category],
          });
        }
      }
      for (const transformation of palace.transformations) {
        addItem({
          key: `decadal.palace.${palaceIdNorm}.transformation.${transformation.id.toLowerCase()}.${transformation.starId.toLowerCase()}`,
          dimension: "decadal",
          confidence: "moderate",
          sourceKeys: [palace.palaceId, transformation.id, transformation.starId],
        });
      }
    }
  }

  // 3. Annual timing evidence
  const annual = sourceSnapshot.snapshot.timing.annual;
  addItem({
    key: `annual.target-year.${annual.targetYear}`,
    dimension: "annual",
    confidence: "moderate",
    sourceKeys: [`timing.annual.targetYear:${annual.targetYear}`],
  });
  addItem({
    key: `annual.palace.${annual.palaceId.toLowerCase()}`,
    dimension: "annual",
    confidence: "moderate",
    sourceKeys: [annual.palaceId],
  });
  addItem({
    key: `annual.stem.${annual.heavenlyStemId.toLowerCase()}`,
    dimension: "annual",
    confidence: "moderate",
    sourceKeys: [annual.heavenlyStemId],
  });
  addItem({
    key: `annual.branch.${annual.earthlyBranchId.toLowerCase()}`,
    dimension: "annual",
    confidence: "moderate",
    sourceKeys: [annual.earthlyBranchId],
  });

  for (const palace of annual.palaces) {
    const palaceIdNorm = palace.palaceId.toLowerCase();
    addItem({
      key: `annual.palace.${palaceIdNorm}.branch.${palace.earthlyBranchId.toLowerCase()}`,
      dimension: "annual",
      confidence: "moderate",
      sourceKeys: [palace.palaceId, palace.earthlyBranchId],
    });
    addItem({
      key: `annual.palace.${palaceIdNorm}.stem.${palace.heavenlyStemId.toLowerCase()}`,
      dimension: "annual",
      confidence: "moderate",
      sourceKeys: [palace.palaceId, palace.heavenlyStemId],
    });
    addItem({
      key: `annual.palace.${palaceIdNorm}.cycle.${palace.cycleStateId.toLowerCase()}`,
      dimension: "annual",
      confidence: "moderate",
      sourceKeys: [palace.palaceId, palace.cycleStateId],
    });
    if (palace.isOriginalPalace) {
      addItem({
        key: `annual.palace.${palaceIdNorm}.original`,
        dimension: "annual",
        confidence: "moderate",
        sourceKeys: [palace.palaceId, "isOriginalPalace:true"],
      });
    }
    for (const star of palace.stars) {
      const starIdNorm = star.id.toLowerCase();
      addItem({
        key: `annual.palace.${palaceIdNorm}.star.${starIdNorm}`,
        dimension: "annual",
        confidence: "moderate",
        sourceKeys: [palace.palaceId, star.id],
      });
      if (star.brightness) {
        addItem({
          key: `annual.palace.${palaceIdNorm}.star.${starIdNorm}.brightness.${star.brightness.toLowerCase()}`,
          dimension: "annual",
          confidence: "moderate",
          sourceKeys: [palace.palaceId, star.id, star.brightness],
        });
      }
      if (star.category) {
        addItem({
          key: `annual.palace.${palaceIdNorm}.star.${starIdNorm}.category.${star.category.toLowerCase()}`,
          dimension: "annual",
          confidence: "moderate",
          sourceKeys: [palace.palaceId, star.id, star.category],
        });
      }
    }
    for (const transformation of palace.transformations) {
      addItem({
        key: `annual.palace.${palaceIdNorm}.transformation.${transformation.id.toLowerCase()}.${transformation.starId.toLowerCase()}`,
        dimension: "annual",
        confidence: "moderate",
        sourceKeys: [palace.palaceId, transformation.id, transformation.starId],
      });
    }
  }

  // 4. Sensitivity evidence
  const sensitivity = sourceSnapshot.snapshot.sensitivity;
  for (const factKey of sensitivity.stableFactKeys) {
    const normKey = factKey.trim().toLowerCase();
    addItem({
      key: `sensitivity.stable.${normKey}`,
      dimension: "sensitivity_stable",
      confidence: "high",
      sourceKeys: [factKey],
    });
  }

  for (const sensitiveFact of sensitivity.sensitiveFacts) {
    const normKey = sensitiveFact.factKey.trim().toLowerCase();
    const sourceKeysSet = new Set<string>();
    for (const variant of sensitiveFact.variants) {
      for (const val of variant.valueIds) {
        const trimmed = val.trim();
        if (trimmed) sourceKeysSet.add(trimmed);
      }
      for (const evKey of variant.evidenceKeys) {
        const trimmed = evKey.trim();
        if (trimmed) sourceKeysSet.add(trimmed);
      }
    }
    if (sourceKeysSet.size === 0) {
      sourceKeysSet.add(sensitiveFact.factKey);
    }
    const sourceKeys = Array.from(sourceKeysSet).sort();
    addItem({
      key: `sensitivity.sensitive.${normKey}`,
      dimension: "sensitivity_sensitive",
      confidence: "conditional",
      sourceKeys,
    });
  }

  const evidenceSet: ZiweiReportEvidenceSetV2 = {
    version: 2,
    capabilityId: "ziwei.identity.p0",
    chartVersionId: sourceSnapshot.chartVersionId,
    reportVersionId: sourceSnapshot.reportVersionId,
    snapshotHash: sourceSnapshot.snapshotHash,
    ruleVersion: "ziwei.comprehensive.v4",
    items,
  };

  const parsed = ZiweiReportEvidenceSetV2Schema.safeParse(evidenceSet);
  if (!parsed.success) {
    throw new ZiweiV4EvidenceError(
      "V4_EVIDENCE_VALIDATION_FAILED",
      `V4 evidence validation failed: ${parsed.error.message}`,
      false,
    );
  }

  return parsed.data;
}
