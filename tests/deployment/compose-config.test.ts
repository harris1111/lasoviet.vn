import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import { promisify } from "node:util";

import { describe, expect, it } from "vitest";

const execFileAsync = promisify(execFile);
const root = process.cwd();
const composeFiles = [
  "docker-compose.yml",
  "docker-compose.production.yml",
].map((file) => `${root}/${file}`);

async function composeConfig() {
  const { stdout } = await execFileAsync(
    "docker",
    [
      "compose",
      "--env-file",
      `${root}/.env.example`,
      ...composeFiles.flatMap((file) => ["-f", file]),
      "config",
      "--format",
      "json",
    ],
    { cwd: root },
  );
  return JSON.parse(stdout) as {
    services: Record<string, Record<string, unknown>>;
    volumes: Record<string, unknown>;
  };
}

describe("founder-run Compose topology", () => {
  it("keeps browser authentication same-origin without a public auth build argument", async () => {
    const configuration = await composeConfig();
    const [webDockerfile, authClient] = await Promise.all([
      readFile(`${root}/apps/web/Dockerfile`, "utf8"),
      readFile(`${root}/apps/web/src/auth/auth-client.ts`, "utf8"),
    ]);

    expect(configuration.services.web?.build).not.toHaveProperty("args");
    expect(webDockerfile).not.toContain("NEXT_PUBLIC_AUTH_URL");
    expect(authClient).not.toContain("NEXT_PUBLIC_AUTH_URL");
  });

  it("keeps every service except web private and declares the required lifecycle policy", async () => {
    const configuration = await composeConfig();

    expect(Object.keys(configuration.services).sort()).toEqual([
      "api",
      "migrate",
      "postgres",
      "redis",
      "web",
      "worker",
    ]);
    expect(configuration.services.web?.ports).toEqual([
      {
        host_ip: "127.0.0.1",
        published: "49152",
        target: 3000,
        protocol: "tcp",
        mode: "ingress",
      },
    ]);
    for (const name of ["api", "worker", "migrate", "postgres", "redis"]) {
      expect(configuration.services[name]?.ports).toBeUndefined();
    }
    for (const name of ["web", "api", "worker", "postgres", "redis"]) {
      expect(configuration.services[name]?.restart).toBe("unless-stopped");
      expect(configuration.services[name]?.logging).toMatchObject({
        driver: "json-file",
        options: { "max-size": "10m", "max-file": "5" },
      });
    }

    expect(configuration.services.migrate?.restart).toBe("no");
    expect(configuration.services.migrate?.depends_on).toMatchObject({
      postgres: { condition: "service_healthy" },
    });
    expect(configuration.services.api?.depends_on).toMatchObject({
      migrate: { condition: "service_completed_successfully" },
      redis: { condition: "service_healthy" },
    });
    expect(configuration.services.web?.depends_on).toMatchObject({
      api: { condition: "service_healthy" },
    });
    expect(configuration.services.postgres?.healthcheck).toBeDefined();
    expect(configuration.services.redis?.healthcheck).toBeDefined();
    expect(configuration.volumes).toMatchObject({
      postgres_data: {},
      redis_data: {},
    });
  });
});
