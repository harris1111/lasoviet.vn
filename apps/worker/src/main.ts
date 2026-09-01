import "reflect-metadata";

import { NestFactory } from "@nestjs/core";

import { WorkerModule } from "./worker.module.js";
import { createMaintenanceRunner } from "./worker.module.js";

async function bootstrap(): Promise<void> {
  await NestFactory.createApplicationContext(WorkerModule);
  const maintenance = createMaintenanceRunner();
  await maintenance.runOnce();
  setInterval(() => void maintenance.runOnce(), 15 * 60 * 1000).unref();
}

void bootstrap();
