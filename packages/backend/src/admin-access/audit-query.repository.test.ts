import { describe, expect, it, vi } from "vitest";

import { createDatabaseAuditQueryRepository } from "./audit-query.repository.js";

describe("audit query repository", () => {
  it("rejects a malformed keyset cursor before querying", async () => {
    const select = vi.fn();
    const repository = createDatabaseAuditQueryRepository({ select } as never);

    await expect(repository.search({
      pageSize: 25,
      cursor: "not-a-keyset-cursor",
    })).rejects.toThrow("ADMIN_FILTER_INVALID");
    expect(select).not.toHaveBeenCalled();
  });
});
