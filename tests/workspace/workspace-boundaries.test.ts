import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("workspace boundaries", () => {
  it("does not expose backend implementation to the web package", async () => {
    const web = JSON.parse(await readFile("apps/web/package.json", "utf8"));
    expect(web.dependencies?.["@lasoviet/backend"]).toBeUndefined();
  });

  it.each(["devDependencies", "peerDependencies", "optionalDependencies"])(
    "does not expose backend implementation through %s",
    async (section) => {
      const web = JSON.parse(await readFile("apps/web/package.json", "utf8"));
      expect(web[section]?.["@lasoviet/backend"]).toBeUndefined();
    },
  );

  it("builds workspace library producers before recursive typechecks", async () => {
    const root = JSON.parse(await readFile("package.json", "utf8"));

    expect(root.scripts.typecheck).toBe(
      'corepack pnpm@11.25.0 --filter "{packages/**}" -r --if-present run build && corepack pnpm@11.25.0 -r --if-present run typecheck',
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
