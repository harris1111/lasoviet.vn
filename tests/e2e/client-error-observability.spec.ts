import { expect, test } from "@playwright/test";
import { createRequire } from "node:module";
import { resolve } from "node:path";

const root = process.cwd();
const require = createRequire(resolve(root, "package.json"));
const { build } = createRequire(require.resolve("vite"))("esbuild");
let bundle = "";
test.beforeAll(async () => {
  const result = await build({ stdin: {resolveDir: resolve(root, "apps/web"), loader: "ts", contents: `
    import * as Sentry from "@sentry/nextjs";
    import {createAuthActions} from "./src/features/auth/auth-client-actions";
    import {clientErrorOptions, readClientErrorConfiguration} from "./src/features/observability/client-errors";
    const config = readClientErrorConfiguration({enabled: new URL(location.href).searchParams.get("enabled") ?? undefined,
      dsn: "https://${"a".repeat(32)}@o123.ingest.us.sentry.io/456", release: "${"b".repeat(40)}", environment: "production"});
    if(config) Sentry.init({...clientErrorOptions(config), integrations: [Sentry.globalHandlersIntegration(), Sentry.browserApiErrorsIntegration()]});
    window.captureAuthFailure = async () => {
      const noOp = async () => ({});
      const actions = createAuthActions({signUp: {email: noOp}, signIn: {email: noOp, social: async () => {throw new Error("private-provider-token");}},
        sendVerificationEmail: noOp, requestPasswordReset: noOp, resetPassword: noOp});
      try {await actions.signInWithGoogle("/la-so/private-chart?token=private-token");} catch {}
      await Sentry.flush(1000);
    };
    window.throwTestError = () => setTimeout(() => { throw new TypeError("private-runtime-token"); }, 0);
    window.captureTestError = async () => {
      Sentry.setUser({email: "private@example.test", id: "private-account"});
      Sentry.setContext("birth", {date: "private-birth"});
      Sentry.addBreadcrumb({message: "private-token"});
      const error = new TypeError("private-report-token");
      error.stack = "TypeError: private-report-token\\n    at privateFunction (https://lasoviet.net/_next/static/chunks/abc-123.js:12:34)";
      Sentry.captureException(error, {extra: {report: "private-report"}});
      await Sentry.flush(1000);
    };
  `}, bundle: true, write: false, format: "iife", platform: "browser",
    plugins: [{name: "unused-pages-router-fixture", setup(context) {
      context.onResolve({filter: /^next\/router$/}, () => ({path: "pages-router", namespace: "fixture"}));
      context.onLoad({filter: /.*/, namespace: "fixture"}, () => ({contents: "export default {events: {on() {}, off() {}}};", loader: "js"}));
    }}],
    define: {"process.env": "{}", "process.env.NODE_ENV": '"production"', "process.env.NEXT_PUBLIC_SENTRY_CLIENT_ENABLED": '"true"'},
  });
  bundle = result.outputFiles[0].text;
});
for (const enabled of [false, true]) test(`actual SDK ${enabled ? "captures only redacted errors" : "stays disabled"}`, async ({page}) => {
  const payloads: string[] = [];
  await page.route("**/*", async route => {
    if (route.request().url().includes("ingest.us.sentry.io")) {
      payloads.push(route.request().postData() ?? ""); await route.fulfill({status: 200, body: "{}"});
    } else await route.fulfill({contentType: "text/html", body: "<!doctype html><p>Client fixture</p>"});
  });
  await page.goto(`https://lasoviet.net/?enabled=${enabled}&token=private-token`);
  await page.addScriptTag({content: bundle});
  await page.evaluate(async () => { await (window as unknown as {captureTestError: () => Promise<void>}).captureTestError(); });
  if (!enabled) expect(payloads).toEqual([]);
  else {
    expect(payloads).toHaveLength(1);
    expect(payloads[0]).not.toMatch(/private-|private@|birth|token|report|request|breadcrumbs|user|contexts/);
    const lines = payloads[0].trim().split("\n");
    const item = JSON.parse(lines[1]); expect(item.type).toBe("event");
    const event = JSON.parse(lines[2]);
    expect(event.release).toBe("b".repeat(40));
    expect(event.exception.values[0].stacktrace.frames).toEqual([{filename: "https://lasoviet.net/_next/static/chunks/abc-123.js", lineno: 12, colno: 34, in_app: true}]);
    expect(event.exception.values[0].value).toBe("Client runtime error (details redacted)");
  }
});

for (const kind of ["uncaught", "handled Google"]) test(`captures an actual first-party ${kind} error`, async ({page}) => {
  const payloads: string[] = [];
  await page.route("**/*", async route => {
    if (route.request().url().includes("ingest.us.sentry.io")) {
      payloads.push(route.request().postData() ?? ""); await route.fulfill({status: 200, body: "{}"});
    } else if (new URL(route.request().url()).pathname.endsWith("observability-fixture.js")) {
      await route.fulfill({contentType: "text/javascript", body: bundle});
    } else await route.fulfill({contentType: "text/html", body: '<!doctype html><button id="working">Content works</button><script src="/_next/static/chunks/observability-fixture.js"></script>'});
  });
  await page.goto("https://lasoviet.net/?enabled=true&token=private-token");
  if (kind === "uncaught") await page.evaluate(() => { (window as unknown as {throwTestError: () => void}).throwTestError(); });
  else await page.evaluate(async () => { await (window as unknown as {captureAuthFailure: () => Promise<void>}).captureAuthFailure(); });
  await expect.poll(() => payloads.length).toBe(1);
  expect(payloads[0]).not.toMatch(/private-|private@|birth|token|report|request|breadcrumbs|user|contexts/);
  const event = JSON.parse(payloads[0].trim().split("\n")[2]);
  expect(event.exception.values[0].stacktrace.frames[0].filename).toBe("https://lasoviet.net/_next/static/chunks/observability-fixture.js");
  expect(event.exception.values[0].stacktrace.frames[0].lineno).toBeGreaterThan(0);
  await expect(page.locator("#working")).toBeVisible();
});
