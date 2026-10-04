import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { expect, it } from "vitest";

it("strips public maps without following links or deleting executable assets", () => {
  const fixture = mkdtempSync(join(tmpdir(), "lsv81-map-boundary-"));
  const assets = join(fixture, "apps/web/.next/static/chunks");
  mkdirSync(assets, {recursive: true});
  writeFileSync(join(assets, "app.js"), "executable"); writeFileSync(join(assets, "app.js.map"), "private source");
  const outside = join(fixture, "private.map"); writeFileSync(outside, "operator data");
  symlinkSync(outside, join(assets, "external.map"));
  execFileSync(process.execPath, [resolve("scripts/remove-web-source-maps.mjs"), "apps/web/.next/static"], {cwd: fixture});
  expect(existsSync(join(assets, "app.js.map"))).toBe(false);
  expect(readFileSync(join(assets, "app.js"), "utf8")).toBe("executable");
  expect(readFileSync(outside, "utf8")).toBe("operator data");
  expect(() => execFileSync(process.execPath, [resolve("scripts/remove-web-source-maps.mjs"), fixture], {cwd: fixture, stdio: "pipe"})).toThrow();
});
