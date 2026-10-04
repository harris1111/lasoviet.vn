import assert from "node:assert/strict";
import {spawn, execFileSync} from "node:child_process";
import {cpSync, mkdtempSync, readFileSync, writeFileSync} from "node:fs";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import {startCanonicalQaProxy} from "./fd109-qa-proxy.mjs";
const evidence = process.env.LSV_FUNNEL_EVIDENCE_DIRECTORY ?? mkdtempSync(path.join(os.tmpdir(), "lsv80-golden-"));
const relativeEvidence = path.relative(process.cwd(), path.resolve(evidence));
assert(path.resolve(evidence) !== path.parse(path.resolve(evidence)).root && (relativeEvidence === ".." || relativeEvidence.startsWith(".." + path.sep) || path.isAbsolute(relativeEvidence)), "PRIVATE_EVIDENCE_OUTSIDE_REPOSITORY_REQUIRED");
const environment = {...process.env, LSV_FUNNEL_EVIDENCE_DIRECTORY: evidence};
for (const [from, to] of [["apps/web/.next/static", "apps/web/.next/standalone/apps/web/.next/static"], ["apps/web/public", "apps/web/.next/standalone/apps/web/public"]]) cpSync(from, to, {recursive: true});
let started = false, relay, proxy;
try {
  const output = execFileSync("python3", ["scripts/funnel-qa-environment.py"], {env: environment, encoding: "utf8"});
  started = true; writeFileSync(path.join(evidence, "setup.json"), output, {mode: 0o600});
  const inspect = JSON.parse(execFileSync("docker", ["inspect", "lsv80-qa-web"], {encoding: "utf8"}))[0];
  assert.deepEqual(Object.keys(inspect.NetworkSettings.Networks), ["lsv80-qa"]);
  const ip = inspect.NetworkSettings.Networks["lsv80-qa"].IPAddress;
  relay = net.createServer(client => {
    const upstream = net.connect(3000, ip, () => {client.pipe(upstream); upstream.pipe(client);});
    upstream.on("error", () => client.destroy()); client.on("error", () => upstream.destroy()); client.on("close", () => upstream.destroy());
  });
  await new Promise((resolve, reject) => {relay.once("error", reject); relay.listen(65525, "127.0.0.1", resolve);});
  proxy = await startCanonicalQaProxy({certificateDirectory: evidence, webOrigin: "http://127.0.0.1:65525"});
  const status = await new Promise(resolve => {
    const child = spawn("pnpm", ["exec", "playwright", "test", "--config", "playwright.funnel.config.ts"], {stdio: "inherit", env: {...environment, PLAYWRIGHT_QA_PROXY: proxy.server}});
    child.on("error", () => resolve(1)); child.on("close", code => resolve(code ?? 1));
  });
  process.exitCode = status;
} finally {
  await proxy?.close(); relay?.close();
  if (started) {
    const output = execFileSync("python3", ["scripts/funnel-qa-environment.py", "cleanup"], {env: environment, encoding: "utf8"});
    writeFileSync(path.join(evidence, "cleanup.json"), output, {mode: 0o600});
    console.log("Owned isolated QA containers, network and credentials removed.");
  }
}
