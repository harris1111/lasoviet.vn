import "reflect-metadata";

import { NestFactory } from "@nestjs/core";

import { WorkerModule } from "./worker.module.js";
import { createMaintenanceRunner } from "./worker.module.js";

async function bootstrap(): Promise<void> {
  await NestFactory.createApplicationContext(WorkerModule);
  const maintenance = createMaintenanceRunner();
  const runMaintenance = () =>
    maintenance.runOnce().catch((error: unknown) => {
      console.error("PHASE_ONE_MAINTENANCE_FAILED", error);
    });
  await runMaintenance();
  setInterval(runMaintenance, 15 * 60 * 1000).unref();
}

void bootstrap();
