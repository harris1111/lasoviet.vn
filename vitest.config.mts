import { resolve } from "node:path";

import { defineConfig } from "vitest/config";

const root = process.cwd();

export default defineConfig({
  resolve: {
    alias: {
      "@lasoviet/contracts": resolve(root, "packages/contracts/src/index.ts"),
      "@lasoviet/config/load-environment": resolve(
        root,
        "packages/config/src/load-environment.ts",
      ),
      "@lasoviet/config": resolve(root, "packages/config/src/index.ts"),
    },
  },
  test: {
    include: [
      "apps/**/*.test.ts",
      "packages/**/*.test.ts",
      "tests/**/*.test.ts",
    ],
    exclude: ["**/node_modules/**", "**/.next/**", "**/dist/**"],
  },
});
