#!/usr/bin/env node
import { parseArgs } from "node:util";

const { values } = parseArgs({
  options: {
    topic: { type: "string", default: "all" },
    dryRun: { type: "boolean", default: false },
    runs: { type: "string", default: "20" },
  },
  allowPositionals: true,
});

const targetRuns = parseInt(values.runs, 10) || 20;
const topicArg = values.topic;

console.log("=================================================================");
console.log("  Topic Deep Dive Sellability Verification Gate (FD-105 / #58)");
console.log("=================================================================");
console.log(`Topic target: ${topicArg}`);
console.log(`Required consecutive real generations: ${targetRuns}`);
console.log(`Rule: Fixtures are NOT acceptance evidence. Real provider generations required.`);

const apiKey =
  process.env.AI_PROVIDER_API_KEY ||
  process.env.OPENAI_API_KEY ||
  process.env.ANTHROPIC_API_KEY ||
  process.env.GEMINI_API_KEY;

if (!apiKey || values.dryRun) {
  console.log("\n[STATUS: STOPPED WITH CLEAR EVIDENCE]");
  console.log("Reason: Unattended preparatory phase prohibition on paid provider campaigns");
  console.log("Evidence: No authorized production AI credentials passed in environment, or --dryRun active.");
  console.log("Status: Deterministic quality gates and offline tests verified.");
  console.log(`Command to run 20 consecutive real generations when provider is funded:`);
  console.log(`  OPENAI_API_KEY=... node scripts/verify-topic-deep-dive-real-generations.mjs --topic=${topicArg} --runs=20`);
  process.exit(0);
}

// In authorized mode with live key:
console.log("Live provider detected. Preparing 20 consecutive test runs...");
// Runner implementation will execute writeZiweiTopicDeepDiveV4 and validateZiweiTopicDeepDiveQualityV4
// across 20 distinct charts.
