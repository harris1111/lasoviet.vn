import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

const scripts = [
  {file: "scripts/verify-topic-deep-dive-real-generations.mjs", field: "topicId", accepted: "acceptedTopics", groups: ["relationship_marriage", "career_wealth"]},
  {file: "scripts/verify-period-reading-real-generations.mjs", field: "kindId", accepted: "acceptedPeriods", groups: ["monthly", "annual"]},
];
for (const script of scripts) {
  test(`${script.file}: old live flags cannot bypass the FD121 transport gate`, () => {
    const output = join(mkdtempSync(join(tmpdir(), "lsv-manual-cli-block-")), "evidence.json");
    const result = spawnSync(process.execPath, [script.file, "--output", output], {encoding: "utf8", env: {
      AI_PRODUCTION_ENABLED: "true", AI_BASE_URL: "https://invalid.example", AI_API_KEY: "synthetic-secret",
      AI_MODEL: "synthetic", AI_ALLOWED_RESOLVED_MODELS: "synthetic", DATABASE_URL: "invalid-synthetic-database",
    }});
    assert.equal(result.status, 2, result.stderr);
    const evidence = JSON.parse(readFileSync(output, "utf8"));
    assert.equal(evidence.status, "blocked");
    assert.equal(evidence.reason, "FD121_BOUNDED_NATIVE_MANUAL_TRIAL_TRANSPORT_REQUIRED");
    assert.equal(evidence.manualAccepted, false);
    assert.deepEqual(evidence[script.accepted], []);
    assert.deepEqual(evidence.evidence, []);
    assert.equal((result.stdout + JSON.stringify(evidence)).includes("synthetic-secret"), false);
  });
  test(`${script.file}: actual-engine dry run covers two rows for every selected group`, () => {
    const output = join(mkdtempSync(join(tmpdir(), "lsv-manual-cli-dry-")), "evidence.json");
    const result = spawnSync(process.execPath, [script.file, "--dryRun", "--output", output], {encoding: "utf8", env: {}, timeout: 30_000});
    assert.equal(result.status, 0, result.stderr);
    const evidence = JSON.parse(readFileSync(output, "utf8"));
    assert.equal(evidence.status, "dry_run_not_acceptance");
    assert.equal(evidence.requestedRuns, 2);
    assert.equal(evidence.manualAccepted, false);
    assert.deepEqual(evidence[script.accepted], []);
    assert.equal(evidence.evidence.length, 4);
    for (const group of script.groups) {
      const rows = evidence.evidence.filter(row => row[script.field] === group);
      assert.equal(rows.length, 2);
      assert.equal(new Set(rows.map(row => row.chartVersionId)).size, 2);
      for (const row of rows) {
        assert.match(row.snapshotHash, /^[a-f0-9]{64}$/);
        assert.ok(row.evidenceCount > 0);
      }
    }
  });
}
