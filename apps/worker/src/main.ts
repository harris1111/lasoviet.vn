import "reflect-metadata";

import { NestFactory } from "@nestjs/core";
import { createOutboxDispatchSchedule } from "@lasoviet/backend";

import { WorkerModule } from "./worker.module.js";
import { createMaintenanceRunner, createOutboxDispatchRunner } from "./worker.module.js";
import { createReportGenerateRunner } from "./worker.module.js";

async function bootstrap(): Promise<void> {
  await NestFactory.createApplicationContext(WorkerModule);
  const maintenance = createMaintenanceRunner();
  const outbox = createOutboxDispatchRunner();
  const reportRunner = createReportGenerateRunner();
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
  await runMaintenance();
  await outboxSchedule.run();
  await reportSchedule.run();
  setInterval(runMaintenance, 15 * 60 * 1000).unref();
  setInterval(() => void outboxSchedule.run(), 5_000).unref();
  setInterval(() => void reportSchedule.run(), 5_000).unref();
}

void bootstrap();
