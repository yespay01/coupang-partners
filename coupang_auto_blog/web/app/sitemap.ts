import { MetadataRoute } from "next";

const SITE_URL = "https://semolink.store";
const AUTOMATION_SERVER_URL =
  process.env.AUTOMATION_SERVER_URL || "http://automation-server:4000";

export const revalidate = 3600; // 1시간마다 재생성
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // 정적 페이지
  const staticPages: MetadataRoute.Sitemap = [
    { url: SITE_URL, changeFrequency: "daily", priority: 1.0 },
    { url: `${SITE_URL}/collections`, changeFrequency: "daily", priority: 0.9 },
    { url: `${SITE_URL}/recipes`, changeFrequency: "weekly", priority: 0.7 },
    { url: `${SITE_URL}/news`, changeFrequency: "weekly", priority: 0.6 },
    { url: `${SITE_URL}/search`, changeFrequency: "weekly", priority: 0.5 },
  ];

  const shouldSkipDynamicFetch = process.env.NEXT_PHASE === "phase-production-build";
  if (shouldSkipDynamicFetch) return staticPages;

  // 리뷰 본문은 색인에서 제거하고, 공식 상품 정보 면만 노출한다.
  let productPages: MetadataRoute.Sitemap = [];
  try {
    const res = await fetch(`${AUTOMATION_SERVER_URL}/api/products/sitemap?limit=45000`, {
      cache: "no-store",
    });
    if (res.ok) {
      const data = await res.json();
      const products: { productId: string; updatedAt?: string; productImage?: string }[] = data.data?.products || [];
      productPages = products
        .filter((product) => product.productId)
        .map((product) => ({
          url: `${SITE_URL}/products/${encodeURIComponent(product.productId)}`,
          lastModified: product.updatedAt ? new Date(product.updatedAt) : new Date(),
          changeFrequency: "weekly" as const,
          priority: 0.8,
          ...(product.productImage ? { images: [product.productImage] } : {}),
        }));
    }
  } catch {
    // automation-server 미응답 시 빈 배열
  }

  let collectionPages: MetadataRoute.Sitemap = [];
  try {
    const res = await fetch(`${AUTOMATION_SERVER_URL}/api/products/categories`, { cache: "no-store" });
    if (res.ok) {
      const data = await res.json();
      const categories: { categoryId: string; updatedAt?: string }[] = data.data?.categories || [];
      collectionPages = categories.map((category) => ({
        url: `${SITE_URL}/collections/${encodeURIComponent(category.categoryId)}`,
        lastModified: category.updatedAt ? new Date(category.updatedAt) : undefined,
        changeFrequency: "daily" as const,
        priority: 0.85,
      }));
    }
  } catch {
    // automation-server 미응답 시 빈 배열
  }

  // 레시피 목록 (published)
  let recipePages: MetadataRoute.Sitemap = [];
  try {
    const res = await fetch(`${AUTOMATION_SERVER_URL}/api/recipes/sitemap?limit=1000`, {
      cache: "no-store",
    });
    if (res.ok) {
      const data = await res.json();
      const recipes: { id: string; slug?: string; updatedAt?: string }[] = data.data?.recipes || [];
      recipePages = recipes.map((r) => ({
        url: `${SITE_URL}/recipes/${r.slug || r.id}`,
        lastModified: r.updatedAt ? new Date(r.updatedAt) : new Date(),
        changeFrequency: "weekly" as const,
        priority: 0.7,
      }));
    }
  } catch {
    // automation-server 미응답 시 빈 배열
  }

  // 뉴스 목록 (published)
  let newsPages: MetadataRoute.Sitemap = [];
  try {
    const res = await fetch(`${AUTOMATION_SERVER_URL}/api/news/sitemap?limit=1000`, {
      cache: "no-store",
    });
    if (res.ok) {
      const data = await res.json();
      const newsList: { id: string; slug?: string; updatedAt?: string }[] = data.data?.news || [];
      newsPages = newsList.map((n) => ({
        url: `${SITE_URL}/news/${n.slug || n.id}`,
        lastModified: n.updatedAt ? new Date(n.updatedAt) : new Date(),
        changeFrequency: "weekly" as const,
        priority: 0.6,
      }));
    }
  } catch {
    // automation-server 미응답 시 빈 배열
  }

  return [...staticPages, ...collectionPages, ...productPages, ...recipePages, ...newsPages];
}
