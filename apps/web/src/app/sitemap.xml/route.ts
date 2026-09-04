import { NextResponse } from "next/server";

import { getSitemapSectionEntries } from "../../seo/sitemap-registry";

function escapeXml(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

export function GET(): NextResponse {
  const urls = getSitemapSectionEntries()
    .map((entry) => `<sitemap><loc>${escapeXml(entry.url)}</loc></sitemap>`)
    .join("");
  const body = `<?xml version="1.0" encoding="UTF-8"?><sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</sitemapindex>`;

  return new NextResponse(body, {
    headers: { "content-type": "application/xml; charset=utf-8" },
  });
}
