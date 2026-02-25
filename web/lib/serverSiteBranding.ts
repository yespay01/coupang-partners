import { cache } from "react";
import { DEFAULT_SETTINGS, type SiteSettings } from "@/types/settings";
import { withSiteUrl } from "@/lib/siteUrl";

const AUTOMATION_SERVER_URL =
  process.env.AUTOMATION_SERVER_URL || "http://automation-server:4000";
const SITE_BRANDING_REVALIDATE_SECONDS = 60;

function toAbsoluteUrl(value?: string): string {
  if (!value) return "";
  if (/^https?:\/\//i.test(value)) return value;
  return withSiteUrl(value);
}

function normalizeSiteSettings(input?: Partial<SiteSettings>): SiteSettings {
  const merged = {
    ...DEFAULT_SETTINGS.site,
    ...(input || {}),
  };

  return {
    ...merged,
    domain: merged.domain || process.env.NEXT_PUBLIC_SITE_URL || DEFAULT_SETTINGS.site.domain,
    logoUrl: merged.logoUrl || DEFAULT_SETTINGS.site.logoUrl,
    faviconUrl: merged.faviconUrl || DEFAULT_SETTINGS.site.faviconUrl,
    appleTouchIconUrl: merged.appleTouchIconUrl || merged.logoUrl || DEFAULT_SETTINGS.site.appleTouchIconUrl,
    ogDefaultImageUrl: merged.ogDefaultImageUrl || "",
    defaultMetaTitle: merged.defaultMetaTitle || merged.name || DEFAULT_SETTINGS.site.defaultMetaTitle,
    defaultMetaDescription:
      merged.defaultMetaDescription || DEFAULT_SETTINGS.site.defaultMetaDescription,
  };
}

export const getServerSiteBranding = cache(async (): Promise<SiteSettings> => {
  try {
    const response = await fetch(`${AUTOMATION_SERVER_URL}/api/public/site-settings`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      next: { revalidate: SITE_BRANDING_REVALIDATE_SECONDS },
    });

    if (!response.ok) {
      return normalizeSiteSettings();
    }

    const payload = (await response.json().catch(() => ({}))) as {
      data?: Partial<SiteSettings>;
    };

    return normalizeSiteSettings(payload?.data);
  } catch {
    return normalizeSiteSettings();
  }
});

export function getBrandingMetaAssets(site: SiteSettings) {
  return {
    faviconUrl: site.faviconUrl || DEFAULT_SETTINGS.site.faviconUrl,
    appleTouchIconUrl:
      site.appleTouchIconUrl || site.logoUrl || DEFAULT_SETTINGS.site.appleTouchIconUrl,
    ogDefaultImageUrl: toAbsoluteUrl(site.ogDefaultImageUrl),
    logoUrl: toAbsoluteUrl(site.logoUrl),
  };
}
