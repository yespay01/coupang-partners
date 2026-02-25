import { MetadataRoute } from "next";
import { withSiteUrl } from "@/lib/siteUrl";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/admin/"],
    },
    sitemap: withSiteUrl("/sitemap.xml"),
  };
}
