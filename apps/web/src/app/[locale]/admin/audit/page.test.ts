import { beforeEach, describe, expect, it, vi } from "vitest";

const dependencies = vi.hoisted(() => {
  const resolveVerifiedAccountActor = vi.fn();
  const request = vi.fn();
  return {
    resolveVerifiedAccountActor,
    request,
    privateApiClient: vi.fn(() => ({ request })),
    privateAdminAuditClient: vi.fn(() => ({ recordPreflightDenial: vi.fn() })),
  };
});

vi.mock("next/navigation", () => ({ notFound: () => { throw new Error("NOT_FOUND"); } }));
vi.mock("server-only", () => ({}));
vi.mock("../../../../auth/resolve-current-actor", () => ({
  resolveVerifiedAccountActor: dependencies.resolveVerifiedAccountActor,
}));
vi.mock("../../../../api/private-api-client", () => ({
  privateApiClient: dependencies.privateApiClient,
  privateAdminAuditClient: dependencies.privateAdminAuditClient,
}));

import AdminAuditPage from "./page";

describe("admin audit page", () => {
  beforeEach(() => vi.clearAllMocks());

  it("does not invoke the audit query for a roles-manage-only actor", async () => {
    dependencies.resolveVerifiedAccountActor.mockResolvedValue({
      kind: "account",
      userId: "admin-1",
      sessionId: "session-1",
      requestId: "signed-request-id",
    });
    dependencies.request.mockResolvedValueOnce({
      canReadAudit: false,
      canManageRoles: true,
    });

    await AdminAuditPage();

    expect(dependencies.request).toHaveBeenCalledTimes(1);
    expect(dependencies.request).toHaveBeenCalledWith("/admin/audit/access");
  });
});
