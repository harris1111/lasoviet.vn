import type { AdminOverviewV1 } from "@lasoviet/contracts";

type AdminOverviewTableProps = {
  overview?: AdminOverviewV1;
  page: number;
  pageSize: number;
};

function stateClass(status: string): string {
  return status === "ready" || status === "available"
    ? "admin-state admin-state-ready"
    : "admin-state admin-state-unready";
}

export function AdminOverviewTable({
  overview,
  page,
  pageSize,
}: AdminOverviewTableProps) {
  if (overview === undefined) {
    return <p className="admin-overview-error" role="alert">Overview unavailable.</p>;
  }

  const accountPage = overview.accountPage;
  const previous = Math.max(1, page - 1);
  const next = accountPage !== null && page * pageSize < accountPage.total
    ? page + 1
    : page;

  return (
    <main className="admin-overview container">
      <header className="admin-overview-header">
        <div>
          <p className="eyebrow">Private operations</p>
          <h1>Operations overview</h1>
        </div>
        <p className={stateClass(overview.health.status)} role="status">
          {overview.health.status}
        </p>
      </header>

      <section aria-labelledby="admin-readiness-heading">
        <h2 id="admin-readiness-heading">Readiness</h2>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead><tr><th>Dependency</th><th>Status</th></tr></thead>
            <tbody>{overview.health.dependencies.map((dependency) => (
              <tr key={dependency.name}>
                <td>{dependency.name.replaceAll("_", " ")}</td>
                <td><span className={stateClass(dependency.status)}>{dependency.status}</span></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </section>

      <section aria-labelledby="admin-modules-heading">
        <h2 id="admin-modules-heading">Authorized modules</h2>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead><tr><th>Module</th><th>Status</th><th>Summary</th></tr></thead>
            <tbody>{overview.modules.map((module) => (
              <tr key={module.id}>
                <td>{module.id}</td>
                <td><span className={stateClass(module.status)}>{module.status}</span></td>
                <td>{module.summary === undefined
                  ? "Unavailable"
                  : Object.entries(module.summary).map(([key, value]) =>
                    `${key}: ${value}`).join(", ")}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </section>

      {accountPage !== null && (
        <section aria-labelledby="admin-accounts-heading">
          <div className="admin-table-heading">
            <h2 id="admin-accounts-heading">Accounts</h2>
            <form>
              <input name="page" type="hidden" value="1" />
              <label>Rows
                <select aria-label="Rows per page" defaultValue={pageSize} name="pageSize">
                  <option value="10">10</option>
                  <option value="25">25</option>
                  <option value="50">50</option>
                </select>
              </label>
              <button type="submit">Apply</button>
            </form>
          </div>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead><tr><th>Account</th><th>Verification</th><th>Ownership</th><th>Created</th></tr></thead>
              <tbody>{accountPage.items.length === 0
                ? <tr><td colSpan={4}>No account records.</td></tr>
                : accountPage.items.map((account) => (
                  <tr key={account.id}>
                    <td>{account.id}</td><td>{account.verification}</td>
                    <td>{account.ownership}</td><td>{account.createdAt}</td>
                  </tr>
                ))}</tbody>
            </table>
          </div>
          <nav aria-label="Account pages" className="admin-pagination">
            <a aria-disabled={page === 1} href={`?page=${previous}&pageSize=${pageSize}`}>Previous</a>
            <span>Page {accountPage.page}</span>
            <a aria-disabled={next === page} href={`?page=${next}&pageSize=${pageSize}`}>Next</a>
          </nav>
        </section>
      )}
    </main>
  );
}
