import { SITE_URL, urlset, xmlResponse } from "@/lib/sitemapXml";

export const dynamic = "force-dynamic";
export const revalidate = 3600;

export async function GET() {
  return xmlResponse(urlset([
    { loc: SITE_URL, changefreq: "daily", priority: 1 },
    { loc: `${SITE_URL}/collections`, changefreq: "daily", priority: 0.9 },
    { loc: `${SITE_URL}/recipes`, changefreq: "weekly", priority: 0.7 },
    { loc: `${SITE_URL}/news`, changefreq: "weekly", priority: 0.6 },
    { loc: `${SITE_URL}/search`, changefreq: "weekly", priority: 0.5 },
  ]));
}
