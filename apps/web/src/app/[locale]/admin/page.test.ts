import { beforeEach, describe, expect, it, vi } from "vitest";

const dependencies = vi.hoisted(() => {
  const notFound = vi.fn(() => {
    throw new Error("NOT_FOUND");
  });
  const resolveVerifiedAccountActor = vi.fn();
  const request = vi.fn();
  const recordPreflightDenial = vi.fn();
  const privateApiClient = vi.fn(() => ({ request }));
  const privateAdminAuditClient = vi.fn(() => ({ recordPreflightDenial }));

  return {
    notFound,
    resolveVerifiedAccountActor,
    request,
    recordPreflightDenial,
    privateApiClient,
    privateAdminAuditClient,
  };
});

vi.mock("next/navigation", () => ({ notFound: dependencies.notFound }));
vi.mock("server-only", () => ({}));
vi.mock("../../../auth/resolve-current-actor", () => ({
  resolveVerifiedAccountActor: dependencies.resolveVerifiedAccountActor,
}));
vi.mock("../../../api/private-api-client", () => ({
  privateApiClient: dependencies.privateApiClient,
  privateAdminAuditClient: dependencies.privateAdminAuditClient,
}));
vi.mock("../../../features/admin-overview/admin-overview-table", () => ({
  AdminOverviewTable: () => null,
}));

import AdminPage from "./page";

describe("admin page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it.each([
    "missing session",
    "anonymous session",
    "unverified account",
  ])("audits a %s preflight denial before returning not found", async () => {
    dependencies.resolveVerifiedAccountActor.mockRejectedValueOnce(
      new Error("ADMIN_AUTH_REQUIRED"),
    );

    await expect(AdminPage()).rejects.toThrow("NOT_FOUND");

    expect(dependencies.privateAdminAuditClient).toHaveBeenCalledOnce();
    expect(dependencies.recordPreflightDenial).toHaveBeenCalledOnce();
    expect(dependencies.privateApiClient).not.toHaveBeenCalled();
  });
});
