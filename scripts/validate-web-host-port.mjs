import { createServer } from "node:net";
import { readFile, realpath } from "node:fs/promises";
import { isAbsolute, relative, resolve } from "node:path";

const MIN_PORT = 49152;
const MAX_PORT = 65535;
const root = await realpath(process.cwd());

function argument(name) {
  const index = process.argv.indexOf(name);
  const value = index === -1 ? undefined : process.argv[index + 1];
  if (value === undefined || value.startsWith("--")) {
    throw new Error(`${name} is required`);
  }
  return value;
}

function isInside(parent, child) {
  const path = relative(parent, child);
  return path === "" || (!path.startsWith("..") && !isAbsolute(path));
}

function parsePort(content) {
  const value = /^WEB_HOST_PORT=(\d+)$/m.exec(content)?.[1];
  return value === undefined ? undefined : Number(value);
}

async function available(port) {
  return new Promise((resolveAvailable) => {
    const server = createServer();
    server.once("error", () => resolveAvailable(false));
    server.listen(port, "127.0.0.1", () => {
      server.close(() => resolveAvailable(true));
    });
  });
}

const envFile = await realpath(resolve(argument("--env-file")));
if (isInside(root, envFile)) {
  throw new Error("DEPLOY_ENV_FILE must be outside the repository");
}
const port = parsePort(await readFile(envFile, "utf8"));
if (
  port === undefined ||
  !Number.isInteger(port) ||
  port < MIN_PORT ||
  port > MAX_PORT
) {
  throw new Error(`WEB_HOST_PORT must be in ${MIN_PORT}-${MAX_PORT}`);
}
if (!(await available(port))) {
  throw new Error("WEB_HOST_PORT is already occupied");
}

console.info(`WEB_HOST_PORT=${port}`);
