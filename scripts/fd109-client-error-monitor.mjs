import assert from "node:assert/strict";

// Playwright 1.62.1's WKPage console handler emits pageerror for every
// javascript-source console error, including handled canceled fetches.
export async function monitorClientErrors(context, page, engine) {
  const protocolErrors = [], canceled = [], exceptions = [];
  await context.exposeBinding("__qaRecordUnhandled", (_source, event) => {exceptions.push(event);});
  await context.addInitScript(() => {
    const report = event => {void window.__qaRecordUnhandled(event).catch(() => {});};
    addEventListener("error", event => {
      if (event.error) report({kind: "error", message: String(event.message)});
    });
    addEventListener("unhandledrejection", event => report({kind: "unhandledrejection", message: String(event.reason)}));
  });
  page.on("pageerror", error => protocolErrors.push({name: error.name, message: error.message, stack: error.stack}));
  page.on("requestfailed", request => {
    if (request.failure()?.errorText === "Load request cancelled") canceled.push(request.url());
  });
  return {
    snapshot: () => ({protocolErrors, canceledRequests: canceled, exceptions}),
    verify() {
      assert.deepEqual(exceptions, [], "ACTUAL_UNHANDLED_CLIENT_EXCEPTION");
      const handled = [], unresolvedRsc = [], unexpected = [];
      for (const error of protocolErrors) {
        const diagnostic = error.stack?.split("\n")[0];
        const match = engine === "webkit" && error.name === "Fetch API cannot load https" && canceled.find(url => {
          const parsed = new URL(url);
          return parsed.origin === "https://lasoviet.net" &&
            (parsed.searchParams.has("_rsc") || ["/api/auth/get-session", "/api/analytics/events"].includes(parsed.pathname)) &&
            diagnostic === `Fetch API cannot load ${url} due to access control checks.`;
        });
        if (match) {handled.push(error); continue;}
        // Browser-generated RSC fetch console diagnostics are not DOM exceptions.
        // Keep unmatched observations open rather than inventing cancellation proof.
        const prefix = "Fetch API cannot load ", suffix = " due to access control checks.";
        let rscDiagnostic = false;
        if (engine === "webkit" && error.name === "Fetch API cannot load https" && diagnostic?.startsWith(prefix) && diagnostic.endsWith(suffix)) {
          try {
            const url = new URL(diagnostic.slice(prefix.length, -suffix.length));
            rscDiagnostic = url.origin === "https://lasoviet.net" && url.searchParams.has("_rsc");
          } catch {rscDiagnostic = false;}
        }
        (rscDiagnostic ? unresolvedRsc : unexpected).push(error);
      }
      assert.deepEqual(unexpected, [], "UNEXPECTED_CLIENT_PROTOCOL_ERROR");
      return {actualUnhandled: 0, handledCanceledFetchDiagnostics: handled.length, unclassifiedRscFetchDiagnostics: unresolvedRsc.length};
    },
  };
}
