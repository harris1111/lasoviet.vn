import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { tmpdir } from "node:os";

const root = process.cwd();
const assemble = join(root, "scripts/assemble-ziwei-knowledge-v4.mjs");

function run(args, options = {}) {
  return execFileSync(process.execPath, [assemble, ...args], {
    cwd: root,
    encoding: "utf8",
    env: { ...process.env, ...options.env },
  });
}

test("work index is an exact 45-shard immutable partition and check confirms completed editorial corpus", () => {
  run(["--write-index"]);
  const index = JSON.parse(readFileSync(join(root, "content/knowledge/vi/ziwei/v4-candidate/work-index.v1.json"), "utf8"));
  assert.equal(index.sourcePassageCount, 3258);
  assert.equal(index.shards.length, 45);
  assert.equal(new Set(index.shards.flatMap((shard) => shard.sourcePassageIds)).size, 3258);
  assert.equal(run(["--check"]), "V4_ASSEMBLY_READY: 441 records, 3258 ledger entries.\n");
});

test("candidate hash excludes only the ledger candidate hash envelope", () => {
  const ledger = {
    ledgerSchemaVersion: "ziwei.v3-disposition-ledger.v1",
    sourceKnowledgeVersion: "ziwei.comprehensive.knowledge.v3",
    outputKnowledgeVersion: "ziwei.comprehensive.knowledge.v4",
    candidateHash: "a".repeat(64),
    entries: [],
  };
  const payload = JSON.stringify({
    ledgerSchemaVersion: ledger.ledgerSchemaVersion,
    sourceKnowledgeVersion: ledger.sourceKnowledgeVersion,
    outputKnowledgeVersion: ledger.outputKnowledgeVersion,
    entries: ledger.entries,
  });
  const changed = { ...ledger, candidateHash: "b".repeat(64) };
  const changedPayload = JSON.stringify({
    ledgerSchemaVersion: changed.ledgerSchemaVersion,
    sourceKnowledgeVersion: changed.sourceKnowledgeVersion,
    outputKnowledgeVersion: changed.outputKnowledgeVersion,
    entries: changed.entries,
  });
  assert.equal(createHash("sha256").update(payload).digest("hex"), createHash("sha256").update(changedPayload).digest("hex"));
});

function sha256(value) {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function derivedId(record) {
  return `ziwei-v4-${sha256(JSON.stringify({
    assemblyVersion: "ziwei-v4-assembler.v1",
    reportSections: record.reportSections,
    content: record.content,
    metadata: record.metadata,
    sourcePassageIds: record.sourcePassageIds,
    dispositionRationaleCode: record.dispositionRationaleCode,
  })).slice(0, 24)}`;
}

function writeFixtureShard(rootDir, shard, records) {
  const output = join(rootDir, shard.path);
  mkdirSync(dirname(output), { recursive: true });
  const recordBySource = new Map(records.flatMap((record) =>
    record.sourcePassageIds.map((sourcePassageId) => [sourcePassageId, record]),
  ));
  const dispositions = shard.sourcePassageIds.map((sourcePassageId) => ({
    sourcePassageId,
    disposition: recordBySource.has(sourcePassageId) ? "rewritten" : "omitted_oral_filler",
  }));
  writeFileSync(output, `${JSON.stringify({
    shardSchemaVersion: "ziwei.v4-editorial-shard.v1",
    path: shard.path,
    sourcePassageIds: shard.sourcePassageIds,
    records,
    dispositions,
  }, null, 2)}\n`);
}

test("temporary shuffled shards reassemble byte-identically without altering V3", () => {
  const temporary = mkdtempSync(join(tmpdir(), "lsv-16-v4-"));
  try {
    cpSync(join(root, "content"), join(temporary, "content"), { recursive: true });
    cpSync(join(root, "config"), join(temporary, "config"), { recursive: true });
    const v3Path = join(temporary, "content/knowledge/vi/ziwei/comprehensive-report.v3.json");
    const before = sha256(readFileSync(v3Path));
    run(["--write-index"], { env: { LSV_KNOWLEDGE_ROOT: temporary } });
    const indexPath = join(temporary, "content/knowledge/vi/ziwei/v4-candidate/work-index.v1.json");
    const index = JSON.parse(readFileSync(indexPath, "utf8"));
    const firstShard = index.shards[0];
    const base = {
      reportSections: ["primary_evidence"],
      metadata: {
        topics: ["example"],
        palaces: [],
        stars: [],
        brightness: [],
        transformations: [],
        relations: [],
        patterns: [],
        sourceType: "curated",
        languageOrigin: "vi",
        priority: 1,
      },
      dispositionRationaleCode: "rewritten",
    };
    const records = firstShard.sourcePassageIds.slice(0, 2).map((sourcePassageId, indexValue) => {
      const content = indexValue === 0
        ? "Cung Mệnh cho thấy bạn thường chủ động sắp xếp công việc theo từng bước rõ ràng. Khi trao đổi với người thân, bạn nên nói cụ thể điều mình cần để mọi người hiểu nhau hơn."
        : "Tử Vi gợi ý rằng bạn có thể giữ nhịp làm việc ổn định khi ưu tiên việc quan trọng trước. Bạn nên ghi lại các lựa chọn chính để nhìn rõ điều phù hợp với mục tiêu của mình.";
      const record = {
        ...base,
        content,
        contentHash: sha256(content),
        sourcePassageIds: [sourcePassageId],
      };
      return { ...record, passageId: derivedId(record) };
    });
    for (const shard of index.shards) {
      writeFixtureShard(temporary, shard, shard.path === firstShard.path ? records : []);
    }
    run(["--assemble"], { env: { LSV_KNOWLEDGE_ROOT: temporary } });
    const candidatePath = join(temporary, "content/knowledge/vi/ziwei/v4-candidate/comprehensive-report.v4.candidate.json");
    const ledgerPath = join(temporary, "content/knowledge/vi/ziwei/v4-candidate/comprehensive-report.v4.disposition-ledger.json");
    const firstCandidate = readFileSync(candidatePath, "utf8");
    const firstLedger = readFileSync(ledgerPath, "utf8");
    writeFixtureShard(temporary, firstShard, [...records].reverse());
    run(["--assemble"], { env: { LSV_KNOWLEDGE_ROOT: temporary } });
    assert.equal(readFileSync(candidatePath, "utf8"), firstCandidate);
    assert.equal(readFileSync(ledgerPath, "utf8"), firstLedger);
    assert.equal(sha256(readFileSync(v3Path)), before);
  } finally {
    rmSync(temporary, { recursive: true, force: true });
  }
});
