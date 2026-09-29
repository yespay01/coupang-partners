import { fetchApiData, SITE_URL, urlset, xmlResponse } from "@/lib/sitemapXml";

export const dynamic = "force-dynamic";
export const revalidate = 3600;

type Recipe = { id: string; slug?: string; updatedAt?: string };

export async function GET() {
  const data = await fetchApiData<{ recipes: Recipe[] }>(
    "/api/recipes/sitemap?limit=1000",
    { recipes: [] },
  );
  return xmlResponse(urlset(data.recipes.filter((item) => item.slug || item.id).map((item) => ({
    loc: `${SITE_URL}/recipes/${encodeURIComponent(item.slug || item.id)}`,
    lastmod: item.updatedAt,
    changefreq: "weekly",
    priority: 0.7,
  }))));
}
