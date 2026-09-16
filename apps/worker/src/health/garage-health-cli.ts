import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { probeGarageReadiness } from "@lasoviet/backend";
import { loadEnvironment } from "@lasoviet/config";

export type GarageHealthCliDependencies = {
  environment?: NodeJS.ProcessEnv;
  probe?: () => Promise<void>;
};

export type CliStderr = {
  write(chunk: string): void;
};

export async function runGarageHealthCli(
  dependencies: GarageHealthCliDependencies = {},
  stderr: CliStderr = process.stderr,
): Promise<number> {
  const loaded = loadEnvironment(dependencies.environment ?? process.env);
  if (!loaded.ok || !loaded.value.garage.enabled) {
    stderr.write("GARAGE_S3_HEALTH_CONFIG_INVALID\n");
    return 1;
  }

  try {
    await (dependencies.probe ?? (() => probeGarageReadiness(loaded.value.garage)))();
    return 0;
  } catch {
    stderr.write("GARAGE_S3_HEALTH_UNAVAILABLE\n");
    return 1;
  }
}

const isEntrypoint =
  typeof process.argv[1] === "string" &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isEntrypoint) {
  void runGarageHealthCli().then((exitCode) => {
    process.exit(exitCode);
  });
}
