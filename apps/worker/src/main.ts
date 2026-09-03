import "reflect-metadata";

import { NestFactory } from "@nestjs/core";

import { WorkerModule } from "./worker.module.js";
import { createMaintenanceRunner, createOutboxDispatchRunner } from "./worker.module.js";

async function bootstrap(): Promise<void> {
  await NestFactory.createApplicationContext(WorkerModule);
  const maintenance = createMaintenanceRunner();
  const outbox = createOutboxDispatchRunner();
  const runMaintenance = () =>
    maintenance.runOnce().catch((error: unknown) => {
      console.error("PHASE_ONE_MAINTENANCE_FAILED", error);
    });
  await runMaintenance();
  const dispatchOutbox = async () => {
    for (let count = 0; count < 20; count += 1) {
      if (!(await outbox.dispatchOne()).dispatched) return;
    }
  };
  await dispatchOutbox();
  setInterval(runMaintenance, 15 * 60 * 1000).unref();
  setInterval(() => void dispatchOutbox(), 5_000).unref();
}

void bootstrap();
