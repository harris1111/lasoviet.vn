import { NextResponse } from "next/server";

import {
  getSitemapSectionUrls,
  isSitemapSection,
} from "../../../seo/sitemap-registry";

type SitemapRouteContext = {
  params: Promise<{ section: string }>;
};

function escapeXml(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

export async function GET(
  _request: Request,
  { params }: SitemapRouteContext,
): Promise<NextResponse> {
  const { section } = await params;
  if (!isSitemapSection(section)) {
    return NextResponse.json({ code: "SITEMAP_SECTION_INVALID" }, { status: 404 });
  }

  const urls = getSitemapSectionUrls(section)
    .map((entry) => `<url><loc>${escapeXml(entry.url)}</loc></url>`)
    .join("");
  const body = `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`;

  return new NextResponse(body, {
    headers: { "content-type": "application/xml; charset=utf-8" },
  });
}
