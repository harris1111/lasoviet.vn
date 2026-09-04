import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { rename, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { resolveWorkerQueues } from "@lasoviet/backend";

import { pingRedis, type RedisPingResult } from "./redis-ping.js";

export const DEFAULT_WORKER_HEARTBEAT_PATH =
  "/tmp/lasoviet-worker-heartbeat.json";
export const MAXIMUM_HEARTBEAT_AGE_MS = 30_000;

export type WorkerHeartbeatV1 = {
  version: 1;
  queues: string[];
  polledAt: string;
};

export type WorkerHealthStatus =
  | "WORKER_QUEUES_INVALID"
  | "WORKER_HEARTBEAT_INVALID"
  | "WORKER_HEARTBEAT_STALE"
  | "WORKER_REDIS_UNREACHABLE";

export type WorkerHealthValidationResult =
  | { ok: true }
  | { ok: false; code: WorkerHealthStatus };

export type WriteHeartbeatOptions = {
  filePath?: string;
  queues: readonly string[];
  now?: () => Date;
};

export async function writeWorkerHeartbeat(
  options: WriteHeartbeatOptions,
): Promise<void> {
  const filePath = options.filePath ?? DEFAULT_WORKER_HEARTBEAT_PATH;
  const now = options.now ? options.now() : new Date();
  const heartbeat: WorkerHeartbeatV1 = {
    version: 1,
    queues: [...options.queues],
    polledAt: now.toISOString(),
  };

  const directory = dirname(filePath);
  const tempPath = join(directory, `.${randomUUID()}.tmp`);
  const payload = `${JSON.stringify(heartbeat, null, 2)}\n`;

  await writeFile(tempPath, payload, "utf8");
  await rename(tempPath, filePath);
}

export type ValidateWorkerHealthDependencies = {
  rawWorkerQueues?: string;
  readHeartbeat?: () => string | null;
  pingRedis?: () => Promise<RedisPingResult>;
  now?: () => Date;
  maximumAgeMs?: number;
};

export async function validateWorkerHealth(
  dependencies: ValidateWorkerHealthDependencies = {},
): Promise<WorkerHealthValidationResult> {
  const queuesResult = resolveWorkerQueues(
    dependencies.rawWorkerQueues ?? process.env.WORKER_QUEUES,
  );
  if (!queuesResult.ok) {
    return { ok: false, code: "WORKER_QUEUES_INVALID" };
  }
  const configuredQueues = queuesResult.value;

  const readHeartbeat =
    dependencies.readHeartbeat ??
    (() => {
      try {
        return readFileSync(DEFAULT_WORKER_HEARTBEAT_PATH, "utf8");
      } catch {
        return null;
      }
    });

  const rawHeartbeat = readHeartbeat();
  if (rawHeartbeat === null) {
    return { ok: false, code: "WORKER_HEARTBEAT_INVALID" };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawHeartbeat);
  } catch {
    return { ok: false, code: "WORKER_HEARTBEAT_INVALID" };
  }

  if (typeof parsed !== "object" || parsed === null) {
    return { ok: false, code: "WORKER_HEARTBEAT_INVALID" };
  }

  const heartbeatRecord = parsed as Record<string, unknown>;
  if (
    heartbeatRecord.version !== 1 ||
    !Array.isArray(heartbeatRecord.queues) ||
    typeof heartbeatRecord.polledAt !== "string"
  ) {
    return { ok: false, code: "WORKER_HEARTBEAT_INVALID" };
  }

  const heartbeatQueues = heartbeatRecord.queues;
  if (
    !heartbeatQueues.every((queue): queue is string => typeof queue === "string")
  ) {
    return { ok: false, code: "WORKER_HEARTBEAT_INVALID" };
  }

  if (
    heartbeatQueues.length !== configuredQueues.length ||
    !configuredQueues.every((q, index) => heartbeatQueues[index] === q)
  ) {
    return { ok: false, code: "WORKER_QUEUES_INVALID" };
  }

  const polledAtMs = Date.parse(heartbeatRecord.polledAt);
  if (Number.isNaN(polledAtMs)) {
    return { ok: false, code: "WORKER_HEARTBEAT_INVALID" };
  }

  const now = dependencies.now ? dependencies.now() : new Date();
  const maximumAgeMs = dependencies.maximumAgeMs ?? MAXIMUM_HEARTBEAT_AGE_MS;
  const heartbeatAgeMs = now.getTime() - polledAtMs;
  if (heartbeatAgeMs < 0 || heartbeatAgeMs > maximumAgeMs) {
    return { ok: false, code: "WORKER_HEARTBEAT_STALE" };
  }

  const doPingRedis = dependencies.pingRedis ?? (() => pingRedis());
  const redisResult = await doPingRedis();
  if (!redisResult.ok) {
    return { ok: false, code: "WORKER_REDIS_UNREACHABLE" };
  }

  return { ok: true };
}

export type ExecuteWorkerPollingCycleDependencies = {
  runOutbox(): Promise<unknown>;
  runReport(): Promise<unknown>;
  writeHeartbeat(): Promise<void>;
  onOutboxError?(error: unknown): void;
  onReportError?(error: unknown): void;
};

export async function executeWorkerPollingCycle(
  dependencies: ExecuteWorkerPollingCycleDependencies,
): Promise<boolean> {
  const [outboxSettled, reportSettled] = await Promise.allSettled([
    Promise.resolve().then(() => dependencies.runOutbox()),
    Promise.resolve().then(() => dependencies.runReport()),
  ]);

  if (outboxSettled.status === "rejected") {
    dependencies.onOutboxError?.(outboxSettled.reason);
  }
  if (reportSettled.status === "rejected") {
    dependencies.onReportError?.(reportSettled.reason);
  }

  if (
    outboxSettled.status === "fulfilled" &&
    reportSettled.status === "fulfilled"
  ) {
    await dependencies.writeHeartbeat();
    return true;
  }

  return false;
}
