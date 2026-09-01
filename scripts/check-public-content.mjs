import { routeRegistry, validateRouteRegistry } from "../packages/config/dist/index.js";

const routes = validateRouteRegistry(routeRegistry);
const publicRoutes = routes.filter((route) => route.status === "live_indexable");

for (const route of publicRoutes) {
  if (
    route.content === undefined ||
    route.reviewer === undefined ||
    !route.localeOwners.includes("vi") ||
    !route.localeOwners.includes("en")
  ) {
    throw new Error(`CONTENT_METADATA_INVALID: ${route.path}`);
  }
}

console.log(`Validated ${publicRoutes.length} public routes with VI/EN ownership.`);
