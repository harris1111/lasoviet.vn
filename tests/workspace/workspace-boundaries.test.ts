import { readdir, readFile } from "node:fs/promises";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

describe("workspace boundaries", () => {
  it("allows @lasoviet/backend production dependency only with exact workspace:0.0.0", async () => {
    const web = JSON.parse(await readFile("apps/web/package.json", "utf8"));
    expect(web.dependencies?.["@lasoviet/backend"]).toBe("workspace:0.0.0");
  });

  it.each(["devDependencies", "peerDependencies", "optionalDependencies"])(
    "does not expose backend implementation through %s",
    async (section) => {
      const web = JSON.parse(await readFile("apps/web/package.json", "utf8"));
      expect(web[section]?.["@lasoviet/backend"]).toBeUndefined();
    },
  );

  it("restricts backend imports in apps/web/src strictly to the unsubscribe route and preference subpath", async () => {
    const allowedFile = "apps/web/src/app/api/notifications/unsubscribe/route.ts";
    const allowedSpecifier = "@lasoviet/backend/notifications/notification-preference";
    const importRegex = /(?:from\s+["'](@lasoviet\/backend[^"']*)["']|import\s*\(\s*["'](@lasoviet\/backend[^"']*)["']\))/g;

    async function scanWebSourceFiles(dir: string): Promise<string[]> {
      const entries = await readdir(dir, { withFileTypes: true, recursive: true });
      return entries
        .filter(
          (entry) =>
            entry.isFile() &&
            /\.(ts|tsx)$/.test(entry.name) &&
            !entry.name.endsWith(".test.ts") &&
            !entry.name.endsWith(".test.tsx") &&
            !entry.name.endsWith(".spec.ts") &&
            !entry.name.endsWith(".spec.tsx"),
        )
        .map((entry) => join(entry.parentPath ?? (entry as { path?: string }).path ?? dir, entry.name));
    }

    const sourceFiles = await scanWebSourceFiles("apps/web/src");
    const detectedBackendImports: Array<{ file: string; specifier: string }> = [];

    for (const filePath of sourceFiles) {
      const normalizedPath = relative(process.cwd(), filePath).split("\\").join("/");
      const fileContent = await readFile(filePath, "utf8");
      let match: RegExpExecArray | null;
      while ((match = importRegex.exec(fileContent)) !== null) {
        const specifier = match[1] ?? match[2];
        detectedBackendImports.push({ file: normalizedPath, specifier });
      }
    }

    expect(detectedBackendImports).toEqual([
      {
        file: allowedFile,
        specifier: allowedSpecifier,
      },
    ]);
  });

  it("builds workspace library producers before recursive typechecks", async () => {
    const root = JSON.parse(await readFile("package.json", "utf8"));

    expect(root.scripts.typecheck).toBe(
      'corepack pnpm@11.25.0 run config:contact:check && corepack pnpm@11.25.0 --filter "{packages/**}" -r --if-present run build && corepack pnpm@11.25.0 -r --if-present run typecheck',
    );
  });

  it("builds web artifacts before running tests in root checks and CI", async () => {
    const root = JSON.parse(await readFile("package.json", "utf8"));
    const workflow = (await readFile(".github/workflows/ci.yml", "utf8"))
      .replace(/\r\n/g, "\n");

    expect(root.scripts.check).toBe(
      "corepack pnpm@11.25.0 run lint && corepack pnpm@11.25.0 run typecheck && corepack pnpm@11.25.0 run build && corepack pnpm@11.25.0 run test",
    );
    expect(workflow).toContain("      - run: pnpm build\n      - run: pnpm test");
  });
});
