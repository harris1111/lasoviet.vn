import "reflect-metadata";

import { NestFactory } from "@nestjs/core";
import { resolveWorkerQueues } from "@lasoviet/backend";

import { WorkerModule } from "./worker.module.js";
import { createMaintenanceRunner, createOutboxDispatchRunner } from "./worker.module.js";
import { createReportGenerateRunner } from "./worker.module.js";
import { provisionReportKnowledge } from "./reports/provision-report-knowledge.js";
import { executeWorkerPollingCycle, writeWorkerHeartbeat } from "./health/worker-heartbeat.js";

async function bootstrap(): Promise<void> {
  await NestFactory.createApplicationContext(WorkerModule);
  const maintenance = createMaintenanceRunner();
  const outbox = createOutboxDispatchRunner();
  await provisionReportKnowledge();
  const reportRunner = createReportGenerateRunner();

  const queuesResult = resolveWorkerQueues(process.env.WORKER_QUEUES);
  const configuredQueues = queuesResult.ok ? queuesResult.value : [];

  const runMaintenance = () =>
    maintenance.runOnce().catch((error: unknown) => {
      console.error("PHASE_ONE_MAINTENANCE_FAILED", error);
    });

  let activeCycle: Promise<void> | undefined;
  const runQueueCycle = (): Promise<void> => {
    if (activeCycle !== undefined) return activeCycle;

    activeCycle = executeWorkerPollingCycle({
      runOutbox: () => outbox.runOnce(),
      runReport: () => reportRunner.runOnce(),
      writeHeartbeat: () => writeWorkerHeartbeat({ queues: configuredQueues }),
      onOutboxError(error) {
        console.error("OUTBOX_DISPATCH_FAILED", error);
      },
      onReportError(error) {
        console.error("REPORT_GENERATE_RUNNER_FAILED", error);
      },
    })
      .catch((error: unknown) => {
        console.error("WORKER_HEARTBEAT_WRITE_FAILED", error);
      })
      .then(() => undefined)
      .finally(() => {
        activeCycle = undefined;
      });

    return activeCycle;
  };

  await runMaintenance();
  await runQueueCycle();
  setInterval(runMaintenance, 15 * 60 * 1000).unref();
  setInterval(() => void runQueueCycle(), 5_000).unref();
}

void bootstrap();
