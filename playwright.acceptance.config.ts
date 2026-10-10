import {defineConfig} from "@playwright/test";
if (!process.env.PLAYWRIGHT_QA_PROXY || !process.env.LSV_ACCEPTANCE_EVIDENCE_DIRECTORY) throw Error("GUARDED_QA_RUNNER_REQUIRED");
export default defineConfig({
  testDir: "./tests/e2e", testMatch: "authenticated-paid-acceptance.spec.ts", workers: 1, retries: 0,
  timeout: 360_000, reporter: "list", outputDir: process.env.LSV_ACCEPTANCE_EVIDENCE_DIRECTORY + "/playwright",
  use: {navigationTimeout: 20_000, actionTimeout: 30_000, baseURL: "https://lasoviet.net", proxy: {server: process.env.PLAYWRIGHT_QA_PROXY}, ignoreHTTPSErrors: true, trace: "off", screenshot: "off", video: "off"},
});
