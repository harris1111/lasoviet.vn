import { readFileSync } from "node:fs";

import {
  loadGateOnePublicContent,
  routeRegistry,
  validatePublicContent,
  validateRouteRegistry,
} from "../packages/config/dist/index.js";

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
