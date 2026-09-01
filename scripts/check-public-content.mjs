import { readFileSync } from "node:fs";

import {
  routeRegistry,
  validatePublicContent,
  validateRouteRegistry,
} from "../packages/config/dist/index.js";

const routes = validateRouteRegistry(routeRegistry);
const publicRoutes = routes.filter((route) => route.status === "live_indexable");
const source = JSON.parse(
  readFileSync(new URL("../config/public-content.json", import.meta.url), "utf8"),
);
const records = validatePublicContent(source, routes);
const recordKeys = new Set();

for (const record of records) {
  const key = `${record.routeId}:${record.locale}`;
  if (recordKeys.has(key)) {
    throw new Error(`CONTENT_METADATA_INVALID: duplicate ${key}`);
  }
  recordKeys.add(key);
}

for (const route of publicRoutes) {
  for (const locale of ["vi", "en"]) {
    if (!recordKeys.has(`${route.id}:${locale}`)) {
      throw new Error(`CONTENT_METADATA_INVALID: missing ${route.id}:${locale}`);
    }
  }
}

console.log(
  `Validated ${records.length} public content records for ${publicRoutes.length} public routes.`,
);
