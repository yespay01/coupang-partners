import { fetchApiData, SITE_URL, urlset, xmlResponse } from "@/lib/sitemapXml";

export const dynamic = "force-dynamic";
export const revalidate = 3600;

type News = { id: string; slug?: string; updatedAt?: string };

export async function GET() {
  const data = await fetchApiData<{ news: News[] }>(
    "/api/news/sitemap?limit=1000",
    { news: [] },
  );
  return xmlResponse(urlset(data.news.filter((item) => item.slug || item.id).map((item) => ({
    loc: `${SITE_URL}/news/${encodeURIComponent(item.slug || item.id)}`,
    lastmod: item.updatedAt,
    changefreq: "weekly",
    priority: 0.6,
  }))));
}
