import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

// Every image the web app refers to by a public path must exist in apps/web/public. A renamed or never-added file
// otherwise ships as a broken image (the birth form logo did: /brand/lasoviet-logo-ngang-muc-son.svg returned 404).
const root = resolve(__dirname, "../..");
const source = join(root, "apps/web/src");
const publicDir = join(root, "apps/web/public");
const reference = /["'(](\/(?:brand|images|graphics|icons|uploads)\/[A-Za-z0-9_\-./%]+\.(?:svg|png|webp|jpg|jpeg|avif|gif|ico))/g;

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return files(path);
    return /\.(ts|tsx|css|json|mdx)$/.test(name) && !/\.test\./.test(name) ? [path] : [];
  });
}

describe("public asset references", () => {
  it("never points at an image that is not in apps/web/public", () => {
    const referenced = new Map<string, string>();
    for (const file of files(source)) {
      for (const match of readFileSync(file, "utf8").matchAll(reference)) referenced.set(match[1]!, file.replace(root, ""));
    }
    expect(referenced.size).toBeGreaterThan(20);
    const missing = [...referenced].filter(([path]) => !existsSync(join(publicDir, decodeURIComponent(path)))).map(([path, file]) => `${path} (${file})`);
    expect(missing).toEqual([]);
  });
});
