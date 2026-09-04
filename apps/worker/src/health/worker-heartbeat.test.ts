import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import {
  DEFAULT_WORKER_HEARTBEAT_PATH,
  validateWorkerHealth,
  executeWorkerPollingCycle,
  writeWorkerHeartbeat,
  type WorkerHeartbeatV1,
} from "./worker-heartbeat.js";
import { runWorkerHealthCli } from "./worker-health-cli.js";
import { pingRedis } from "./redis-ping.js";

describe("worker heartbeat and progress probe", () => {
  it("accepts a recent heartbeat for the configured queues", async () => {
    const now = new Date("2026-09-04T12:00:00.000Z");
    const heartbeat: WorkerHeartbeatV1 = {
      version: 1,
      queues: ["report.generate"],
      polledAt: "2026-09-04T11:59:55.000Z",
    };

    const validation = await validateWorkerHealth({
      rawWorkerQueues: "report.generate",
      readHeartbeat: () => JSON.stringify(heartbeat),
      pingRedis: async () => ({ ok: true }),
      now: () => now,
    });

    expect(validation).toEqual({ ok: true });

    let stderr = "";
    const exitCode = await runWorkerHealthCli(
      {
        rawWorkerQueues: "report.generate",
        readHeartbeat: () => JSON.stringify(heartbeat),
        pingRedis: async () => ({ ok: true }),
        now: () => now,
      },
      {
        write(chunk: string) {
          stderr += chunk;
        },
      },
    );

    expect(exitCode).toBe(0);
    expect(stderr).toBe("");
  });

  it("rejects a heartbeat older than thirty seconds", async () => {
    const now = new Date("2026-09-04T12:00:00.000Z");
    const heartbeat: WorkerHeartbeatV1 = {
      version: 1,
      queues: ["report.generate"],
      polledAt: "2026-09-04T11:59:29.000Z",
    };

    const validation = await validateWorkerHealth({
      rawWorkerQueues: "report.generate",
      readHeartbeat: () => JSON.stringify(heartbeat),
      pingRedis: async () => ({ ok: true }),
      now: () => now,
    });

    expect(validation).toEqual({
      ok: false,
      code: "WORKER_HEARTBEAT_STALE",
    });

    let stderr = "";
    const exitCode = await runWorkerHealthCli(
      {
        rawWorkerQueues: "report.generate",
        readHeartbeat: () => JSON.stringify(heartbeat),
        pingRedis: async () => ({ ok: true }),
        now: () => now,
      },
      {
        write(chunk: string) {
          stderr += chunk;
        },
      },
    );

    expect(exitCode).toBe(1);
    expect(stderr).toBe("WORKER_HEARTBEAT_STALE\n");
  });

  it("rejects missing or malformed heartbeat content", async () => {
    const now = new Date("2026-09-04T12:00:00.000Z");

    const missingValidation = await validateWorkerHealth({
      rawWorkerQueues: "report.generate",
      readHeartbeat: () => null,
      pingRedis: async () => ({ ok: true }),
      now: () => now,
    });
    expect(missingValidation).toEqual({
      ok: false,
      code: "WORKER_HEARTBEAT_INVALID",
    });

    const malformedJson = await validateWorkerHealth({
      rawWorkerQueues: "report.generate",
      readHeartbeat: () => "{ not json",
      pingRedis: async () => ({ ok: true }),
      now: () => now,
    });
    expect(malformedJson).toEqual({
      ok: false,
      code: "WORKER_HEARTBEAT_INVALID",
    });

    const wrongVersion = await validateWorkerHealth({
      rawWorkerQueues: "report.generate",
      readHeartbeat: () =>
        JSON.stringify({
          version: 2,
          queues: ["report.generate"],
          polledAt: "2026-09-04T11:59:55.000Z",
        }),
      pingRedis: async () => ({ ok: true }),
      now: () => now,
    });
    expect(wrongVersion).toEqual({
      ok: false,
      code: "WORKER_HEARTBEAT_INVALID",
    });

    let stderr = "";
    const exitCode = await runWorkerHealthCli(
      {
        rawWorkerQueues: "report.generate",
        readHeartbeat: () => null,
        pingRedis: async () => ({ ok: true }),
        now: () => now,
      },
      {
        write(chunk: string) {
          stderr += chunk;
        },
      },
    );
    expect(exitCode).toBe(1);
    expect(stderr).toBe("WORKER_HEARTBEAT_INVALID\n");
  });

  it("rejects queue mismatch", async () => {
    const now = new Date("2026-09-04T12:00:00.000Z");

    const missingQueue = await validateWorkerHealth({
      rawWorkerQueues: "report.generate",
      readHeartbeat: () =>
        JSON.stringify({
          version: 1,
          queues: [],
          polledAt: "2026-09-04T11:59:55.000Z",
        }),
      pingRedis: async () => ({ ok: true }),
      now: () => now,
    });
    expect(missingQueue).toEqual({
      ok: false,
      code: "WORKER_QUEUES_INVALID",
    });

    const extraQueue = await validateWorkerHealth({
      rawWorkerQueues: "report.generate",
      readHeartbeat: () =>
        JSON.stringify({
          version: 1,
          queues: ["report.generate", "unknown.queue"],
          polledAt: "2026-09-04T11:59:55.000Z",
        }),
      pingRedis: async () => ({ ok: true }),
      now: () => now,
    });
    expect(extraQueue).toEqual({
      ok: false,
      code: "WORKER_QUEUES_INVALID",
    });

    const invalidConfig = await validateWorkerHealth({
      rawWorkerQueues: "invalid.queue.name",
      readHeartbeat: () =>
        JSON.stringify({
          version: 1,
          queues: ["report.generate"],
          polledAt: "2026-09-04T11:59:55.000Z",
        }),
      pingRedis: async () => ({ ok: true }),
      now: () => now,
    });
    expect(invalidConfig).toEqual({
      ok: false,
      code: "WORKER_QUEUES_INVALID",
    });

    let stderr = "";
    const exitCode = await runWorkerHealthCli(
      {
        rawWorkerQueues: "report.generate",
        readHeartbeat: () =>
          JSON.stringify({
            version: 1,
            queues: [],
            polledAt: "2026-09-04T11:59:55.000Z",
          }),
        pingRedis: async () => ({ ok: true }),
        now: () => now,
      },
      {
        write(chunk: string) {
          stderr += chunk;
        },
      },
    );
    expect(exitCode).toBe(1);
    expect(stderr).toBe("WORKER_QUEUES_INVALID\n");
  });

  it("rejects Redis ping failure without printing connection details", async () => {
    const now = new Date("2026-09-04T12:00:00.000Z");
    const heartbeat: WorkerHeartbeatV1 = {
      version: 1,
      queues: ["report.generate"],
      polledAt: "2026-09-04T11:59:55.000Z",
    };

    const validation = await validateWorkerHealth({
      rawWorkerQueues: "report.generate",
      readHeartbeat: () => JSON.stringify(heartbeat),
      pingRedis: async () => ({
        ok: false,
        code: "WORKER_REDIS_UNREACHABLE",
      }),
      now: () => now,
    });

    expect(validation).toEqual({
      ok: false,
      code: "WORKER_REDIS_UNREACHABLE",
    });

    let stderr = "";
    const exitCode = await runWorkerHealthCli(
      {
        rawWorkerQueues: "report.generate",
        readHeartbeat: () => JSON.stringify(heartbeat),
        pingRedis: async () => ({
          ok: false,
          code: "WORKER_REDIS_UNREACHABLE",
        }),
        now: () => now,
      },
      {
        write(chunk: string) {
          stderr += chunk;
        },
      },
    );

    expect(exitCode).toBe(1);
    expect(stderr).toBe("WORKER_REDIS_UNREACHABLE\n");
    expect(stderr).not.toContain("redis://");
    expect(stderr).not.toContain("6379");
    expect(stderr).not.toContain("Error");
  });

  it("writes heartbeat atomically using same-directory replacement", async () => {
    const tempDirectory = await mkdtemp(join(tmpdir(), "worker-heartbeat-test-"));
    const targetPath = join(tempDirectory, "lasoviet-worker-heartbeat.json");
    const testNow = new Date("2026-09-04T12:34:56.000Z");

    try {
      await writeWorkerHeartbeat({
        filePath: targetPath,
        queues: ["report.generate"],
        now: () => testNow,
      });

      const raw = await readFile(targetPath, "utf8");
      const parsed = JSON.parse(raw) as WorkerHeartbeatV1;

      expect(parsed).toEqual({
        version: 1,
        queues: ["report.generate"],
        polledAt: "2026-09-04T12:34:56.000Z",
      });
      expect(DEFAULT_WORKER_HEARTBEAT_PATH).toBe(
        "/tmp/lasoviet-worker-heartbeat.json",
      );
    } finally {
      await rm(tempDirectory, { recursive: true, force: true });
    }
  });

  it("pings redis URL and rejects non-redis or unreachable targets", async () => {
    const badProtocolResult = await pingRedis("http://127.0.0.1:6379");
    expect(badProtocolResult).toEqual({
      ok: false,
      code: "WORKER_REDIS_UNREACHABLE",
    });

    const unreachableResult = await pingRedis(
      "redis://127.0.0.1:59999",
      200,
    );
    expect(unreachableResult).toEqual({
      ok: false,
      code: "WORKER_REDIS_UNREACHABLE",
    });
  });
  it("does not write heartbeat when one poll fails", async () => {
    let heartbeatWritten = false;
    let outboxError: unknown;
    let reportError: unknown;

    const result = await executeWorkerPollingCycle({
      runOutbox: async () => {
        throw new Error("outbox failed");
      },
      runReport: async () => ({ processed: 1 }),
      writeHeartbeat: async () => {
        heartbeatWritten = true;
      },
      onOutboxError: (err) => {
        outboxError = err;
      },
      onReportError: (err) => {
        reportError = err;
      },
    });

    expect(result).toBe(false);
    expect(heartbeatWritten).toBe(false);
    expect(outboxError).toBeInstanceOf(Error);
    expect(reportError).toBeUndefined();
  });

  it("does not write heartbeat when both polls fail", async () => {
    let heartbeatWritten = false;
    let outboxError: unknown;
    let reportError: unknown;

    const result = await executeWorkerPollingCycle({
      runOutbox: async () => {
        throw new Error("outbox failed");
      },
      runReport: async () => {
        throw new Error("report failed");
      },
      writeHeartbeat: async () => {
        heartbeatWritten = true;
      },
      onOutboxError: (err) => {
        outboxError = err;
      },
      onReportError: (err) => {
        reportError = err;
      },
    });

    expect(result).toBe(false);
    expect(heartbeatWritten).toBe(false);
    expect(outboxError).toBeInstanceOf(Error);
    expect(reportError).toBeInstanceOf(Error);
  });

  it("writes heartbeat exactly once when both polls succeed", async () => {
    let heartbeatWriteCount = 0;
    let outboxError: unknown;
    let reportError: unknown;

    const result = await executeWorkerPollingCycle({
      runOutbox: async () => ({ dispatched: 2 }),
      runReport: async () => ({ processed: 1 }),
      writeHeartbeat: async () => {
        heartbeatWriteCount += 1;
      },
      onOutboxError: (err) => {
        outboxError = err;
      },
      onReportError: (err) => {
        reportError = err;
      },
    });

    expect(result).toBe(true);
    expect(heartbeatWriteCount).toBe(1);
    expect(outboxError).toBeUndefined();
    expect(reportError).toBeUndefined();
  });
});
