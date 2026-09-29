import { sitemapIndex, xmlResponse } from "@/lib/sitemapXml";

export const dynamic = "force-dynamic";
export const revalidate = 3600;

export async function GET() {
  return xmlResponse(sitemapIndex([
    "/sitemaps/static.xml",
    "/sitemaps/collections.xml",
    "/sitemaps/products.xml",
    "/sitemaps/news.xml",
    "/sitemaps/recipes.xml",
  ]));
}
