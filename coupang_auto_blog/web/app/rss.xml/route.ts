import { escapeXml, fetchApiData, SITE_URL } from "@/lib/sitemapXml";

export const dynamic = "force-dynamic";
export const revalidate = 3600;

type News = {
  id: string;
  slug?: string;
  title?: string;
  summary?: string;
  category?: string;
  imageUrl?: string;
  publishedAt?: string;
  createdAt?: string;
};

type Recipe = {
  id: string;
  slug?: string;
  title?: string;
  description?: string;
  imageUrl?: string;
  createdAt?: string;
};

type FeedItem = {
  title: string;
  link: string;
  description: string;
  category: string;
  pubDate: Date;
  image?: string;
};

const FEED_LIMIT = 50;

function plainText(value?: string): string {
  return (value || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().slice(0, 300);
}

function toDate(...values: (string | undefined)[]): Date | null {
  for (const value of values) {
    if (!value) continue;
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) return date;
  }
  return null;
}

function renderItem(item: FeedItem): string {
  return [
    "<item>",
    `<title>${escapeXml(item.title)}</title>`,
    `<link>${escapeXml(item.link)}</link>`,
    `<guid isPermaLink="true">${escapeXml(item.link)}</guid>`,
    `<description>${escapeXml(item.description)}</description>`,
    `<category>${escapeXml(item.category)}</category>`,
    `<pubDate>${item.pubDate.toUTCString()}</pubDate>`,
    item.image ? `<enclosure url="${escapeXml(item.image)}" type="image/jpeg" length="0"/>` : "",
    "</item>",
  ].join("");
}

export async function GET() {
  const [newsData, recipeData] = await Promise.all([
    fetchApiData<{ news: News[] }>(`/api/news?limit=${FEED_LIMIT}`, { news: [] }),
    fetchApiData<{ recipes: Recipe[] }>(`/api/recipes?limit=${FEED_LIMIT}`, { recipes: [] }),
  ]);

  const items: FeedItem[] = [];
  for (const news of newsData.news) {
    const pubDate = toDate(news.publishedAt, news.createdAt);
    if (!news.title || !pubDate) continue;
    items.push({
      title: news.title,
      link: `${SITE_URL}/news/${encodeURIComponent(news.slug || news.id)}`,
      description: plainText(news.summary),
      category: news.category || "뉴스",
      pubDate,
      image: news.imageUrl,
    });
  }
  for (const recipe of recipeData.recipes) {
    const pubDate = toDate(recipe.createdAt);
    if (!recipe.title || !pubDate) continue;
    items.push({
      title: recipe.title,
      link: `${SITE_URL}/recipes/${encodeURIComponent(recipe.slug || recipe.id)}`,
      description: plainText(recipe.description),
      category: "레시피",
      pubDate,
      image: recipe.imageUrl,
    });
  }

  const latest = items
    .sort((a, b) => b.pubDate.getTime() - a.pubDate.getTime())
    .slice(0, FEED_LIMIT);
  const lastBuildDate = (latest[0]?.pubDate || new Date()).toUTCString();

  const xml = `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom"><channel>`
    + `<title>세모링크</title>`
    + `<link>${SITE_URL}</link>`
    + `<description>세모링크의 최신 쇼핑 뉴스와 레시피</description>`
    + `<language>ko</language>`
    + `<lastBuildDate>${lastBuildDate}</lastBuildDate>`
    + `<atom:link href="${SITE_URL}/rss.xml" rel="self" type="application/rss+xml"/>`
    + latest.map(renderItem).join("")
    + `</channel></rss>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=0, s-maxage=3600, stale-while-revalidate=300",
    },
  });
}
