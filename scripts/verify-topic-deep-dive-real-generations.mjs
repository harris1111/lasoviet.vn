#!/usr/bin/env node
import { parseArgs } from "node:util";
import { createHash, randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const topics = ["relationship_marriage", "career_wealth"];
export async function runTopicCampaign({ selectedTopics, runs, makeInput, generate, record }) {
  const evidence = [];
  for (const topicId of selectedTopics) {
    for (let index = 0; index < runs; index++) {
      const input = await makeInput(topicId, index);
      const result = await generate(input);
      const passed = result.ok && result.value.quality.ok;
      const row = { topicId, index, passed, chartVersionId: input.facts.sourceSnapshot.chartVersionId,
        snapshotHash: input.facts.sourceSnapshot.snapshotHash,
        ...(result.ok ? { providerId: result.value.providerId, modelId: result.value.modelId,
          contentHash: createHash("sha256").update(JSON.stringify(result.value.content)).digest("hex"),
          content: result.value.content, quality: result.value.quality } : { errorCode: result.error.code }) };
      evidence.push(row);
      await record(evidence);
      if (!passed) return { status: "failed", acceptedTopics: [], evidence };
    }
  }
  // FD120/121: diagnostic output never replaces owner manual acceptance.
  return { status: "diagnostic", acceptedTopics: [], evidence };
}

async function main(args) {
  const { values } = parseArgs({ args, options: {
    topic: { type: "string", default: "all" }, dryRun: { type: "boolean", default: false },
    runs: { type: "string", default: "2" }, output: { type: "string" },
    asOfDate: { type: "string", default: "2026-09-30" },
  } });
  const runs = Number(values.runs);
  if (!Number.isInteger(runs) || runs < 1 || runs > 3 || ![...topics, "all"].includes(values.topic)) throw new Error("INVALID_CAMPAIGN_ARGUMENTS");
  const selectedTopics = values.topic === "all" ? topics : [values.topic];
  const campaignId = randomUUID();
  const output = resolve(values.output ?? `plan/evidence/topic-campaign-${campaignId}.json`);
  const manifest = { version: 1, campaignId, asOfDate: values.asOfDate, selectedTopics, requestedRuns: runs,
    source: "synthetic profiles calculated by Iztro; real configured provider required for acceptance",
    status: "running", manualAccepted: false, acceptedTopics: [], evidence: [] };
  async function save() { await mkdir(dirname(output), { recursive: true }); await writeFile(output, JSON.stringify(manifest, null, 2) + "\n", { mode: 0o600 }); }
  // The legacy live path has no approved aggregate budget or final-wire bound.
  // Old environment flags cannot authorize it under FD121.
  if (!values.dryRun) {
    manifest.status = "blocked";
    manifest.reason = "FD121_BOUNDED_NATIVE_MANUAL_TRIAL_TRANSPORT_REQUIRED";
    await save();
    console.log(JSON.stringify({ status: manifest.status, reason: manifest.reason, output }));
    process.exitCode = 2;
    return;
  }
  const backend = await import("../packages/backend/dist/index.js");
  const contracts = await import("../packages/contracts/dist/index.js");
  const engine = await import("../packages/engine-adapters/dist/index.js");
  try {
    const makeInput = async (topicId, index) => {
      const pad = value => String(value).padStart(2, "0");
      const date = `${1980 + index}-${pad(1 + index % 12)}-${pad(1 + index % 27)}`;
      const localTime = `${pad(index * 2 % 24)}:30`;
      const birthProfile = contracts.NormalizedBirthProfileV1Schema.parse({ version: 1,
        originalInput: { version: 1, calendar: { kind: "solar", date }, time: { precision: "exact_minute", localTime }, timezone: { offsetMinutes: 420 }, consentVersion: "synthetic-test", gender: index % 2 ? "female" : "male" },
        normalizedCalendar: { kind: "solar", date }, normalizedTime: { precision: "exact_minute", localTime },
        timezoneProvenance: { source: "offset", offsetMinutes: 420 }, normalizationWarnings: [], limitations: [] });
      const chartVersionId = `synthetic-topic-${index}`;
      const chart = await new engine.IztroAdapter().calculate({ birthProfile }, engine.iztroDefaultConfig);
      const snapshot = await engine.calculateIztroReportSnapshot({ chartVersionId, birthProfile, asOfDate: values.asOfDate, targetYear: Number(values.asOfDate.slice(0, 4)) });
      if (!chart.ok || !snapshot.ok) throw new Error("SYNTHETIC_ENGINE_INPUT_FAILED");
      const source = contracts.ReportSourceSnapshotV1Schema.parse({ version: 1, reportId: randomUUID(), reportVersionId: randomUUID(), chartVersionId,
        asOfDate: values.asOfDate, targetYear: Number(values.asOfDate.slice(0, 4)), timingRuleVersion: snapshot.value.timingRuleVersion,
        sensitivityRuleVersion: snapshot.value.sensitivityRuleVersion, snapshotHash: snapshot.value.provenance.snapshotHash, snapshot: snapshot.value });
      const facts = backend.buildComprehensiveZiweiFactsV4(chart.output, source);
      return { topicId, facts, knowledgePacks: [] };
    };
    for (const topicId of selectedTopics) for (let index = 0; index < runs; index++) {
      const input = await makeInput(topicId, index);
      manifest.evidence.push({ topicId, index, chartVersionId: input.facts.sourceSnapshot.chartVersionId, snapshotHash: input.facts.sourceSnapshot.snapshotHash, evidenceCount: input.facts.evidence.items.length });
    }
    manifest.status = "dry_run_not_acceptance";
  } catch {
    manifest.status = "failed";
    manifest.reason = "CAMPAIGN_EXECUTION_FAILED";
    process.exitCode = 1;
  } finally {
    await save();
  }
  console.log(JSON.stringify({ status: manifest.status, acceptedTopics: manifest.acceptedTopics, output }));
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main(process.argv.slice(2)).catch(() => { console.error("TOPIC_CAMPAIGN_ARGUMENT_OR_ARTIFACT_ERROR"); process.exitCode = 1; });
}
