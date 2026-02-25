import { Metadata } from "next";
import { withSiteUrl } from "@/lib/siteUrl";

export const metadata: Metadata = {
  title: "쿠팡 상품 리뷰",
  description: "라이프스타일, 디지털/가전, 주방, 패션/뷰티 등 다양한 카테고리의 상품 리뷰 모음. 솔직한 상품 후기를 확인하세요.",
  alternates: {
    canonical: withSiteUrl("/reviews"),
  },
  openGraph: {
    title: "쿠팡 상품 리뷰 | 세모링크",
    description: "다양한 카테고리의 상품 리뷰 모음. 솔직한 상품 후기를 확인하세요.",
    url: withSiteUrl("/reviews"),
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "쿠팡 상품 리뷰 | 세모링크",
    description: "다양한 카테고리의 상품 리뷰 모음.",
  },
};

export default function ReviewsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
