import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  loadGateOnePublicContent,
  routeRegistry,
  validatePublicContent,
  validateRouteRegistry,
} from "../packages/config/dist/index.js";
import {
  scanCustomerFacingFiles,
  validateClaimRegistry,
} from "./public-claim-check.mjs";

const routes = validateRouteRegistry(routeRegistry);
const publicRoutes = routes.filter((route) => route.status === "live_indexable");
const metadata = JSON.parse(
  readFileSync(new URL("../config/public-content.json", import.meta.url), "utf8"),
);
validatePublicContent(metadata, routes);
const content = loadGateOnePublicContent();

console.log(
  `Validated ${content.documents.length} content documents for ${publicRoutes.length} public routes.`,
);

const rootDir = resolve(fileURLToPath(new URL("..", import.meta.url)));
const claimsRegistry = JSON.parse(
  readFileSync(new URL("../config/claims.json", import.meta.url), "utf8"),
);
const validRouteIds = new Set(routes.map((route) => route.id));

const registryResult = validateClaimRegistry(claimsRegistry, validRouteIds, rootDir);
if (!registryResult.valid) {
  console.error("Public claims registry validation failed with errors:");
  for (const error of registryResult.errors) {
    console.error(`  - ${error}`);
  }
  process.exit(1);
}

console.log(
  `Validated public claims registry with ${claimsRegistry.claims.length} claims.`,
);

const violations = scanCustomerFacingFiles(rootDir);
if (violations.length > 0) {
  console.error(
    `Found ${violations.length} prohibited pattern violations in public content:`,
  );
  for (const violation of violations) {
    console.error(
      `  - [${violation.category}] ${violation.file}:${violation.line}: "${violation.match}" (${violation.description})`,
    );
  }
  process.exit(1);
}

console.log("Public claim checks passed cleanly with 0 violations.");
