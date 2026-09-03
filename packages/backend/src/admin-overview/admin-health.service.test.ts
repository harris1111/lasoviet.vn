import { describe, expect, it } from "vitest";

import { createAdminHealthService } from "./admin-health.service.js";

describe("admin health service", () => {
  it("preserves explicit degraded and unavailable probe outcomes", async () => {
    const health = await createAdminHealthService({
      postgres: async () => "ready",
      commerceWorkflow: async () => "degraded",
      reportGeneration: async () => "unready",
    }).readHealth();

    expect(health).toMatchObject({
      status: "unready",
      dependencies: expect.arrayContaining([
        { name: "commerce_workflow", status: "degraded" },
        { name: "report_generation", status: "unready" },
        { name: "asset_delivery", status: "unavailable" },
      ]),
    });
  });

  it("marks a throwing configured probe unready instead of unavailable", async () => {
    const health = await createAdminHealthService({
      postgres: async () => "ready",
      supportWorkflow: async () => {
        throw new Error("probe failed");
      },
    }).readHealth();

    expect(health).toMatchObject({
      status: "unready",
      dependencies: expect.arrayContaining([
        { name: "support_workflow", status: "unready" },
      ]),
    });
  });

  it.each([
    ["ready", { postgres: async () => "ready", commerceWorkflow: async () => "ready", reportGeneration: async () => "ready", assetDelivery: async () => "ready", supportWorkflow: async () => "ready", privacyWorkflow: async () => "ready" }],
    ["degraded", { postgres: async () => "ready", commerceWorkflow: async () => "degraded" }],
    ["unready", { postgres: async () => "unready" }],
    ["unavailable", {}],
  ] as const)("derives aggregate %s without inferring absent sources", async (status, dependencies) => {
    const health = await createAdminHealthService(dependencies).readHealth();
    expect(health.status).toBe(status);
  });
});
