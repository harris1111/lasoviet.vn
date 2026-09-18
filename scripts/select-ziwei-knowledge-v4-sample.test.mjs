import assert from "node:assert/strict";
import test from "node:test";

import {
  MAJOR_STAR_IDS,
  PALACE_IDS,
  SAMPLE_SIZE,
  SELECTOR_VERSION,
  WARNING_GROUPS,
  selectZiweiKnowledgeV4Sample,
} from "./select-ziwei-knowledge-v4-sample.mjs";

const sourceRegistries = Array.from({ length: 6 }, (_, index) => ({
  sourceIndex: index + 1,
  sourceId: `source-${String(index + 1).padStart(2, "0")}`,
}));

function record(id, {
  palaces = [],
  stars = [],
  content = "Nội dung biên tập trung tính.",
  sourceIndex = 1,
} = {}) {
  return {
    passageId: `ziwei-v4-fixture-${String(id).padStart(3, "0")}`,
    content,
    metadata: { palaces, stars },
    sourcePassageIds: [`ziwei-v3-${String(sourceIndex).padStart(2, "0")}-fixture-${String(id).padStart(3, "0")}`],
  };
}

function compliantWarning(group) {
  return `Trong giai đoạn này, ${group.terms[0]} cần được để ý vì lá số có cung liên quan. Bạn có thể gặp tình huống cần cân nhắc kỹ trước khi quyết định. Hãy kiểm tra hồ sơ và đọc kỹ hợp đồng để chủ động chuẩn bị.`;
}

function candidateFixture() {
  let id = 1;
  const chunks = [];
  const palaceRecords = new Map();
  const starRecords = new Map();
  const warningRecords = new Map();

  for (const palaceId of PALACE_IDS) {
    const value = record(id, { palaces: [palaceId], sourceIndex: (id % 6) + 1 });
    chunks.push(value);
    palaceRecords.set(palaceId, value.passageId);
    id += 1;
  }
  for (const starId of MAJOR_STAR_IDS) {
    const value = record(id, { stars: [starId], sourceIndex: (id % 6) + 1 });
    chunks.push(value);
    starRecords.set(starId, value.passageId);
    id += 1;
  }
  for (const group of WARNING_GROUPS) {
    const value = record(id, { content: compliantWarning(group), sourceIndex: (id % 6) + 1 });
    chunks.push(value);
    warningRecords.set(group.id, value.passageId);
    id += 1;
  }
  while (chunks.length < SAMPLE_SIZE) {
    chunks.push(record(id, { sourceIndex: (id % 6) + 1 }));
    id += 1;
  }
  return {
    candidate: {
      candidateHash: "a".repeat(64),
      contentHash: "b".repeat(64),
      chunks,
    },
    palaceRecords,
    starRecords,
    warningRecords,
  };
}

function extendedCandidateFixture() {
  const fixture = candidateFixture();
  let id = fixture.candidate.chunks.length + 1;
  const chunks = [...fixture.candidate.chunks];
  while (chunks.length < 70) {
    chunks.push(record(id, { sourceIndex: (id % 6) + 1 }));
    id += 1;
  }
  return { ...fixture, candidate: { ...fixture.candidate, chunks } };
}

function withoutQuotaRecord(candidate, passageId) {
  return {
    ...candidate,
    chunks: [
      ...candidate.chunks.filter((chunk) => chunk.passageId !== passageId),
      record(999, { sourceIndex: 99 }),
    ],
  };
}

function quotaUnavailable(kind, id) {
  return (error) => error instanceof Error && error.message === `V4_SAMPLE_QUOTA_UNAVAILABLE: ${kind}:${id}`;
}

test("selects a deterministic sample of exactly 50 records with every required quota", () => {
  const { candidate } = candidateFixture();
  const first = selectZiweiKnowledgeV4Sample(candidate, sourceRegistries);
  const second = selectZiweiKnowledgeV4Sample(candidate, sourceRegistries);

  assert.equal(first.selectorVersion, SELECTOR_VERSION);
  assert.equal(first.samplePassageIds.length, SAMPLE_SIZE);
  assert.equal(new Set(first.samplePassageIds).size, SAMPLE_SIZE);
  assert.deepEqual(first.samplePassageIds, second.samplePassageIds);
  assert.deepEqual(first.coverage, second.coverage);
  assert.deepEqual(Object.keys(first.coverage.palaces), PALACE_IDS);
  assert.deepEqual(Object.keys(first.coverage.majorStars), MAJOR_STAR_IDS);
  assert.deepEqual(Object.keys(first.coverage.warningGroups), WARNING_GROUPS.map((group) => group.id));
  assert.deepEqual(Object.keys(first.coverage.sourceRegistries), sourceRegistries.map((source) => source.sourceId));
});

test("seeds selection from canonical candidate and content identities", () => {
  const { candidate } = extendedCandidateFixture();
  const original = selectZiweiKnowledgeV4Sample(candidate, sourceRegistries);
  const candidateHashChanged = selectZiweiKnowledgeV4Sample({
    ...candidate,
    candidateHash: "c".repeat(64),
  }, sourceRegistries);

  assert.notEqual(original.seed, candidateHashChanged.seed);
  assert.notDeepEqual(original.samplePassageIds, candidateHashChanged.samplePassageIds);
  assert.throws(
    () => selectZiweiKnowledgeV4Sample({ ...candidate, candidateHash: "not-a-hash" }, sourceRegistries),
    /V4_SAMPLE_CANDIDATE_INVALID/u,
  );
  assert.throws(
    () => selectZiweiKnowledgeV4Sample({ ...candidate, contentHash: "A".repeat(64) }, sourceRegistries),
    /V4_SAMPLE_CANDIDATE_INVALID/u,
  );
});

test("fails when any required palace or major-star quota is unavailable", () => {
  const { candidate, palaceRecords, starRecords } = candidateFixture();
  for (const [palaceId, passageId] of palaceRecords) {
    assert.throws(
      () => selectZiweiKnowledgeV4Sample(withoutQuotaRecord(candidate, passageId), sourceRegistries),
      quotaUnavailable("palace", palaceId),
    );
  }
  for (const [starId, passageId] of starRecords) {
    assert.throws(
      () => selectZiweiKnowledgeV4Sample(withoutQuotaRecord(candidate, passageId), sourceRegistries),
      quotaUnavailable("major_star", starId),
    );
  }
});

test("fails when any warning-group or source-registry quota is unavailable", () => {
  const { candidate, warningRecords } = candidateFixture();
  for (const [warningGroup, passageId] of warningRecords) {
    assert.throws(
      () => selectZiweiKnowledgeV4Sample(withoutQuotaRecord(candidate, passageId), sourceRegistries),
      quotaUnavailable("warning_group", warningGroup),
    );
  }
  for (const source of sourceRegistries) {
    const chunks = candidate.chunks.map((chunk) => ({
      ...chunk,
      sourcePassageIds: chunk.sourcePassageIds.map((sourcePassageId) =>
        sourcePassageId.startsWith(`ziwei-v3-${String(source.sourceIndex).padStart(2, "0")}-`)
          ? sourcePassageId.replace(/^ziwei-v3-\d{2}-/u, "ziwei-v3-99-")
          : sourcePassageId,
      ),
    }));
    assert.throws(
      () => selectZiweiKnowledgeV4Sample({ ...candidate, chunks }, sourceRegistries),
      quotaUnavailable("source_registry", source.sourceId),
    );
  }
});

test("rejects term-only warning false positives and accepts a compliant health warning", () => {
  const { candidate, warningRecords } = candidateFixture();
  const healthPassageId = warningRecords.get("health");
  const termOnly = {
    ...candidate,
    chunks: candidate.chunks.map((chunk) =>
      chunk.passageId === healthPassageId
        ? { ...chunk, content: "Ghi nhận về sức khỏe." }
        : chunk,
    ),
  };

  assert.throws(
    () => selectZiweiKnowledgeV4Sample(termOnly, sourceRegistries),
    quotaUnavailable("warning_group", "health"),
  );
  const sample = selectZiweiKnowledgeV4Sample(candidate, sourceRegistries);
  assert.equal(sample.coverage.warningGroups.health, healthPassageId);
});
