const RAW_SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://semolink.store";

export const SITE_URL = RAW_SITE_URL.replace(/\/+$/, "");

export function withSiteUrl(path: string = ""): string {
  if (!path) return SITE_URL;
  return `${SITE_URL}${path.startsWith("/") ? "" : "/"}${path}`;
}
