import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/admin/", "/go/"],
    },
    sitemap: "https://semolink.store/sitemap.xml",
  };
}
