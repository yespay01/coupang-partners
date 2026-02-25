import { MetadataRoute } from "next";

const SITE_URL = "https://semolink.store";
const AUTOMATION_SERVER_URL =
  process.env.AUTOMATION_SERVER_URL || "http://automation-server:4000";

export const revalidate = 3600; // 1시간마다 재생성

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // 정적 페이지
  const staticPages: MetadataRoute.Sitemap = [
    { url: SITE_URL, lastModified: new Date(), changeFrequency: "daily", priority: 1.0 },
    { url: `${SITE_URL}/reviews`, lastModified: new Date(), changeFrequency: "daily", priority: 0.9 },
    { url: `${SITE_URL}/recipes`, lastModified: new Date(), changeFrequency: "daily", priority: 0.9 },
    { url: `${SITE_URL}/news`, lastModified: new Date(), changeFrequency: "daily", priority: 0.8 },
    { url: `${SITE_URL}/search`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.5 },
  ];

  // 리뷰 목록 (published)
  let reviewPages: MetadataRoute.Sitemap = [];
  try {
    const res = await fetch(`${AUTOMATION_SERVER_URL}/api/reviews?limit=1000`, {
      next: { revalidate: 3600 },
    });
    if (res.ok) {
      const data = await res.json();
      const reviews: { slug: string; updatedAt?: string }[] = data.data?.reviews || [];
      reviewPages = reviews
        .filter((r) => r.slug)
        .map((r) => ({
          url: `${SITE_URL}/reviews/${r.slug}`,
          lastModified: r.updatedAt ? new Date(r.updatedAt) : new Date(),
          changeFrequency: "weekly" as const,
          priority: 0.8,
        }));
    }
  } catch {
    // automation-server 미응답 시 빈 배열
  }

  // 레시피 목록 (published)
  let recipePages: MetadataRoute.Sitemap = [];
  try {
    const res = await fetch(`${AUTOMATION_SERVER_URL}/api/recipes?limit=1000`, {
      next: { revalidate: 3600 },
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
    const res = await fetch(`${AUTOMATION_SERVER_URL}/api/news?limit=1000`, {
      next: { revalidate: 3600 },
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

  return [...staticPages, ...reviewPages, ...recipePages, ...newsPages];
}
