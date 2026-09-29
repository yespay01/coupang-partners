import { fetchApiData, SITE_URL, urlset, xmlResponse } from "@/lib/sitemapXml";

export const dynamic = "force-dynamic";
export const revalidate = 3600;

type Product = { productId: string; updatedAt?: string; productImage?: string };

export async function GET() {
  const data = await fetchApiData<{ products: Product[] }>(
    "/api/products/sitemap?limit=45000&priority=true",
    { products: [] },
  );
  return xmlResponse(urlset(data.products.filter((product) => product.productId).map((product) => ({
    loc: `${SITE_URL}/products/${encodeURIComponent(product.productId)}`,
    lastmod: product.updatedAt,
    changefreq: "weekly",
    priority: 0.8,
    image: product.productImage,
  }))));
}
