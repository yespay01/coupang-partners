export const SITE_URL = "https://semolink.store";
export const AUTOMATION_SERVER_URL =
  process.env.AUTOMATION_SERVER_URL || "http://automation-server:4000";

export type SitemapUrl = {
  loc: string;
  lastmod?: string | null;
  changefreq?: string;
  priority?: number;
  image?: string | null;
};

export function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function validIsoDate(value?: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export async function fetchApiData<T>(path: string, fallback: T): Promise<T> {
  if (process.env.NEXT_PHASE === "phase-production-build") return fallback;
  try {
    const response = await fetch(`${AUTOMATION_SERVER_URL}${path}`, { cache: "no-store" });
    if (!response.ok) return fallback;
    const payload = await response.json();
    return payload.data || fallback;
  } catch {
    return fallback;
  }
}

export function sitemapIndex(paths: string[]): string {
  const entries = paths
    .map((path) => `<sitemap><loc>${escapeXml(`${SITE_URL}${path}`)}</loc></sitemap>`)
    .join("");
  return `<?xml version="1.0" encoding="UTF-8"?><sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${entries}</sitemapindex>`;
}

export function urlset(urls: SitemapUrl[]): string {
  const usesImages = urls.some((url) => url.image);
  const entries = urls.map((url) => {
    const lastmod = validIsoDate(url.lastmod);
    return [
      "<url>",
      `<loc>${escapeXml(url.loc)}</loc>`,
      lastmod ? `<lastmod>${lastmod}</lastmod>` : "",
      url.changefreq ? `<changefreq>${escapeXml(url.changefreq)}</changefreq>` : "",
      url.priority != null ? `<priority>${url.priority.toFixed(1)}</priority>` : "",
      url.image ? `<image:image><image:loc>${escapeXml(url.image)}</image:loc></image:image>` : "",
      "</url>",
    ].join("");
  }).join("");
  const imageNamespace = usesImages ? ' xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"' : "";
  return `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"${imageNamespace}>${entries}</urlset>`;
}

export function xmlResponse(xml: string): Response {
  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=0, s-maxage=3600, stale-while-revalidate=300",
    },
  });
}
