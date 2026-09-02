import { createServer } from "node:net";
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

import { describe, expect, it } from "vitest";

const execFileAsync = promisify(execFile);
const root = process.cwd();
const selectScript = join(root, "scripts", "select-web-host-port.mjs");
const validateScript = join(root, "scripts", "validate-web-host-port.mjs");

async function externalEnvFile() {
  return join(await mkdtemp(join(tmpdir(), "lasoviet-deploy-")), "deploy.env");
}

async function select(output: string, port?: number) {
  return execFileAsync(
    process.execPath,
    [selectScript, "--output", output, ...(port === undefined ? [] : ["--port", String(port)])],
    { cwd: root },
  );
}

describe("WEB_HOST_PORT selection", () => {
  it("persists and reuses one valid loopback port in an explicit external env file", async () => {
    const output = await externalEnvFile();

    await select(output);
    const first = await readFile(output, "utf8");
    const match = /^WEB_HOST_PORT=(\d+)$/m.exec(first);
    expect(match).not.toBeNull();
    expect(Number(match?.[1])).toBeGreaterThanOrEqual(49152);
    expect(Number(match?.[1])).toBeLessThanOrEqual(65535);

    await expect(
      execFileAsync(process.execPath, [validateScript, "--env-file", output], {
        cwd: root,
      }),
    ).resolves.toMatchObject({ stderr: "" });
    await select(output);
    expect(await readFile(output, "utf8")).toBe(first);
  });

  it("rejects an occupied port and any deploy env inside the repository", async () => {
    const occupied = createServer();
    await new Promise<void>((resolve, reject) => {
      occupied.once("error", reject);
      occupied.listen(0, "127.0.0.1", () => resolve());
    });
    const address = occupied.address();
    if (address === null || typeof address === "string") {
      throw new Error("Expected a TCP address");
    }

    await expect(select(await externalEnvFile(), address.port)).rejects.toThrow();
    await expect(select(join(root, ".env.local"))).rejects.toThrow();

    await new Promise<void>((resolve, reject) => {
      occupied.close((error) => (error ? reject(error) : resolve()));
    });
  });
});
