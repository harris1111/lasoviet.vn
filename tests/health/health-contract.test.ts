import { describe, expect, it } from "vitest";

import { HealthV1Schema } from "@lasoviet/contracts";

import {
  HealthController,
  getHealth,
  type HealthProbes,
} from "../../apps/api/src/health/health.controller.js";

const readyRequired: HealthProbes = {
  postgres: async () => true,
  redis: async () => true,
  config: async () => true,
};

describe("health contract", () => {
  it("reports optional AI and cloud S3 degradation without failing readiness", async () => {
    const health = await getHealth({
      ...readyRequired,
      ai: async () => false,
      cloudS3: async () => false,
    });

    expect(HealthV1Schema.parse(health)).toEqual(health);
    expect(health.status).toBe("degraded");
    expect(health.required.every((dependency) => dependency.status === "ready")).toBe(
      true,
    );
    expect(health.degraded).toEqual([
      { name: "ai", status: "degraded" },
      { name: "cloudS3", status: "degraded" },
    ]);
  });

  it("returns a required dependency error when readiness is unavailable", async () => {
    const controller = new HealthController({
      ...readyRequired,
      redis: async () => false,
    });

    await expect(controller.ready()).rejects.toMatchObject({
      response: {
        code: "REQUIRED_DEPENDENCY_UNREADY",
      },
      status: 503,
    });
  });
});
