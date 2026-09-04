import "reflect-metadata";

import { NestFactory } from "@nestjs/core";
import { createOutboxDispatchSchedule, resolveWorkerQueues } from "@lasoviet/backend";

import { WorkerModule } from "./worker.module.js";
import { createMaintenanceRunner, createOutboxDispatchRunner } from "./worker.module.js";
import { createReportGenerateRunner } from "./worker.module.js";
import { writeWorkerHeartbeat } from "./health/worker-heartbeat.js";

async function bootstrap(): Promise<void> {
  await NestFactory.createApplicationContext(WorkerModule);
  const maintenance = createMaintenanceRunner();
  const outbox = createOutboxDispatchRunner();
  const reportRunner = createReportGenerateRunner();

  const queuesResult = resolveWorkerQueues(process.env.WORKER_QUEUES);
  const configuredQueues = queuesResult.ok ? queuesResult.value : [];

  const updateHeartbeat = async () => {
    try {
      await writeWorkerHeartbeat({ queues: configuredQueues });
    } catch (error) {
      console.error("WORKER_HEARTBEAT_WRITE_FAILED", error);
    }
  };

  const reportSchedule = createOutboxDispatchSchedule({
    runOnce: () => reportRunner.runOnce(),
    reportError(error) {
      console.error("REPORT_GENERATE_RUNNER_FAILED", error);
    },
  });

  const outboxSchedule = createOutboxDispatchSchedule({
    runOnce: () => outbox.runOnce(),
    reportError(error) {
      console.error("OUTBOX_DISPATCH_FAILED", error);
    },
  });
  const runMaintenance = () =>
    maintenance.runOnce().catch((error: unknown) => {
      console.error("PHASE_ONE_MAINTENANCE_FAILED", error);
    });

  const runQueueCycle = async () => {
    await Promise.all([outboxSchedule.run(), reportSchedule.run()]);
    await updateHeartbeat();
  };

  await runMaintenance();
  await runQueueCycle();
  setInterval(runMaintenance, 15 * 60 * 1000).unref();
  setInterval(() => void runQueueCycle(), 5_000).unref();
}

void bootstrap();
