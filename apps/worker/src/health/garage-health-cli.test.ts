import { describe, expect, it, vi } from "vitest";

import { runGarageHealthCli } from "./garage-health-cli.js";

const garageEnvironment: NodeJS.ProcessEnv = {
  NODE_ENV: "test",
  SEPAY_ENV: "disabled",
  GARAGE_PDF_ENABLED: "true",
  GARAGE_ENDPOINT: "http://garage:3900",
  GARAGE_REGION: "lasoviet-private",
  GARAGE_BUCKET: "lasoviet-report-assets",
  GARAGE_ACCESS_KEY_ID: "synthetic-access-key",
  GARAGE_SECRET_ACCESS_KEY: "synthetic-secret-key",
  GARAGE_RPC_SECRET: "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
};

function stderr() {
  const writes: string[] = [];
  return {
    writes,
    stream: { write: (chunk: string) => writes.push(chunk) },
  };
}

describe("runGarageHealthCli", () => {
  it("probes an enabled closed Garage group", async () => {
    const output = stderr();
    const probe = vi.fn().mockResolvedValue(undefined);

    await expect(runGarageHealthCli({
      environment: garageEnvironment,
      probe,
    }, output.stream)).resolves.toBe(0);
    expect(probe).toHaveBeenCalledOnce();
    expect(output.writes).toEqual([]);
  });

  it("fails closed for disabled or invalid Garage configuration without printing values", async () => {
    const disabled = stderr();
    await expect(runGarageHealthCli({
      environment: { NODE_ENV: "test", SEPAY_ENV: "disabled" },
    }, disabled.stream)).resolves.toBe(1);
    expect(disabled.writes).toEqual(["GARAGE_S3_HEALTH_CONFIG_INVALID\n"]);

    const invalid = stderr();
    await expect(runGarageHealthCli({
      environment: { ...garageEnvironment, GARAGE_ENDPOINT: "https://invalid.example" },
    }, invalid.stream)).resolves.toBe(1);
    expect(invalid.writes.join("")).not.toContain("invalid.example");
    expect(invalid.writes.join("")).not.toContain("synthetic-secret-key");
  });

  it("redacts unavailable probe failures", async () => {
    const output = stderr();
    await expect(runGarageHealthCli({
      environment: garageEnvironment,
      probe: async () => { throw new Error("synthetic-secret-key"); },
    }, output.stream)).resolves.toBe(1);
    expect(output.writes).toEqual(["GARAGE_S3_HEALTH_UNAVAILABLE\n"]);
  });
});
