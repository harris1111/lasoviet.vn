import "reflect-metadata";

import { NestFactory } from "@nestjs/core";
import { createOutboxDispatchSchedule } from "@lasoviet/backend";

import { WorkerModule } from "./worker.module.js";
import { createMaintenanceRunner, createOutboxDispatchRunner } from "./worker.module.js";

async function bootstrap(): Promise<void> {
  await NestFactory.createApplicationContext(WorkerModule);
  const maintenance = createMaintenanceRunner();
  const outbox = createOutboxDispatchRunner();
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
  setInterval(runMaintenance, 15 * 60 * 1000).unref();
  setInterval(() => void outboxSchedule.run(), 5_000).unref();
}

void bootstrap();
