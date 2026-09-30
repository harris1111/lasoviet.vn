import assert from "node:assert/strict";
import { test } from "node:test";
import { runTopicCampaign } from "./verify-topic-deep-dive-real-generations.mjs";
const makeInput = async (topicId, index) => ({ topicId, facts: { sourceSnapshot: { chartVersionId: `chart-${index}`, snapshotHash: String(index) } } });
const good = async () => ({ ok: true, value: { quality: { ok: true }, content: { text: "synthetic output, not acceptance" }, providerId: "fixture", modelId: "fixture" } });
test("stops immediately on provider failure and never awards acceptance", async () => {
  let calls = 0;
  const snapshots = [];
  const result = await runTopicCampaign({ selectedTopics: ["relationship_marriage", "career_wealth"], runs: 20, makeInput,
    generate: async () => ++calls === 3 ? { ok: false, error: { code: "AI_TIMEOUT" } } : good(), record: async rows => snapshots.push(rows.length) });
  assert.equal(calls, 3); assert.equal(result.status, "failed"); assert.deepEqual(result.acceptedTopics, []); assert.deepEqual(snapshots, [1, 2, 3]);
});
test("quality failure is not counted as a successful provider response", async () => {
  const result = await runTopicCampaign({ selectedTopics: ["career_wealth"], runs: 20, makeInput,
    generate: async () => ({ ok: true, value: { quality: { ok: false }, content: {}, providerId: "fixture", modelId: "fixture" } }), record: async () => {} });
  assert.equal(result.status, "failed"); assert.equal(result.evidence.length, 1);
});
test("short diagnostic campaign cannot satisfy the twenty-run gate", async () => {
  const result = await runTopicCampaign({ selectedTopics: ["career_wealth"], runs: 2, makeInput, generate: good, record: async () => {} });
  assert.equal(result.status, "diagnostic"); assert.deepEqual(result.acceptedTopics, []);
});
test("each selected topic requires twenty consecutive successes and distinct charts", async () => {
  const result = await runTopicCampaign({ selectedTopics: ["relationship_marriage", "career_wealth"], runs: 20, makeInput, generate: good, record: async () => {} });
  assert.equal(result.status, "passed"); assert.equal(result.evidence.length, 40);
  for (const topic of result.acceptedTopics) assert.equal(new Set(result.evidence.filter(row => row.topicId === topic).map(row => row.chartVersionId)).size, 20);
});
