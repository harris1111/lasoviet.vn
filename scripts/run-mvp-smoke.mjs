import { randomBytes } from "node:crypto";
import { readFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import { resolve } from "node:path";

function argument(name) {
  const index = process.argv.indexOf(name);
  const value = index === -1 ? undefined : process.argv[index + 1];
  if (value === undefined || value.startsWith("--")) {
    throw new Error(`${name} is required`);
  }
  return value;
}

function environment(content) {
  return Object.fromEntries(
    content
      .split(/\r?\n/)
      .flatMap((line) => {
        const match = /^([A-Z0-9_]+)=(.*)$/.exec(line);
        return match === null ? [] : [[match[1], match[2]]];
      }),
  );
}

function run(command, args, env) {
  return new Promise((resolveRun, reject) => {
    const child = spawn(command, args, {
      cwd: process.cwd(),
      env,
      shell: process.platform === "win32",
      stdio: "inherit",
    });
    child.once("error", reject);
    child.once("exit", (code) => {
      code === 0
        ? resolveRun()
        : reject(new Error(`MVP smoke failed with exit code ${code}`));
    });
  });
}

const envFile = resolve(argument("--env-file"));
const origin = argument("--origin");
const values = environment(await readFile(envFile, "utf8"));
if (values.MVP_TEST_RECIPIENT === undefined || values.MVP_TEST_RECIPIENT === "") {
  throw new Error("MVP_TEST_RECIPIENT is required in the external deploy env");
}

await run(
  process.platform === "win32" ? "corepack.cmd" : "corepack",
  ["pnpm@11.25.0", "playwright", "test", "tests/e2e/mvp-happy-path.spec.ts"],
  {
    ...process.env,
    PLAYWRIGHT_BASE_URL: origin,
    MVP_TEST_RECIPIENT: values.MVP_TEST_RECIPIENT,
    MVP_TEST_PASSWORD: values.MVP_TEST_PASSWORD
      ?? `Mvp-${randomBytes(18).toString("base64url")}a1`,
    MVP_SIGNUP_ALREADY_SENT: values.MVP_SIGNUP_ALREADY_SENT ?? "false",
  },
);
