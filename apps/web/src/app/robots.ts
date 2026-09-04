import type { MetadataRoute } from "next";

import {
  getRobotsSitemapUrl,
  PRODUCTION_ORIGIN,
} from "../seo/sitemap-registry";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
    },
    host: PRODUCTION_ORIGIN,
    sitemap: getRobotsSitemapUrl(),
  };
}
