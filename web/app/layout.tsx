import { Noto_Serif_KR, Noto_Sans_KR } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/Providers";
import type { Metadata } from "next";
import { SITE_URL } from "@/lib/siteUrl";
import { getBrandingMetaAssets, getServerSiteBranding } from "@/lib/serverSiteBranding";

const notoSerif = Noto_Serif_KR({
  subsets: ["latin"],
  weight: ["400", "700", "900"],
  variable: "--font-serif",
});

const notoSans = Noto_Sans_KR({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-sans",
});

export async function generateMetadata(): Promise<Metadata> {
  const site = await getServerSiteBranding();
  const assets = getBrandingMetaAssets(site);
  const siteName = site.name || "세모링크";
  const defaultTitle = site.defaultMetaTitle || `${siteName} - 세상의 모든 링크`;
  const description = site.defaultMetaDescription || "세상의 모든 링크가 모이는 허브, 세모링크입니다.";

  return {
    metadataBase: new URL(SITE_URL),
    applicationName: siteName,
    title: {
      default: defaultTitle,
      template: `%s | ${siteName}`,
    },
    description,
    openGraph: {
      siteName,
      locale: "ko_KR",
      type: "website",
      url: SITE_URL,
      title: defaultTitle,
      description,
      ...(assets.ogDefaultImageUrl
        ? { images: [{ url: assets.ogDefaultImageUrl, alt: siteName }] }
        : {}),
    },
    twitter: {
      card: "summary_large_image",
      title: defaultTitle,
      description,
      ...(assets.ogDefaultImageUrl ? { images: [assets.ogDefaultImageUrl] } : {}),
    },
    icons: {
      icon: [
        { url: assets.faviconUrl || "/icon.png", type: "image/png" },
        { url: site.logoUrl || "/logo.png", type: "image/png" },
      ],
      shortcut: assets.faviconUrl || "/icon.png",
      apple: assets.appleTouchIconUrl || site.logoUrl || "/logo.png",
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body
        className={`${notoSerif.variable} ${notoSans.variable} font-sans antialiased`}
      >
        <Providers>
          <div className="flex min-h-screen flex-col">
            <div className="flex-1">{children}</div>
          </div>
        </Providers>
      </body>
    </html>
  );
}
