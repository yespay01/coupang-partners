import { fetchApiData, SITE_URL, urlset, xmlResponse } from "@/lib/sitemapXml";

export const dynamic = "force-dynamic";
export const revalidate = 3600;

type Category = { categoryId: string; updatedAt?: string };

export async function GET() {
  const data = await fetchApiData<{ categories: Category[] }>(
    "/api/products/categories",
    { categories: [] },
  );
  return xmlResponse(urlset(data.categories.filter((category) => category.categoryId).map((category) => ({
    loc: `${SITE_URL}/collections/${encodeURIComponent(category.categoryId)}`,
    lastmod: category.updatedAt,
    changefreq: "daily",
    priority: 0.9,
  }))));
}
