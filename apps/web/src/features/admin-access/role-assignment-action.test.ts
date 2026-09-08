import { describe, expect, it, vi } from "vitest";

vi.mock("../../api/private-api-client", () => ({
  privateApiClient: vi.fn(),
}));
vi.mock("../../auth/resolve-current-actor", () => ({
  resolveVerifiedAccountActor: vi.fn(),
}));

import { privateApiClient } from "../../api/private-api-client";
import { resolveVerifiedAccountActor } from "../../auth/resolve-current-actor";
import { submitRoleAssignment } from "./role-assignment-action";

describe("role assignment action", () => {
  it("sends only the assign command fields", async () => {
    vi.mocked(resolveVerifiedAccountActor).mockResolvedValue({
      kind: "account", userId: "admin-1", sessionId: "s-1", requestId: "r-1",
    });
    const request = vi.fn();
    vi.mocked(privateApiClient).mockReturnValue({ request } as never);
    const form = new FormData();
    form.set("operation", "assign");
    form.set("subjectAccountId", "account-2");
    form.set("role", "support");
    form.set("expectedVersion", "0");
    form.set("idempotencyKey", "key-1");
    form.set("reasonCode", "access_onboarding");

    await submitRoleAssignment(form);

    expect(JSON.parse(request.mock.calls[0]![1].body)).toEqual({
      subjectAccountId: "account-2", role: "support", expectedVersion: 0,
      idempotencyKey: "key-1", reasonCode: "access_onboarding",
    });
  });

  it("sends only the revoke command fields", async () => {
    vi.mocked(resolveVerifiedAccountActor).mockResolvedValue({
      kind: "account", userId: "admin-1", sessionId: "s-1", requestId: "r-1",
    });
    const request = vi.fn();
    vi.mocked(privateApiClient).mockReturnValue({ request } as never);
    const form = new FormData();
    form.set("operation", "revoke");
    form.set("assignmentId", "assignment-2");
    form.set("expectedVersion", "2");
    form.set("idempotencyKey", "key-2");
    form.set("reasonCode", "access_offboarding");

    await submitRoleAssignment(form);

    expect(JSON.parse(request.mock.calls[0]![1].body)).toEqual({
      assignmentId: "assignment-2", expectedVersion: 2,
      idempotencyKey: "key-2", reasonCode: "access_offboarding",
    });
  });
});
