import { runFd082GateFromEnvironment } from "./fd082-v41-gate.js";

if (process.argv[1]?.endsWith("fd082-v41-gate-cli.js")) {
  void runFd082GateFromEnvironment(process.argv.slice(2), (line) => {
    process.stdout.write(`${JSON.stringify(line)}\n`);
  }).catch((error: unknown) => {
    process.stderr.write(`${error instanceof Error ? error.message : "FD082_GATE_FAILED"}\n`);
    process.exitCode = 1;
  });
}
