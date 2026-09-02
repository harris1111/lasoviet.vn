import {
  loadGateOnePublicContent,
  routeRegistry,
  validateRouteRegistry,
} from "../packages/config/dist/index.js";

const routes = validateRouteRegistry(routeRegistry);
const publicRoutes = routes.filter((route) => route.status === "live_indexable");
const content = loadGateOnePublicContent();

console.log(
  `Validated ${content.documents.length} content documents for ${publicRoutes.length} public routes.`,
);
