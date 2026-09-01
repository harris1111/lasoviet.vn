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
});
