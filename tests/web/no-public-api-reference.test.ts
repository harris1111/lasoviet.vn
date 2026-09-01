import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const webSourceRoot = join(process.cwd(), "apps", "web", "src");
const browserArtifactRoot = join(
  process.cwd(),
  "apps",
  "web",
  ".next",
  "static",
);

function readableFiles(root: string): string[] {
  if (!existsSync(root)) {
    return [];
  }

  return readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const path = join(root, entry.name);
    return entry.isDirectory() ? readableFiles(path) : [path];
  });
}

function browserReachableSources(): string[] {
  return readableFiles(webSourceRoot).filter((path) => {
    const normalized = path.replaceAll("\\", "/");
    return (
      normalized.includes("/app/[locale]/") ||
      normalized.includes("/features/") ||
      normalized.includes("/components/")
    );
  });
}

describe("private API boundary", () => {
  it("keeps private API configuration out of browser-reachable source and artifacts", () => {
    const contents = [
      ...browserReachableSources(),
      ...readableFiles(browserArtifactRoot),
    ].map((path) => readFileSync(path, "utf8"));

    for (const content of contents) {
      expect(content).not.toMatch(/PRIVATE_API_URL/);
      expect(content).not.toMatch(/https?:\/\/[^/\s]*api[^/\s]*/i);
    }
  });
});
