import { PostgreSqlContainer } from "@testcontainers/postgresql";
import { createRequire } from "node:module";
import { runMigrations } from "../../packages/database/src/migrate.js";
import { createDatabase } from "../../packages/database/src/client.js";
import type { FreePalaceCostContext } from "../../packages/backend/src/ziwei/free-palace-cost-context.js";
import type { FreePalaceArtifactLineage } from "../../packages/backend/src/ziwei/free-palace-selection.js";

const postgres: typeof import("../../packages/database/node_modules/postgres").default = createRequire(new URL("../../packages/database/package.json", import.meta.url))("postgres");
export type RawSql = ReturnType<typeof postgres>;

export const MICRO = 1_000_000n;
export const COORDINATION_LOCK_KEY = "lasoviet:free-ai:coordination:v1";

export async function startFreeAiDatabase() {
  const container = await new PostgreSqlContainer("postgres:16-alpine").start();
  await runMigrations(container.getConnectionUri());
  const uri = container.getConnectionUri();
  const raw = postgres(uri);
  const clients: RawSql[] = [raw];
  return {
    uri, raw,
    // Independent pools: each is its own physical connection set, so races are real.
    connect: () => createDatabase(uri),
    rawClient: () => { const client = postgres(uri); clients.push(client); return client; },
    async stop() { await Promise.all(clients.map((client) => client.end({ timeout: 2 }))); await container.stop(); },
  };
}

export function lineage(chartVersionId: string, overrides: Partial<FreePalaceArtifactLineage> = {}): FreePalaceArtifactLineage {
  return {
    chartVersionId, palaceId: "ziwei.palace.life", locale: "vi", promptVersion: "p1", rulesVersion: "r1",
    knowledgeVersion: "k1", scorerVersion: "s1", schemaVersion: "g1", provider: "fake-provider", model: "fake-model", ...overrides,
  };
}

export function costContext(reservedMicroVnd: bigint, overrides: Partial<FreePalaceCostContext> = {}): FreePalaceCostContext {
  return {
    pricingSnapshotId: "price-1", pricingVersion: "v1", provider: "fake-provider", model: "fake-model",
    inputPricePerMillion: 1n, outputPricePerMillion: 1n, serializedRequestHash: "0".repeat(64),
    finalSerializedRequest: "{\"fake\":true}", maxInputTokens: 10, maxOutputTokens: 10,
    semanticsVersion: "test", reservedMicroVnd, ...overrides,
  };
}

// Holds the global free-AI coordination lock from a third connection so that every thunk
// is genuinely queued behind it, then releases them all at once and collects the results.
export async function raceBehindLock<T>(holder: RawSql, thunks: Array<() => Promise<T>>): Promise<T[]> {
  let release!: () => void;
  const gate = new Promise<void>((resolve) => { release = resolve; });
  const held = holder.begin(async (tx) => {
    await tx`SELECT pg_advisory_xact_lock(hashtextextended(${COORDINATION_LOCK_KEY}, 0))`;
    await gate;
  });
  await new Promise((resolve) => setTimeout(resolve, 150));
  const pending = thunks.map((thunk) => thunk());
  await new Promise((resolve) => setTimeout(resolve, 300));
  release();
  await held;
  return Promise.all(pending);
}

export async function insertLegacyAttempt(raw: RawSql, input: { chart: string; startedAt?: string; outcome?: "resolved" | "unknown" | "none"; costMicroVnd?: bigint }) {
  const [attempt] = await raw`INSERT INTO ai_call_attempts(call_id,purpose,provider_id,requested_model_id,chart_version_id,max_output_tokens,pricing_version,input_price_per_million,output_price_per_million,cached_input_price_per_million,currency,source_currency,source_reference,fx_source,fx_rate,fx_timestamp,pricing_source,started_at)
    VALUES (${"legacy-" + Math.random()},'free_preview','legacy','legacy-model',${input.chart},100,'v0',1,1,1,'VND','VND','ref','fx',1,now(),'src',${input.startedAt ?? new Date().toISOString()}) RETURNING id`;
  const outcome = input.outcome ?? "resolved";
  if (outcome === "resolved") {
    await raw`INSERT INTO ai_usage_outcomes(attempt_id,cost_micro_vnd,cost_vnd,cost_status,tokens_unknown,input_tokens,output_tokens,cached_tokens,total_tokens)
      VALUES (${attempt!.id},${(input.costMicroVnd ?? 0n).toString()},0,'resolved',false,1,1,0,2)`;
  } else if (outcome === "unknown") {
    await raw`INSERT INTO ai_usage_outcomes(attempt_id,cost_status,tokens_unknown) VALUES (${attempt!.id},'unknown',true)`;
  }
}
