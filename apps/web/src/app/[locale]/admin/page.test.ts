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
  const AdminOverviewTable = vi.fn(() => null);

  return {
    notFound,
    resolveVerifiedAccountActor,
    request,
    recordPreflightDenial,
    privateApiClient,
    privateAdminAuditClient,
    AdminOverviewTable,
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
  AdminOverviewTable: dependencies.AdminOverviewTable,
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

  it("renders the safe invalid-filter state without calling the overview API", async () => {
    dependencies.resolveVerifiedAccountActor.mockResolvedValueOnce({
      kind: "account",
      userId: "admin-1",
      sessionId: "session-1",
      requestId: "signed-request-id",
    });
    dependencies.request.mockResolvedValueOnce({ role: "operations" });

    const element = await AdminPage({
      searchParams: Promise.resolve({ page: "not-a-number", pageSize: "25" }),
    });

    expect(dependencies.request).toHaveBeenCalledTimes(1);
    expect(element.props).toEqual({ error: "invalid_filters" });
  });
});
