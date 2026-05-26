import { Noto_Serif_KR, Noto_Sans_KR } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/Providers";
import { VisitorTracker } from "@/components/VisitorTracker";
import { Metadata } from "next";
import Script from "next/script";

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

export const metadata: Metadata = {
  metadataBase: new URL("https://semolink.store"),
  title: {
    default: "세모링크 - 쿠팡 최저가 비교·추천템 모음",
    template: "%s | 세모링크",
  },
  description:
    "직접 써보고 골라낸 쿠팡 추천템과 최저가 비교. 솔직 후기, 카테고리별 베스트, 레시피 재료까지 한 번에 확인하세요.",
  openGraph: {
    siteName: "세모링크",
    locale: "ko_KR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
  },
  icons: {
    icon: [
      { url: "/logo.png", type: "image/png" },
      { url: "/icon.png", type: "image/png" },
    ],
    shortcut: "/logo.png",
    apple: "/logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <head>
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=GT-K52R4F3K"
          strategy="afterInteractive"
        />
        <Script id="google-tag" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'GT-K52R4F3K');
          `}
        </Script>
      </head>
      <body
        className={`${notoSerif.variable} ${notoSans.variable} font-sans antialiased`}
      >
        <Providers>
          <VisitorTracker />
          <div className="flex min-h-screen flex-col">
            <div className="flex-1">{children}</div>
          </div>
        </Providers>
      </body>
    </html>
  );
}
