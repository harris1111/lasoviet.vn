import { describe, expect, it, vi } from "vitest";

import { createDatabaseAdminOverviewRepository } from "./admin-overview.repository.js";

function query(result: unknown) {
  const builder = {
    from: vi.fn(() => builder),
    where: vi.fn(() => builder),
    orderBy: vi.fn(() => builder),
    limit: vi.fn(() => builder),
    offset: vi.fn(() => builder),
    then: (resolve: (value: unknown) => unknown) => Promise.resolve(result).then(resolve),
  };
  return builder;
}

describe("admin overview repository", () => {
  it("orders each account page by creation time and opaque ID", async () => {
    const accountRecords = [{
      id: "account-2",
      emailVerified: true,
      isAnonymous: false,
      createdAt: new Date("2026-09-03T00:00:00Z"),
    }];
    const queries = [
      query([{ value: 1 }]), query([{ value: 1 }]), query([{ value: 0 }]), query(accountRecords),
    ];
    const database = { select: vi.fn(() => queries.shift()) };

    await createDatabaseAdminOverviewRepository(database as never).readAccounts({
      page: 2, pageSize: 25,
    });

    expect(queries).toHaveLength(0);
    expect(database.select).toHaveBeenCalledTimes(4);
    expect((database.select.mock.results[3]?.value as { orderBy: ReturnType<typeof vi.fn> })
      .orderBy).toHaveBeenCalledOnce();
  });
});
