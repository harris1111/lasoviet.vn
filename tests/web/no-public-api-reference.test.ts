import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

import { describe, expect, it } from "vitest";

const webSourceRoot = join(process.cwd(), "apps", "web", "src");
const browserArtifactRoot = join(
  process.cwd(),
  "apps",
  "web",
  ".next",
  "static",
);
const privateApiClientPath = join(
  webSourceRoot,
  "api",
  "private-api-client.ts",
);
const sourceExtensions = [".ts", ".tsx"];

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

function importSpecifiers(source: string): string[] {
  return [...source.matchAll(/(?:from\s+|import\s*\()\s*["']([^"']+)["']/g)].map(
    (match) => match[1],
  );
}

function resolveLocalImport(sourcePath: string, specifier: string): string | undefined {
  if (!specifier.startsWith(".")) {
    return undefined;
  }

  const candidate = resolve(dirname(sourcePath), specifier);
  const candidates = [
    candidate,
    ...sourceExtensions.map((extension) => `${candidate}${extension}`),
    ...sourceExtensions.map((extension) => join(candidate, `index${extension}`)),
  ];

  return candidates.find((path) => existsSync(path));
}

function clientDependencyFiles(): string[] {
  const pending = readableFiles(webSourceRoot).filter((path) =>
    /^\s*["']use client["'];?/m.test(readFileSync(path, "utf8")),
  );
  const visited = new Set<string>();

  while (pending.length > 0) {
    const sourcePath = pending.pop();
    if (sourcePath === undefined || visited.has(sourcePath)) {
      continue;
    }
    visited.add(sourcePath);

    for (const specifier of importSpecifiers(readFileSync(sourcePath, "utf8"))) {
      const importedPath = resolveLocalImport(sourcePath, specifier);
      if (importedPath !== undefined && !visited.has(importedPath)) {
        pending.push(importedPath);
      }
    }
  }

  return [...visited];
}

describe("private API boundary", () => {
  it("keeps the private client out of browser source and current build artifacts", () => {
    const sourceFiles = browserReachableSources();
    const artifactFiles = readableFiles(browserArtifactRoot);

    expect(sourceFiles.length).toBeGreaterThan(0);
    expect(clientDependencyFiles()).not.toContain(privateApiClientPath);
    expect(artifactFiles.length).toBeGreaterThan(0);

    for (const path of [...sourceFiles, ...artifactFiles]) {
      const content = readFileSync(path, "utf8");
      expect(content).not.toMatch(/PRIVATE_API_URL/);
      expect(content).not.toMatch(/https?:\/\/[^/\s]*api[^/\s]*/i);
    }
  });
});
