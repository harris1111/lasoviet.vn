import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  validateWorkerHealth,
  type ValidateWorkerHealthDependencies,
} from "./worker-heartbeat.js";

export type CliStderr = {
  write(chunk: string): void;
};

export async function runWorkerHealthCli(
  dependencies: ValidateWorkerHealthDependencies = {},
  stderr: CliStderr = process.stderr,
): Promise<number> {
  const result = await validateWorkerHealth(dependencies);
  if (result.ok) {
    return 0;
  }
  stderr.write(`${result.code}\n`);
  return 1;
}

const isEntrypoint =
  typeof process.argv[1] === "string" &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isEntrypoint) {
  void runWorkerHealthCli().then((exitCode) => {
    process.exit(exitCode);
  });
}
