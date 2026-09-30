import { readdir, readFile } from "node:fs/promises";
import { join, relative } from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";

const ALLOWED_BACKEND_FILE = "apps/web/src/app/api/notifications/unsubscribe/route.ts";
const ALLOWED_BACKEND_SPECIFIER = "@lasoviet/backend/notifications/notification-preference";

const PRODUCTION_SOURCE_EXTENSIONS = new Set([
  ".ts",
  ".tsx",
  ".cts",
  ".mts",
  ".js",
  ".jsx",
  ".cjs",
  ".mjs",
]);

export function isProductionWebSourceFile(fileName: string): boolean {
  const dotIndex = fileName.lastIndexOf(".");
  if (dotIndex === -1) {
    return false;
  }

  const ext = fileName.slice(dotIndex);
  if (!PRODUCTION_SOURCE_EXTENSIONS.has(ext)) {
    return false;
  }

  const baseName = fileName.slice(0, dotIndex);
  return !baseName.endsWith(".test") && !baseName.endsWith(".spec");
}

function isBackendSpecifier(specifier: string): boolean {
  return specifier === "@lasoviet/backend" || specifier.startsWith("@lasoviet/backend/");
}

export function extractBackendModuleSpecifiers(
  sourceText: string,
  fileName = "source.ts",
): string[] {
  const sourceFile = ts.createSourceFile(
    fileName,
    sourceText,
    ts.ScriptTarget.Latest,
    true,
  );
  const specifiers: string[] = [];

  function visit(node: ts.Node) {
    if (ts.isImportDeclaration(node)) {
      if (
        ts.isStringLiteral(node.moduleSpecifier) ||
        ts.isNoSubstitutionTemplateLiteral(node.moduleSpecifier)
      ) {
        if (isBackendSpecifier(node.moduleSpecifier.text)) {
          specifiers.push(node.moduleSpecifier.text);
        }
      }
    } else if (ts.isExportDeclaration(node)) {
      if (
        node.moduleSpecifier &&
        (ts.isStringLiteral(node.moduleSpecifier) ||
          ts.isNoSubstitutionTemplateLiteral(node.moduleSpecifier))
      ) {
        if (isBackendSpecifier(node.moduleSpecifier.text)) {
          specifiers.push(node.moduleSpecifier.text);
        }
      }
    } else if (ts.isCallExpression(node)) {
      const isDynamicImport = node.expression.kind === ts.SyntaxKind.ImportKeyword;
      const isRequire = ts.isIdentifier(node.expression) && node.expression.text === "require";
      if ((isDynamicImport || isRequire) && node.arguments.length > 0) {
        const firstArg = node.arguments[0];
        if (
          firstArg &&
          (ts.isStringLiteral(firstArg) || ts.isNoSubstitutionTemplateLiteral(firstArg))
        ) {
          if (isBackendSpecifier(firstArg.text)) {
            specifiers.push(firstArg.text);
          }
        }
      }
    } else if (ts.isImportEqualsDeclaration(node)) {
      if (ts.isExternalModuleReference(node.moduleReference)) {
        const expr = node.moduleReference.expression;
        if (
          expr &&
          (ts.isStringLiteral(expr) || ts.isNoSubstitutionTemplateLiteral(expr))
        ) {
          if (isBackendSpecifier(expr.text)) {
            specifiers.push(expr.text);
          }
        }
      }
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return specifiers;
}

export function validateBackendImportAllowlist(
  imports: Array<{ file: string; specifier: string }>,
): {
  valid: boolean;
  violations: Array<{ file: string; specifier: string; reason: string }>;
} {
  const violations: Array<{ file: string; specifier: string; reason: string }> = [];

  for (const entry of imports) {
    if (entry.file !== ALLOWED_BACKEND_FILE) {
      violations.push({
        ...entry,
        reason: `Backend import forbidden in file: ${entry.file}`,
      });
    } else if (entry.specifier !== ALLOWED_BACKEND_SPECIFIER) {
      violations.push({
        ...entry,
        reason: `Unauthorized backend specifier: ${entry.specifier}`,
      });
    }
  }

  return {
    valid: violations.length === 0,
    violations,
  };
}

async function scanWebSourceFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true, recursive: true });
  return entries
    .filter((entry) => entry.isFile() && isProductionWebSourceFile(entry.name))
    .map((entry) => join(entry.parentPath ?? (entry as { path?: string }).path ?? dir, entry.name));
}

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
    const sourceFiles = await scanWebSourceFiles("apps/web/src");
    const detectedBackendImports: Array<{ file: string; specifier: string }> = [];

    for (const filePath of sourceFiles) {
      const normalizedPath = relative(process.cwd(), filePath).split("\\").join("/");
      const content = await readFile(filePath, "utf8");
      const specifiers = extractBackendModuleSpecifiers(content, filePath);
      for (const specifier of specifiers) {
        detectedBackendImports.push({ file: normalizedPath, specifier });
      }
    }

    expect(detectedBackendImports).toEqual([
      {
        file: ALLOWED_BACKEND_FILE,
        specifier: ALLOWED_BACKEND_SPECIFIER,
      },
    ]);

    const audit = validateBackendImportAllowlist(detectedBackendImports);
    expect(audit.valid).toBe(true);
    expect(audit.violations).toEqual([]);
  });

  describe("backend import scanner regression fixtures", () => {
    it.each([
      {
        name: "detects bare static import in production file",
        code: `import { service } from "@lasoviet/backend";`,
        expectedSpecifiers: ["@lasoviet/backend"],
      },
      {
        name: "detects side-effect bare import",
        code: `import "@lasoviet/backend";`,
        expectedSpecifiers: ["@lasoviet/backend"],
      },
      {
        name: "detects side-effect subpath import",
        code: `import "@lasoviet/backend/unauthorized-subpath";`,
        expectedSpecifiers: ["@lasoviet/backend/unauthorized-subpath"],
      },
      {
        name: "detects static export from bare backend",
        code: `export { something } from "@lasoviet/backend";`,
        expectedSpecifiers: ["@lasoviet/backend"],
      },
      {
        name: "detects static export star from subpath",
        code: `export * from "@lasoviet/backend/other";`,
        expectedSpecifiers: ["@lasoviet/backend/other"],
      },
      {
        name: "detects dynamic import call with bare backend",
        code: `const b = import("@lasoviet/backend");`,
        expectedSpecifiers: ["@lasoviet/backend"],
      },
      {
        name: "detects dynamic import call with subpath backend",
        code: `const b = import("@lasoviet/backend/subpath");`,
        expectedSpecifiers: ["@lasoviet/backend/subpath"],
      },
      {
        name: "detects require call with bare backend",
        code: `const b = require("@lasoviet/backend");`,
        expectedSpecifiers: ["@lasoviet/backend"],
      },
      {
        name: "detects require call with subpath backend",
        code: `const b = require("@lasoviet/backend/subpath");`,
        expectedSpecifiers: ["@lasoviet/backend/subpath"],
      },
      {
        name: "detects import equals require declaration",
        code: `import b = require("@lasoviet/backend/subpath");`,
        expectedSpecifiers: ["@lasoviet/backend/subpath"],
      },
    ])("$name", ({ code, expectedSpecifiers }) => {
      const extracted = extractBackendModuleSpecifiers(code);
      expect(extracted).toEqual(expectedSpecifiers);
    });

    it("rejects forbidden bare and subpath imports via allowlist validator", () => {
      const forbiddenInputs: Array<{ file: string; specifier: string }> = [
        { file: "apps/web/src/features/unauthorized.ts", specifier: "@lasoviet/backend" },
        { file: "apps/web/src/features/unauthorized.ts", specifier: "@lasoviet/backend/notifications/notification-preference" },
        { file: ALLOWED_BACKEND_FILE, specifier: "@lasoviet/backend" },
        { file: ALLOWED_BACKEND_FILE, specifier: "@lasoviet/backend/auth" },
      ];

      const audit = validateBackendImportAllowlist(forbiddenInputs);
      expect(audit.valid).toBe(false);
      expect(audit.violations).toHaveLength(4);
    });

    it.each([
      { fileName: "service.cts", expected: true },
      { fileName: "helper.cjs", expected: true },
      { fileName: "loader.mts", expected: true },
      { fileName: "bundle.mjs", expected: true },
      { fileName: "view.jsx", expected: true },
      { fileName: "legacy.js", expected: true },
      { fileName: "types.ts", expected: true },
      { fileName: "component.tsx", expected: true },
      { fileName: "service.test.cts", expected: false },
      { fileName: "helper.spec.cjs", expected: false },
      { fileName: "loader.test.mts", expected: false },
      { fileName: "bundle.spec.mjs", expected: false },
      { fileName: "view.test.jsx", expected: false },
      { fileName: "legacy.spec.js", expected: false },
      { fileName: "types.test.ts", expected: false },
      { fileName: "component.spec.tsx", expected: false },
      { fileName: "style.css", expected: false },
      { fileName: "config.json", expected: false },
    ])("classifies production source file $fileName as $expected", ({ fileName, expected }) => {
      expect(isProductionWebSourceFile(fileName)).toBe(expected);
    });
  });

  it("builds workspace library producers before recursive typechecks", async () => {
    const root = JSON.parse(await readFile("package.json", "utf8"));

    expect(root.scripts.typecheck).toBe(
      `corepack pnpm@11.25.0 run config:contact:check && corepack pnpm@11.25.0 --filter "{packages/**}" -r --if-present run build && corepack pnpm@11.25.0 -r --if-present run typecheck`,
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
