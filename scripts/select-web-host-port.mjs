import { createServer } from "node:net";
import { access, mkdir, readFile, realpath, writeFile } from "node:fs/promises";
import { basename, dirname, isAbsolute, relative, resolve } from "node:path";
import { randomInt } from "node:crypto";

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

async function externalFile(value) {
  const target = resolve(value);
  await mkdir(dirname(target), { recursive: true });
  const parent = await realpath(dirname(target));
  const normalized = resolve(parent, basename(target));
  if (isInside(root, normalized)) {
    throw new Error("DEPLOY_ENV_FILE must be outside the repository");
  }
  return normalized;
}

function parsePort(content) {
  const value = /^WEB_HOST_PORT=(\d+)$/m.exec(content)?.[1];
  return value === undefined ? undefined : Number(value);
}

function validPort(port) {
  return Number.isInteger(port) && port >= MIN_PORT && port <= MAX_PORT;
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

async function selectAvailablePort() {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const port = randomInt(MIN_PORT, MAX_PORT + 1);
    if (await available(port)) {
      return port;
    }
  }
  throw new Error("Unable to find an unused WEB_HOST_PORT");
}

const output = await externalFile(argument("--output"));
const requested = process.argv.includes("--port")
  ? Number(argument("--port"))
  : undefined;
if (requested !== undefined && !validPort(requested)) {
  throw new Error(`WEB_HOST_PORT must be in ${MIN_PORT}-${MAX_PORT}`);
}

let current = "";
try {
  current = await readFile(output, "utf8");
} catch (error) {
  if (error?.code !== "ENOENT") {
    throw error;
  }
}

const existing = parsePort(current);
if (existing !== undefined && !validPort(existing)) {
  throw new Error(`Existing WEB_HOST_PORT must be in ${MIN_PORT}-${MAX_PORT}`);
}
if (existing !== undefined && requested !== undefined && existing !== requested) {
  throw new Error("Existing WEB_HOST_PORT differs from the requested port");
}

const selected = existing ?? requested ?? await selectAvailablePort();
if (!(await available(selected))) {
  throw new Error("WEB_HOST_PORT is already occupied");
}
if (existing === undefined) {
  await writeFile(
    output,
    `${current}${current !== "" && !current.endsWith("\n") ? "\n" : ""}WEB_HOST_PORT=${selected}\n`,
    "utf8",
  );
}

await access(output);
console.info(`WEB_HOST_PORT=${selected}`);
