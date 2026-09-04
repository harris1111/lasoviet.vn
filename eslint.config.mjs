import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";

export default defineConfig([
  ...nextVitals,
  {
    settings: {
      react: {
        version: "19.2.8",
      },
    },
    rules: {
      "@next/next/no-html-link-for-pages": "off",
    },
  },
  globalIgnores([
    "node_modules",
    "**/.next/**",
    "dist",
    "coverage",
    "playwright-report",
    "test-results",
    "prototype/**",
  ]),
]);
